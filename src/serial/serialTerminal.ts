import SerialPort from 'SerialPort';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { cmd } from '../utils/constants';
import { CommandLineInterface } from './commandLine';
import { serialEmitter } from './serialBridge';

const pyFsScriptPath: string = path.join(__dirname, '..', '..', 'config');
const pyFsScript: string = pyFsScriptPath + '\\q_init_fs.py';

export default class SerialTerminal extends CommandLineInterface {
	public serial: SerialPort;

	// used to automatically attempt to reconnect when device is disconnected
	private reconnectInterval: NodeJS.Timeout | undefined;

	constructor(
		comPort: string,
		baudRate: number,
		translateHex = true,
		lineEnd?: string
	) {
		const serial: SerialPort = new SerialPort(comPort, {
			autoOpen: false,
			baudRate: baudRate,
		});

		super(serial, translateHex, lineEnd);
		this.serial = serial;
	}

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
		super.handleDataAsText(
			`\rQuecPython Serial Terminal
            \rPort: ${this.serial.path}
            \rBaud rate: ${this.serial.baudRate} baud\r\n\n`
		);

		if (!this.serial.isOpen) {
			this.serial.open(this.writeError);
		}

		this.serial.on('close', err => {
			serialEmitter.emit('statusDisc');
			serialEmitter.emit(`${cmd.ilistdir}`, '');
			if (!this.endsWithNewLine) {
				this.handleDataAsText('\r\n');
			}

			if (err?.disconnected) {
				// device was disconnected, attempt to reconnect
				this.handleDataAsText('Device disconnected.');
				this.reconnectInterval = setInterval(async () => {
					// attempt to reopen
					const availablePorts = await SerialPort.list();
					for (const port of availablePorts) {
						if (port.path === this.serial.path) {
							if (!this.endsWithNewLine) {
								this.handleDataAsText('\r\n');
							}
							this.handleDataAsText(
								`Device reconnected at port ${this.serial.path}.\r\n`
							);
							this.serial.open();
							break;
						}
					}
				}, 1000);
			}
			this.handleDataAsText('\r\n');
		});

		this.serial.on('open', () => {
			serialEmitter.emit('statusConn');
			if (this.reconnectInterval) {
				clearInterval(this.reconnectInterval);
			}
			this.readStatFiles();
		});

		super.open(initialDimensions);
	}

	public readStatFiles() {
		let data = '';
		const readStream = fs.createReadStream(pyFsScript, 'utf8');

		readStream
			.on('data', chunk => {
				data += chunk;
			})
			.on('end', () => {
				const splitData = data.split(/\r\n/);

				this.cmdFlag = true;
				this.cmdFlagLabel = cmd.ilistdir;

				this.handleInput(
					`${cmd.ilistdir}f = open('/usr/q_init_fs.py', 'wb', encoding='utf-8')\r\n`
				);
				this.handleInput(`${cmd.ilistdir}w = f.write\r\n`);
				splitData.forEach((dataLine: string) => {
					this.handleInput(`${cmd.ilistdir}w(b"${dataLine}\\r\\n")\r\n`);
				});
				this.handleInput(`${cmd.ilistdir}f.close()\r\n`);

				this.handleInput(`${cmd.ilistdir}import example\r\n`);
				this.handleInput(`${cmd.ilistdir}example.exec('usr/q_init_fs.py')\r\n`);

				this.handleInput(`${cmd.ilistdir}uos.remove('/usr/q_init_fs.py')\r\n`);
			});
	}

	close(): void {
		if (this.serial.isOpen) {
			this.serial.close(err => {
				if (err) {
					throw new Error(
						`Could not properly close serial terminal: ${err.message}`
					);
				}
			});
		}

		if (this.reconnectInterval) {
			clearInterval(this.reconnectInterval);
		}

		super.close();
	}
}
