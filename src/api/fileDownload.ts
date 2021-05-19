import { spawn } from 'child_process';
import { spawnSync } from 'node:child_process';
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

	fDownload.stdout.on('data', percentage => {
		console.log(`${percentage}`);
	});

	fDownload.stderr.on('data', data => {
		console.log(`stderr: ${data}`);
	});

	fDownload.on('error', error => {
		console.log(`error: ${error.message}`);
	});

	fDownload.on('close', code => {
		console.log(`child process exited with code ${code}`);
		serialEmitter.emit(`${cmd.downloadFile}`, {
			fileData,
			parentPath: downloadPath,
			code: code.toString(),
		});
	});
}
