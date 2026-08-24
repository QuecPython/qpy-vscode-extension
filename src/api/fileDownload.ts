import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { serialEmitter } from '../serial/serialBridge';
import { FileData } from '../types/types';
import { cmd, progLabel, scriptName, status } from '../utils/constants';
import { portStatus } from '../serial/serialTerminal';
import * as utils from '../utils/utils';
import { getActiveSerial, setTerminalFlag } from './terminal';
const fileDirPath: string = path.join(__dirname, '..', '..', 'scripts');
const scriptPath: string = fileDirPath + scriptName.fileDownloadScript;

export default async function fileDownload(
	sourcePath: string,
	serialPort: string,
	baudRate: number,
	fileData: FileData,
	downloadPath: string = '/usr',
	isLast: boolean = true,
) {
	const destinationPath = `:${downloadPath}/` + path.basename(sourcePath);

	serialEmitter.emit(status.startProg, progLabel.downloadFile);

	const fDownload = spawn(scriptPath, [
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
		console.log(`stdout: ${data}`);
		serialEmitter.emit(status.updateProg, data);
	});

	fDownload.stderr.on('data', data => {
		console.log(`stderr: ${data}`);
	});

	fDownload.on('error', error => {
		console.log(`error: ${error.message}`);
	});

	fDownload.on('close', code => {
		if (isLast) {
			serialEmitter.emit(`${cmd.downloadFile}`, {
					fileData,
					parentPath: downloadPath,
					code: code.toString(),
			});
			serialEmitter.emit(status.downFinish);
		}
	});
}

// command qpy-ide.downloadFile
vscode.commands.registerCommand(
	'qpy-ide.downloadFile',
	async (fileUri: vscode.Uri) => {
		try {
			if (!portStatus) {
				vscode.window.showErrorMessage('Device is not connected!');
				return;
			}

			let downloadPath: vscode.Uri;
			if (typeof fileUri === 'undefined') {
				downloadPath = vscode.window.activeTextEditor.document.uri;
			} else {
				downloadPath = fileUri;
			}

			if (utils.isDir(downloadPath.fsPath)) {
				vscode.window.showErrorMessage('Specified target is not a valid file.');
				return;
			} else {
				const st = getActiveSerial();

				const fileData = {
					filename: downloadPath.fsPath.split('\\').pop(),
					fileSizeInBytes: fs.statSync(downloadPath.fsPath).size,
				};

				st.serial.close();

				await fileDownload(
					downloadPath.fsPath,
					st.serial.path,
					st.serial.baudRate,
					fileData
				);
			}
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

// command qpy-ide.downloadFolder
vscode.commands.registerCommand(
	'qpy-ide.downloadFolder',
	async (folderUri: vscode.Uri) => {
		if (!portStatus) {
			vscode.window.showErrorMessage('Device is not connected!');
			return;
		}
		let downloadPath: vscode.Uri;

		downloadPath = folderUri;

		try {
			if (!utils.isDir(downloadPath.fsPath)) {
				vscode.window.showErrorMessage('Specified target is not a valid folder.');
				return;
			} 
			// ask user for remote directory path (must start with /usr/)
			const fullRemotePath = await vscode.window.showInputBox({
				placeHolder: "Enter full directory path... (e.g. /usr/test)",
			});
			if (!fullRemotePath) {
				vscode.window.showInformationMessage('Download cancelled');
				return;
			}

			if (!fullRemotePath.startsWith('/usr/')) {
				vscode.window.showErrorMessage('Invalid directory path.');
				return;
			}

			const st = getActiveSerial();

			// append local folder name to remote base path so remote target
			// becomes e.g. /usr/<selected-folder-name>
			const localFolderName = path.basename(downloadPath.fsPath);
			const remoteTarget = fullRemotePath.endsWith('/')
				? `${fullRemotePath}${localFolderName}`
				: `${fullRemotePath}/${localFolderName}`;

			// create remote directory similar to createDir
			setTerminalFlag(true, cmd.createDir);
			let newDirPath = remoteTarget;
			st.handleCmd(`import ql_fs\r\n`);
			st.handleCmd(`ql_fs.mkdirs('${remoteTarget}')\r\n`);
			await utils.sleep(400);
			st.serial.close(); // close connection cuz we'll use exe tool for file download

			const entries = fs.readdirSync(downloadPath.fsPath);
			const last = entries[entries.length - 1];
			for (const name of entries) {
				const isLast = name === last;

				const localPath = path.join(downloadPath.fsPath, name);
				const stat = fs.statSync(localPath);
				if (!stat.isFile()) {
					continue; // skip directories
				}
				const fileData = {
					filename: name,
					fileSizeInBytes: stat.size,
				};

				await fileDownload(
					localPath,
					st.serial.path,
					st.serial.baudRate,
					fileData,
					remoteTarget,
					isLast
				);
				// small pause between files
				await utils.sleep(1000);
			}
		} catch (error){
			vscode.window.showErrorMessage('Something went wrong. ' + error.toString());
			setTerminalFlag();
		}
	}
);
