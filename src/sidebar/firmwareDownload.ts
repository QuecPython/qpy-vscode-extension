import SerialPort from 'SerialPort';
import { spawn } from 'child_process';

const exePath =
	'D:\\01_Quectel\\03_Tasks\\Task_8_VSC_plugin\\F3\\qpy-vscode-extension\\src\\sidebar\\adownload.exe';
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
	});
	// port.write(atQdownload);
}

async function delay(): Promise<void> {
	return new Promise(resolve => {
		setTimeout(() => resolve(), 10000);
	});
}

export default async function firmwareDownload(
	filePath: string
): Promise<void> {
	console.log('ker0');
	await setDownloadPort();
	console.log('ker1');
	await delay();

	let downloadPort = await getPorts(deviceDownloadPort);
	console.log('ker2', typeof downloadPort);
	while (typeof downloadPort === undefined) {
		console.log('ker3');
		downloadPort = await getPorts(deviceDownloadPort);
		console.log('ker4');
		// set timer to 30sec and break the loop (if port doesn't appear)
	}
	console.log('ker5', downloadPort);
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
	console.log('ker6', adownload);
	adownload.stdout.on('data', data => {
		console.log('7');
		console.log(`stdout: ${data}`);
	});
	console.log('ker8');
	adownload.on('close', code => {
		console.log('ker9');
		console.log(`child process exited with code ${code}`);
	});
}
console.log('ker10');
