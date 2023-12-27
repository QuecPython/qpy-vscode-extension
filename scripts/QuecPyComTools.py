import sys
import time
import os
from pubsub import pub
import time


try:
	stdout = sys.stdout.buffer
except AttributeError:
	# Python2 doesn't have buffer attr
	stdout = sys.stdout


def stdout_write_bytes(b):
	b = b.replace(b"\x04", b"")
	stdout.write(b)
	stdout.flush()

class QuecPyComToolsError(Exception):
	pass
	
	
class QuecPyComTools:
	def __init__(self, device, baudrate=115200, wait=0):
		import serial
		delayed = False
		for attempt in range(wait + 1):
			try:
				self.serial = serial.Serial(device, baudrate=baudrate, interCharTimeout=1)
				break
			except (OSError, IOError):  # Py2 and Py3 have different errors
				if wait == 0:
					continue
				if attempt == 0:
					sys.stdout.write("Waiting {} seconds for QuecPyComTools ".format(wait))
					delayed = True
			time.sleep(1)
			sys.stdout.write(".")
			sys.stdout.flush()
		else:
			if delayed:
				print("")
			raise QuecPyComToolsError("failed to access " + device)
		if delayed:
			print("")
			
	def close(self):
		self.serial.close()

	def read_until(self, min_num_bytes, ending, timeout=10, data_consumer=None):
		# if data_consumer is used then data is not accumulated and the ending must be 1 byte long
		assert data_consumer is None or len(ending) == 1

		data = self.serial.read(min_num_bytes)
		if data_consumer:
			data_consumer(data)
		timeout_count = 0
		while True:
			if data.endswith(ending):
				break
			elif self.serial.inWaiting() > 0:
				new_data = self.serial.read(1)
				if data_consumer:
					data_consumer(new_data)
					data = new_data
				else:
					data = data + new_data
				timeout_count = 0
			else:
				timeout_count += 1
				if timeout is not None and timeout_count >= 100 * timeout:
					break
				time.sleep(0.01)
		return data
		
	def enter_raw_repl(self):
		self.serial.write(b"\r\x03\x03")  # ctrl-C twice: interrupt any running program

		# flush input (without relying on serial.flushInput())
		n = self.serial.inWaiting()
		while n > 0:
			self.serial.read(n)
			n = self.serial.inWaiting()

		self.serial.write(b"\r\x01")  # ctrl-A: enter raw REPL
		data = self.read_until(1, b"raw REPL; CTRL-B to exit\r\n>")
		if not data.endswith(b"raw REPL; CTRL-B to exit\r\n>"):
			print(data)
			raise QuecPyComToolsError("could not enter raw repl")

		self.serial.write(b"\x04")  # ctrl-D: soft reset
		data = self.read_until(1, b"soft reboot\r\n")
		if not data.endswith(b"soft reboot\r\n"):
			print(data)
			raise QuecPyComToolsError("could not enter raw repl")
		# By splitting this into 2 reads, it allows boot.py to print stuff,
		# which will show up after the soft reboot and before the raw REPL.
		data = self.read_until(1, b"raw REPL; CTRL-B to exit\r\n")
		if not data.endswith(b"raw REPL; CTRL-B to exit\r\n"):
			print(data)
			raise QuecPyComToolsError("could not enter raw repl")
	def exit_raw_repl(self):
		self.serial.write(b"\r\x02")  # ctrl-B: enter friendly REPL
		
	def follow(self, timeout, data_consumer=None):
		# wait for normal output
		data = self.read_until(1, b"\x04", timeout=timeout, data_consumer=data_consumer)
		if not data.endswith(b"\x04"):
			raise QuecPyComToolsError("timeout waiting for first EOF reception")
		data = data[:-1]

		# wait for error output
		data_err = self.read_until(1, b"\x04", timeout=timeout)
		if not data_err.endswith(b"\x04"):
			raise QuecPyComToolsError("timeout waiting for second EOF reception")
		data_err = data_err[:-1]

		# return normal and error output
		return data, data_err

	def exec_raw_no_follow(self, command):
		if isinstance(command, bytes):
			command_bytes = command
		else:
			command_bytes = bytes(command, encoding="utf8")

		# check we have a prompt
		data = self.read_until(1, b">")
		if not data.endswith(b">"):
			raise QuecPyComToolsError("could not enter raw repl")

		# write command
		for i in range(0, len(command_bytes), 256):
			self.serial.write(command_bytes[i : min(i + 256, len(command_bytes))])
			time.sleep(0.1)
		self.serial.write(b"\x04")

		# check if we could exec command
		data = self.serial.read(2)
		if data != b"OK":
			raise QuecPyComToolsError("could not exec command (response: %r)" % data)

	def exec_raw(self, command, timeout=10, data_consumer=None):
		self.exec_raw_no_follow(command)
		return self.follow(timeout, data_consumer)

	def eval(self, expression):
		ret = self.exec_("print({})".format(expression))
		ret = ret.strip()
		return ret

	def exec_(self, command, data_consumer=None):
		ret, ret_err = self.exec_raw(command, data_consumer=data_consumer)
		if ret_err:
			raise QuecPyComToolsError("exception", ret, ret_err)
		return ret
	
	def fs_put(self, src, dest, chunk_size=256):
		self.exec_("f=open('%s','wb')\nw=f.write" % dest)
		fileSize = os.stat(src).st_size
		progress = 0
		pub.subscribe(self.updateFileProgress, "updateFileProgress")
		with open(src, "rb") as f:
			while True:
				data = f.read(chunk_size)
				if not data:
					break
				else:
					progress += len(data)
					percentage = progress/fileSize * 100
				if percentage<=100:
					pub.sendMessage('updateFileProgress', arg1=percentage)
				else:
					pub.sendMessage('updateFileProgress', arg1=100)
				if sys.version_info < (3,):
					self.exec_("w(b" + repr(data) + ")")
				else:
					self.exec_("w(" + repr(data) + ")")
		self.exec_("f.close()")

	def updateFileProgress(self, arg1):
		print("{:.0f}".format(arg1), flush=True)

