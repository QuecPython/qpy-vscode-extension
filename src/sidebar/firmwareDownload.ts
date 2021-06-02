import SerialPort from 'SerialPort';
import { spawn } from 'child_process';
import * as path from 'path';
import { fwConfig } from '../utils/constants';
import { serialEmitter } from '../serial/serialBridge';
import * as vscode from 'vscode';
import { status } from '../utils/constants';

const fwDirPath: string = path.join(__dirname, '..', '..', 'fw');
const exePath: string = fwDirPath + '\\adownload.exe';
let progressBarFlag: boolean = false;
interface PortResponse {
	path: string;
	manufacturer: string;
	serialNumber: string;
	pnpId: string;
	locationId: string;
	vendorId: string;
	productId: string;
}

function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const getPorts = async (portId: string): Promise<string | undefined> => {
	let response: PortResponse[];
	await SerialPort.list().then((ports: PortResponse[]) => {
		response = ports.filter(port => port.pnpId.includes(portId));
	});
	if (response[0] === undefined) {
		return undefined;
	} else {
		return response[0].path;
		/* takes the first AT port from the list of multiple BearPi AT ports.
        Logic should be change if one wants to use multiple ports or multiple devices to be flashed */
	}
};

async function setDownloadPort(): Promise<void> {
	const atPort = await getPorts(fwConfig.deviceAtPort);
	let port: SerialPort = new SerialPort(atPort, {
		baudRate: 115200,
	});
	port.on('open', async () => {
		await port.write(fwConfig.atQdownload);
		port.close();
	});
}

export default async function firmwareDownload(
	filePath: string
): Promise<void> {
	try {
		await setDownloadPort();
	} catch (error) {
		vscode.window.showErrorMessage('Failed to remove the specified file.');
	}

	let downloadPortEC100Y = await getPorts(fwConfig.downloadPortEC100Y);
	let downloadPortEC600S = await getPorts(fwConfig.downloadPortEC600S);

	let i = 0;
	let downloadPort: string;

	while (
		downloadPortEC100Y === undefined &&
		downloadPortEC600S === undefined &&
		i < 10
	) {
		downloadPortEC100Y = await getPorts(fwConfig.downloadPortEC100Y);
		downloadPortEC600S = await getPorts(fwConfig.downloadPortEC600S);
		await delay(3000);
		i = i + 1;
		// set timer to 30sec and break the loop (if port doesn't appear)
	}

	if (downloadPortEC100Y != undefined) {
		downloadPort = downloadPortEC100Y;
	} else {
		downloadPort = downloadPortEC600S;
	}

	let percentFlag = false;

	if (progressBarFlag === false) {
		serialEmitter.emit(status.startProg);
		progressBarFlag = true;
	}

	const adownload = spawn(exePath, [
		'-p',
		downloadPort,
		'-a',
		'-q',
		'-r',
		'-s',
		fwConfig.baud,
		filePath,
	]);

	if (downloadPort === undefined) {
		vscode.window.showErrorMessage(
			'Something went wrong. Please reset the Module.'
		);
	}

	adownload.stdout.on('data', data => {
		if (data.includes('"progress" :')) {
			const result: string = data.toString();
			const progressArray: string[] = result.match(/"progress" : \d{1,3}/g);
			let percentage: string =
				progressArray[progressArray.length - 1].slice(13);
			if (percentage === '0' && percentFlag === true) {
				percentage = '100';
			}
			serialEmitter.emit(status.updateProg, percentage);
			percentFlag = true;
		}
	});

	adownload.on('close', code => {
		serialEmitter.emit(status.downFinish);
		progressBarFlag = false;
		console.log(`child process exited with code ${code}`);
	});

	adownload.stderr.on('error', error => {
		serialEmitter.emit(status.downFinish);
		progressBarFlag = false;
		console.log(`stderr: ${error.message}`);
	});
}
