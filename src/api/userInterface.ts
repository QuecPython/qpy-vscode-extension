import * as vscode from 'vscode';
import { ModuleFileSystemProvider } from '../deviceTree/moduleFileSystem';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { scriptName, fwConfig } from '../utils/constants';
import { spawn } from 'child_process';
import { TextDecoder } from 'util';
// 日志文件路径
const logFilePath = path.join(__dirname, '..', '..', 'log');
const logFile = logFilePath + scriptName.logFile;

// 执行脚本路径
const batScriptPath: string = path.join(__dirname, '..', '..', 'scripts');
const batScript: string = batScriptPath + scriptName.activateBat;
const portBatScript: string = batScriptPath + scriptName.portListBat;


export async function activateEnv() {
	// 下载固件烧录工具
	let result = await downloadExeFile("https://python.quectel.com/qpytools/QuecPythonDownload.exe");

}
async function downloadExeFile(url: string) {
	const filePath = `${batScriptPath}/${fwConfig.download}`;
	if (fs.existsSync(filePath)) {
		log("Env passed");
	}else{
		try {
			log("Env not pass");
			const statusBar = vscode.window.setStatusBarMessage('Hello, The env is being prepared...'); 
			return new Promise((resolve, reject) => {
				https.get(url, response => {
					const contentLength = parseInt(response.headers['content-length']);
					log(contentLength);
					const data = response.pipe(fs.createWriteStream(filePath));
					let downloadLength = 0;
					log("download continue");
					response.on('data', (chunk) => {
						downloadLength += chunk.length;
						const percent = Math.round((downloadLength / contentLength) * 100);
						log(percent);
					});
					data.on('finish', () => {
						resolve(true);
						statusBar.dispose();
					});
			
					data.on('error', error => {
						console.error('Error downloading file:', error);
						reject(false);
						statusBar.dispose();
					});
				})
				.on("error", error => {
				console.error('Error:', error);
				reject(false);
				});
			});
		} catch (error) {
			if (error.code === 'ENOTFOUND') {
			console.error('No internet connection.');
			} else {
			console.error('Error downloading file:', error);
			}
		};
	};
};


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
		connStatus.text = `$(plug) Connect`;
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
	const childProcess = execFile(
		batScript, 
		[path.join(__filename, '..', '..', '..', 'snippets', 'QuecPyhton.json')],
		{ shell: true }, // run in shell, to avoid spawn EINVAL error
		(error, stdout, stderr) => {
			if (error) {
				log('error: ' + error);
			}

			if (stderr) {
				log('error: ' + stderr);
			}

		}
	);
};

export async function executeBatScript(): Promise<any> {
	const childProcess = spawn(portBatScript, [], {
	  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	});
	let stdout = '';
	childProcess.stdout.on('data', (data) => {
	  	stdout += new TextDecoder('gbk').decode(data);  // fix the issue with Chinese serial port
	});
  
	return new Promise((resolve, reject) => {
	  childProcess.on('close', (code) => {
		if (code === 0) {
			const portString = stdout;
			const portList  = portString.split(/\r\n/);
			const portPaths = [];
			portList.forEach(element => {
				if (element.includes('COM')) {
					portPaths.push(`${element.split("=")[1]} (${element.split("=")[0]})`);
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
};

// 是否輸出到日志文件
let outputLogFile: boolean = false;
// 创建一个用于日志输出的通道
let outputChannel: vscode.OutputChannel;

outputChannel = vscode.window.createOutputChannel('QuecPython Extension Log');

const wsConfig = vscode.workspace.getConfiguration();
outputLogFile = wsConfig.get('QuecPython.outputChannelToFile') ?? false;

// 在其他地方记录日志
export function log(...args: any) {
	let message: string = '';
	args.forEach((arg)=>{
		message += arg.toString();
	});
	if (outputLogFile) {
		fs.appendFileSync(logFile, `${new Date().toLocaleString()} - ${message}\n`);
	}else{
   		outputChannel.appendLine(`${new Date().toLocaleString()} - ${message}`);
	}
}

export function openLog() {
	if (outputLogFile) {
		log(`${new Date().toLocaleString()} - Extension activated`);
	} else {
		fs.truncateSync(logFile, 0);  // 当在设置中调整日志开关为false时，启动插件会清空日志文件
		if (outputChannel) {
			outputChannel.show(); 
			log(`${new Date().toLocaleString()} - Extension activated`);
		}
	}
}
export function closeLog() {
    if (outputChannel) {
        outputChannel.dispose(); // 当插件被禁用时，清理资源
    }
}

// export function activate(context: vscode.ExtensionContext) {
//     outputChannel = vscode.window.createOutputChannel('My Extension Log');

//     // 示例：写入一条初始化消息到日志
//     outputChannel.appendLine(`Extension activated at ${new Date().toLocaleString()}`);

//     // 注册命令或其他事件处理程序，在需要的地方写入日志
//     context.subscriptions.push(vscode.commands.registerCommand('myExtension.logSomething', () => {
//         outputChannel.appendLine('Some event occurred.');
//     }));

//     // 显示日志面板
//     outputChannel.show();
// }

// export function deactivate() {
//     if (outputChannel) {
//         outputChannel.dispose(); // 当插件被禁用时，清理资源
//     }
// }

