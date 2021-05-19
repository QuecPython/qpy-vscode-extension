import { spawn } from 'child_process';
import * as path from 'path';
import { serialEmitter } from '../serial/serialBridge';
import { FileData } from '../types/types';
import { cmd } from '../utils/constants';

const fileDirPath: string = path.join(__dirname, '..', '..', 'scripts');
const scriptPath: string = fileDirPath + '\\QuecPyComTools.py';

export default async function fileDownload(
	sourcePath: string,
	serialPort: string,
	baudRate: number,
	fileData: FileData,
	downloadPath: string = '/usr'
) {
	const destinationPath = `:${downloadPath}/` + path.basename(sourcePath);

	serialEmitter.emit('startProgress');

	const fDownload = spawn('python', [
		scriptPath,
		'-d',
		serialPort,
		'-b',
		baudRate.toString(),
		'-f',
		'cp',
		sourcePath,
		destinationPath,
	]);

	fDownload.stdout.on('data', data => {
		serialEmitter.emit('updatePercentage', data);
	});

	fDownload.stderr.on('data', data => {
		console.log(`stderr: ${data}`);
	});

	fDownload.on('error', error => {
		console.log(`error: ${error.message}`);
	});

	fDownload.on('close', code => {
		serialEmitter.emit(`${cmd.downloadFile}`, {
			fileData,
			parentPath: downloadPath,
			code: code.toString(),
		});
		serialEmitter.emit('downloadFinished');
	});
}
