import SerialPort from 'SerialPort';
import { spawn } from 'child_process';
import * as path from 'path';

const fwDirPath: string = path.join(__dirname, '..', '..', 'fw');
const exePath: string = fwDirPath + '\\adownload.exe';
const baud = '115200';
const deviceAtPort = 'MI_03';
const deviceDownloadPort = 'VID_2ECC&PID_3017';
const atQdownload = 'at+qdownload=1\r\n';

interface portResponse {
	path: string;
	manufacturer: string;
	serialNumber: string;
	pnpId: string;
	locationId: string;
	vendorId: string;
	productId: string;
}

const getPorts = async (portId: string): Promise<string | undefined> => {
	let response: portResponse[];
	await SerialPort.list().then((ports: portResponse[]) => {
		response = ports.filter(port => port.pnpId.includes(portId));
	});
	if (response[0] === undefined) {
		return undefined;
	} else {
		return response[0]
			.path; /* takes the first AT port from the list of multiple BearPi AT ports.
        Logic should be change if one wants to use multiple ports or multiple devices to be flashed */
	}
};

async function setDownloadPort(): Promise<void> {
	const atPort = await getPorts(deviceAtPort);
	let port: SerialPort = new SerialPort(atPort, {
		baudRate: 115200,
	});
	port.on('open', () => {
		port.write(atQdownload);
		port.close();
	});
}

export default async function firmwareDownload(
	filePath: string
): Promise<void> {
	console.log('ker0');
	try {
		await setDownloadPort();
	} catch (error) {
		console.log(`Cannot write to the AT port. Please restart the module!`);
	}

	let downloadPort = await getPorts(deviceDownloadPort);

	while (downloadPort === undefined) {
		downloadPort = await getPorts(deviceDownloadPort);
		// set timer to 30sec and break the loop (if port doesn't appear)
	}

	const adownload = spawn(exePath, [
		'-p',
		downloadPort,
		'-a',
		'-q',
		'-r',
		'-s',
		baud,
		filePath,
	]);

	adownload.stdout.on('data', data => {
		console.log(`stdout: ${data}`);
	});

	adownload.on('close', code => {
		console.log(`child process exited with code ${code}`);
	});
}
