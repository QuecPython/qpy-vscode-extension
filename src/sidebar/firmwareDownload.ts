import SerialPort from 'SerialPort';
import { spawn } from 'child_process';
import * as path from 'path';
import { fwConfig } from '../utils/constants';
import { progressBar, updateProgressBar } from '../api/progressBar';

const fwDirPath: string = path.join(__dirname, '..', '..', 'fw');
const exePath: string = fwDirPath + '\\adownload.exe';
interface PortResponse {
	path: string;
	manufacturer: string;
	serialNumber: string;
	pnpId: string;
	locationId: string;
	vendorId: string;
	productId: string;
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
		console.log(`Cannot write to the AT port. Please restart the module!`);
	}

	let downloadPort = await getPorts(fwConfig.deviceDownloadPort);

	while (downloadPort === undefined) {
		downloadPort = await getPorts(fwConfig.deviceDownloadPort);
		// set timer to 30sec and break the loop (if port doesn't appear)
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

	adownload.stdout.on('data', data => {
		if (data.includes('"progress" :')) {
			const result: string = data.toString();
			const progressArray: string[] = result.match(/"progress" : \d{1,3}/g);
			const percentage: string = progressArray[progressArray.length - 1].slice(
				13
			);
			console.log('PERCENTAGE: ', percentage);
		}
	});

	adownload.on('close', code => {
		console.log(`child process exited with code ${code}`);
	});

	adownload.stderr.on('error', error => {
		console.log(`stderr: ${error.message}`);
	});
}
