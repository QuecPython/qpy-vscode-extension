import * as vscode from 'vscode';
import { ModuleFileSystemProvider } from '../deviceTree/moduleFileSystem';
import * as path from 'path';
import { scriptName } from '../utils/constants';
import { spawn } from 'child_process';
import { TextDecoder } from 'util';
const batScriptPath: string = path.join(__dirname, '..', '..', 'scripts');
const batScript: string = batScriptPath + scriptName.activateBat;
const portBatScript: string = batScriptPath + scriptName.portListBat;



export const setButtonDownload = (downloadScript: vscode.StatusBarItem): void => {
	downloadScript.text = `$(arrow-down) Download File`;
	downloadScript.tooltip = `Download active file to module`;
};

export const setButtonStatus = (connStatus: vscode.StatusBarItem, status: boolean, comPort: string): void => {
	if (status) {
		connStatus.text = `$(plug) ${comPort}`;
		connStatus.tooltip = 'COM Port is connected';
		connStatus.command = 'qpy-ide.closeConnection';
	} else {
		connStatus.text = `$(plug) Connected`;
		connStatus.tooltip = 'COM Port not connected';
		connStatus.command = 'qpy-ide.openConnection';
	}
};

export const initStatusButtons = (): void => {
	setButtonDownload(downloadScript);
	downloadScript.show();
	downloadScript.command = 'qpy-ide.downloadFile';

	setButtonStatus(connStatus, false, " ");
	connStatus.show();
	connStatus.command = 'qpy-ide.openConnection';
};

export const connStatus = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
);

export const downloadScript = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
);

export const moduleFsTreeProvider = new ModuleFileSystemProvider();

export const initPythonPath = (): void => {
	const { execFile } = require('node:child_process');
	const childProcess = execFile(batScript, [path.join(__filename, '..', '..', '..', 'snippets', 'quecpython_stubs')], (error, stdout, stderr) => {
		if (error) {
			throw error;
		}
		// console.log(`stdout: ${stdout}`);
	});
};

export async function executeBatScript(): Promise<any> {
	const childProcess = spawn(portBatScript, [], {
	  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	});
	let stdout = '';
	childProcess.stdout.on('data', (data) => {
	  	stdout += new TextDecoder('gbk').decode(data);  // 解决驱动显示中文串口名称乱码问题
	});
  
	return new Promise((resolve, reject) => {
	  childProcess.on('close', (code) => {
		if (code === 0) {
			const portString = stdout;
			const portList  = portString.split(/\r\n/);
			const portPaths = [];
			portList.forEach(element => {
				if (element.includes('COM')) {
					portPaths.push(`${element.split("=")[1]} (${element.split("=")[0].slice(1)})`);
				}
			});
		  resolve(portPaths);
		} else {
		  reject(new Error(`Child process exited with error code ${code}`));
		}
	  });
  
	  childProcess.on('error', (error) => {
		reject(error);
	  });
	});
  }
  
