import { spawn } from 'child_process';
import * as path from 'path';
import { fwConfig, progLabel } from '../utils/constants';
import { serialEmitter } from '../serial/serialBridge';
import * as vscode from 'vscode';
import { status } from '../utils/constants';
import { executeBatScript } from '../api/userInterface';

const fwDirPath: string = path.join(__dirname, '..', '..', 'fw');

export default async function firmwareDownload(
	filePath: string
): Promise<void> {
	let downloadPort: string = undefined;
	const portPaths = await executeBatScript();
	if (portPaths.length < 1) {
		vscode.window.showErrorMessage('No serial devices found');
		return;
	}
	portPaths.forEach(element => {
		if (element.includes('Quectel USB AT Port')) {
			downloadPort = element.split(' (')[1].slice(0, -1);
		}
		if (element.includes('Quectel USB DM Port')) {
			downloadPort = element.split(' (')[1].slice(0, -1);
		}
	});
	
	
	if (downloadPort === undefined) {
		downloadPort = await vscode.window.showQuickPick(portPaths, {
			placeHolder: 'Select download port',
		});
	}
	console.log(downloadPort);

	const download = spawn(fwDirPath + fwConfig.download, ["-d", downloadPort, "-b", "115200", "-f", filePath], {cwd: fwDirPath});

	if (downloadPort === undefined) {
		vscode.window.showErrorMessage(
			'Serial port abnormality. Please reset the Module.'
		);
	} else {
		serialEmitter.emit(status.startProg, progLabel.flashFw);
	}

	download.stdout.on('data', data => {
		console.info(data.toString());
		if (data.includes('Progress :')) {
			const result: string = data.toString();
			serialEmitter.emit(result);
		}
	});

	download.on('close', code => {
		console.log(`child process exited with code ${code}`);
		serialEmitter.emit(status.downFinish);
	});

	download.stderr.on('error', error => {
		console.log(`stderr: ${error.message}`);
		serialEmitter.emit(status.downFinish);
	});
}
