import SerialPort from 'SerialPort';
import { spawn } from 'child_process';
import * as path from 'path';
import { fwConfig, portNames } from '../utils/constants';
import { serialEmitter } from '../serial/serialBridge';
import * as vscode from 'vscode';
import { status } from '../utils/constants';
import { sleep } from '../utils/utils';

const fwDirPath: string = path.join(__dirname, '..', '..', 'fw');
let exePath: string;
let progressBarFlag: boolean = false;
let deviceSelect: boolean = false;
interface PortResponse {
	path: string;
	manufacturer: string;
	serialNumber: string;
	pnpId: string;
	locationId: string;
	vendorId: string;
	productId: string;
}

const getModule = async (productId: string): Promise<string | undefined> => {
	let response: PortResponse[];
	let atResponse: string;
	await SerialPort.list().then((ports: PortResponse[]) => {
		response = ports.filter(port => port.productId.includes(productId));
		if (response[0] === undefined) {
			return undefined;
		} else {
			response.forEach(res => {
				if (res.pnpId.includes(portNames.atEc600u)) {
					atResponse = portNames.atEc600u;
				} else {
					atResponse = portNames.atDevice;
				}
			});
		}
	});
	return atResponse;
};

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
	let moduleAtPort = await getModule(portNames.productEc600u);
	if (moduleAtPort === undefined) {
		moduleAtPort = await getModule(portNames.productDevice);
		deviceSelect = false;
	} else {
		deviceSelect = true;
	}
	const atPort = await getPorts(moduleAtPort);
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

	let i = 0;
	let downloadPort: string = undefined;
	let percentFlag: boolean = false;

	while (downloadPort === undefined && i < 10) {
		for (const port in fwConfig.downloadPorts) {
			downloadPort = await getPorts(fwConfig.downloadPorts[port]);
			if (downloadPort != undefined) {
				if (progressBarFlag === false) {
					serialEmitter.emit(status.startProg);
					progressBarFlag = true;
				}
				break;
			}
		}
		await sleep(3000);
	}

	let processEc600u = ['-pac', filePath, '-port', downloadPort];
	let processDevice = [
		'-p',
		downloadPort,
		'-a',
		'-q',
		'-r',
		'-s',
		fwConfig.baud,
		filePath,
	];

	let process: string[];

	if (deviceSelect) {
		process = processEc600u;
		exePath = fwDirPath + '\\CmdDloader.exe';
	} else {
		process = processDevice;
		exePath = fwDirPath + '\\adownload.exe';
	}

	console.log('exePath:', exePath);
	console.log('process:', process);
	const adownload = spawn(exePath, process);

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
		progressBarFlag = false;
		console.log(`child process exited with code ${code}`);
		serialEmitter.emit(status.downFinish);
	});

	adownload.stderr.on('error', error => {
		progressBarFlag = false;
		console.log(`stderr: ${error.message}`);
		serialEmitter.emit(status.downFinish);
	});
}
