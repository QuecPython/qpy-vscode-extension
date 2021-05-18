import SerialPort from 'SerialPort';
import { spawn } from 'child_process';
import * as path from 'path';
import { fwConfig } from '../utils/constants';

// import { progressBar, updateProgressBar } from '../api/progressBar';

// const file = 'fileIO.py';
// const sourcePath =
// 'D:/02_Trainnings_External/07_JS/task_7_file_download_js_ts/examples/' + file;
const destinationPath = ':/usr/';

const fileDirPath: string = path.join(__dirname, '..', '..', 'fileScript');
const scriptPath: string = fileDirPath + '\\QuecPyComTools.py';

// console.log('ker1: ', sourcePath);

export default async function fileDownload(sourcePath: string) {
	// console.log('ker1: ', path.dirname(sourcePath));
	// console.log('ker2: ', path.basename(sourcePath));
	// console.log('ker3: ', path.extname(sourcePath));
	const destinationPath = ':/usr/' + path.basename(sourcePath);
	const fDownload = spawn('python', [
		scriptPath,
		'-d',
		'COM15',
		'-b',
		fwConfig.baud,
		'-f',
		'cp',
		sourcePath,
		destinationPath,
	]);

	fDownload.stdout.on('data', data => {
		console.log(`stdout: ${data}`);
	});

	fDownload.stderr.on('data', data => {
		console.log(`stderr: ${data}`);
	});

	fDownload.on('error', error => {
		console.log(`error: ${error.message}`);
	});

	fDownload.on('close', code => {
		console.log(`child process exited with code ${code}`);
	});
}