setattr(QuecPyComTools, "exec", QuecPyComTools.exec_)

def filesystem_command(qpy, args):
	def fname_remote(src):
		if src.startswith(":"):
			src = src[1:]
		return src

	def fname_cp_dest(src, dest):
		src = src.rsplit("/", 1)[-1]
		if dest is None or dest == "":
			dest = src
		elif dest == ".":
			dest = "./" + src
		elif dest.endswith("/"):
			dest += src
		return dest

	cmd = args[0]
	args = args[1:]
	try:
		if cmd == "cp":
			srcs = args[:-1]
			dest = args[-1]
			if srcs[0].startswith("./") or dest.startswith(":"):
				op = qpy.fs_put
				dest = fname_remote(dest)
			for src in srcs:
				src = fname_remote(src)
				dest2 = fname_cp_dest(src, dest)
				op(src, dest2)
	
	except QuecPyComToolsError as er:
		print(str(er.args[2], "ascii"))
		qpy.exit_raw_repl()
		qpy.close()
		sys.exit(1)

def main():
	import argparse
	cmd_parser = argparse.ArgumentParser(description="Run scripts on the EC100Y.")
	cmd_parser.add_argument(
		"-d",
		"--device",
		default=os.environ.get("EC100Y_DEVICE", "COM24"),
		help="the serial device of the EC100Y",
	)
	cmd_parser.add_argument(
		"-b",
		"--baudrate",
		default=os.environ.get("EC100Y_BAUDRATE", "115200"),
		help="the baud rate of the serial device",
	)
	cmd_parser.add_argument("-c", "--command", help="program passed in as string")
	cmd_parser.add_argument(
		"-w",
		"--wait",
		default=0,
		type=int,
		help="seconds to wait for USB connected board to become available",
	)
	group = cmd_parser.add_mutually_exclusive_group()
	group.add_argument(
		"--follow",
		action="store_true",
		help="follow the output after running the scripts [default if no scripts given]",
	)
	group.add_argument(
		"--no-follow",
		action="store_true",
		help="Do not follow the output after running the scripts.",
	)
	cmd_parser.add_argument(
		"-f", "--filesystem", action="store_true", help="perform a filesystem action"
	)
	cmd_parser.add_argument("files", nargs="*", help="input files")
	args = cmd_parser.parse_args()
	# open the connection to the qpyoard
	try:
		qpy = QuecPyComTools(args.device, args.baudrate, args.wait)
	except QuecPyComToolsError as er:
		print(er)
		sys.exit(1)

	# run any command or file(s)
	if args.command is not None or args.filesystem or len(args.files):
		# we must enter raw-REPL mode to execute commands
		# this will do a soft-reset of the board
		try:
			qpy.enter_raw_repl()
		except QuecPyComToolsError as er:
			print(er)
			qpy.close()
			sys.exit(1)

		def execbuffer(buf):
			try:
				if args.no_follow:
					qpy.exec_raw_no_follow(buf)
					ret_err = None
				else:
					ret, ret_err = qpy.exec_raw(
						buf, timeout=None, data_consumer=stdout_write_bytes
					)
			except QuecPyComToolsError as er:
				print(er)
				qpy.close()
				sys.exit(1)
			except KeyboardInterrupt:
				sys.exit(1)
			if ret_err:
				qpy.exit_raw_repl()
				qpy.close()
				stdout_write_bytes(ret_err)
				sys.exit(1)

		# do filesystem commands, if given
		if args.filesystem:
			filesystem_command(qpy, args.files)
			del args.files[:]

		# run the command, if given
		if args.command is not None:
			execbuffer(args.command.encode("utf-8"))

		# run any files
		for filename in args.files:
			with open(filename, "rb") as f:
				pyfile = f.read()
				execbuffer(pyfile)

		# exiting raw-REPL just drops to friendly-REPL mode
		qpy.exit_raw_repl()

	# if asked explicitly, or no files given, then follow the output
	if args.follow or (args.command is None and not args.filesystem and len(args.files) == 0):
		try:
			ret, ret_err = qpy.follow(timeout=None, data_consumer=stdout_write_bytes)
		except QuecPyComToolsError as er:
			print(er)
			sys.exit(1)
		except KeyboardInterrupt:
			sys.exit(1)
		if ret_err:
			qpy.close()
			stdout_write_bytes(ret_err)
			sys.exit(1)

	# close the connection to the EC100Y
	qpy.close()


if __name__ == "__main__":
	main()