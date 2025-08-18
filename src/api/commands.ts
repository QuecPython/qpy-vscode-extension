import * as vscode from 'vscode';
import * as fs from 'fs';
import * as utils from '../utils/utils';
import { getActiveSerial, setTerminalFlag } from './terminal';
import { moduleFsTreeProvider, executeBatScript, log } from './userInterface';
import {
	cmd,
	supportedBaudRates,
	chiregex,
} from '../utils/constants';
import { fwProvider } from '../extension';
import SerialTerminal from '../serial/serialTerminal';
import { terminalRegistry } from '../extension';
import { ModuleDocument } from '../deviceTree/moduleFileSystem';
import filedownload from './fileDownload';
import { portStatus } from '../serial/serialTerminal';
import { sortTreeNodes } from './treeView';
import FirmwareViewProvider from '../sidebar/firmwareSidebar';
import { serialEmitter } from '../serial/serialBridge';
import { HtmlPanel } from '../packagePanel/htmlPanel';


export let chosenModule: string | undefined;
export let newDirPath: string | undefined;

export const refreshModuleFs = vscode.commands.registerCommand(
	'qpy-ide.refreshModuleFS',
	async () => {
		try {
			await _refreshTree();
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

export const clearFirmware = vscode.commands.registerCommand(
	'qpy-ide.clearFw',
	() => {
		fwProvider.clearFw();
	}
);


export const openConnection = vscode.commands.registerCommand(
	'qpy-ide.openConnection',
	async (
		portPath?: string,
		baudRate?: number,
		translateHex?: boolean,
		lineEnd?: string
	) => {
		if (portStatus) {
			vscode.window.showErrorMessage('Device is already connected!');
		} else {
			const portPaths = await executeBatScript();
			// resolve port path
			let chosenPort: string | undefined = portPath;
			let chosenPortPath: string | undefined;
		
			if (portPaths.length < 1) {
				vscode.window.showErrorMessage('No serial devices found');
				return;
			}

			chosenPort = await vscode.window.showQuickPick(portPaths, {
				placeHolder: 'Select COM port',
			});

			if (!chosenPort) {
				return;
			}

			chosenPortPath = chosenPort.split(' (')[1].slice(0, -1);

			// resolve baud rate
			let chosenBaud: number | undefined = baudRate;
			if (!chosenBaud) {
				let chosenBaudString: string | undefined =
					await vscode.window.showQuickPick(
						['[Other]', ...supportedBaudRates],
						{
							placeHolder: 'Choose baud rate',
						}
					);

				if (chosenBaudString === '[Other]') {
					chosenBaudString = await vscode.window.showInputBox({
						placeHolder: 'Enter baud rate',
					});
				}

				if (!chosenBaudString) {
					return;
				}

				try {
					chosenBaud = Number.parseInt(chosenBaudString);
				} catch {
					vscode.window.showErrorMessage(
						`Invalid baud rate ${chosenBaudString}!`
					);
					return;
				}
			}

			if (chosenBaud <= 0 || !Number.isInteger(chosenBaud)) {
				vscode.window.showErrorMessage(`Invalid baud rate ${chosenBaud}!`);
				return;
			}

			// figure out if hex from the com port should be converted to text
			const wsConfig = vscode.workspace.getConfiguration();
			translateHex = translateHex ?? wsConfig.get('QuecPython.translateHex') ?? true;

			// resolve line terminator
			const configDLT: string | undefined = wsConfig.get(
				'QuecPython.defaultLineTerminator'
			);

			if (configDLT !== undefined && lineEnd === undefined) {
				lineEnd = utils.unescape(configDLT);
			}

			lineEnd = lineEnd ?? '\r\n';

			const st = new SerialTerminal(
				chosenPortPath,
				chosenBaud,
				translateHex,
				lineEnd
			);

			const terminal = vscode.window.createTerminal({
				name: `QPY: ${chosenPort}`,
				pty: st,
			});

			terminal.show();
			terminalRegistry[terminal.name] = st;
			return terminal;
		}
	}
);

export const closeConnection = vscode.commands.registerCommand(
	'qpy-ide.closeConnection',
	async () => {
		try {
			const st = getActiveSerial();
			st.serial.close();
			st.handleDataAsText('SIG_TERM_9');
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

export const setLineEndCommand = vscode.commands.registerCommand(
	'qpy-ide.setLineEnd',
	async () => {
		const st = getActiveSerial();
		if (st) {
			let newLineEnd = await vscode.window.showInputBox({
				placeHolder: 'New line terminator',
			});
			if (newLineEnd !== undefined) {
				newLineEnd = utils.unescape(newLineEnd);
				st.setLineEnd(newLineEnd);
			}
		}
	}
);

export const toggleHexTranslationCommand = vscode.commands.registerCommand(
	'qpy-ide.toggleHexTranslation',
	() => {
		const st = getActiveSerial();
		if (st) {
			st.toggleHexTranslate();
		}
	}
);

export const clearCommand = vscode.commands.registerCommand(
	'qpy-ide.clearTerminal',
	() => {
		try {
			const st = getActiveSerial();
			if (st) {
				st.clear();
			}
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

export const runScript = vscode.commands.registerCommand(
	'qpy-ide.runScript',
	(node: ModuleDocument) => {
		try {
			setTerminalFlag(true, cmd.runScript);
			const st = getActiveSerial();
			st.handleCmd(`import example\r\n`);
			st.handleCmd(`example.exec('${node.filePath.slice(1)}')\r\n`);
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

export const removeFile = vscode.commands.registerCommand(
	'qpy-ide.removeFile',
	async (node: ModuleDocument) => {
		try {
			const st = getActiveSerial();
			setTerminalFlag(true, cmd.removeFile);
			st.handleCmd(`uos.remove('${node.filePath}')\r\n`);
			await utils.sleep(100);
			serialEmitter.emit(cmd.removeFile, cmd.removeFile);
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

export const removeDir = vscode.commands.registerCommand(
	'qpy-ide.removeDir',
	async (node: ModuleDocument) => {
		try {
			const st = getActiveSerial();
			setTerminalFlag(true, cmd.removeDir);
			st.handleCmd(`uos.rmdir('${node.filePath}')\r\n`);
			await utils.sleep(100);
			serialEmitter.emit(cmd.removeDir, cmd.removeDir);
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

export const downloadFile = vscode.commands.registerCommand(
	'qpy-ide.downloadFile',
	async (fileUri: vscode.Uri) => {
		try {
			let downloadPath: vscode.Uri;

			if (typeof fileUri === 'undefined') {
				downloadPath = vscode.window.activeTextEditor.document.uri;
			} else {
				downloadPath = fileUri;
			}

			if (downloadPath.fsPath.match(chiregex)) {
				vscode.window.showErrorMessage('Invalid file name for download.');
				return;
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

				await filedownload(
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

export const selectiveDownloadFile = vscode.commands.registerCommand(
	'qpy-ide.selectiveDownloadFile',
	async (fileUri: vscode.Uri) => {
		try {
			if (fileUri.fsPath.match(chiregex)) {
				vscode.window.showErrorMessage('Invalid file name for download.');
				return;
			}

			if (utils.isDir(fileUri.fsPath)) {
				vscode.window.showErrorMessage('Specified target is not a valid file.');
				return;
			} else {
				const fullFilePath = await vscode.window.showInputBox({
					placeHolder: 'Enter full directory path... (e.g. /usr/temp)',
				});

				if (!fullFilePath) {
					return;
				}

				if (fullFilePath.startsWith('/usr/')) {
					const st = getActiveSerial();

					const fileData = {
						filename: fileUri.fsPath.split('\\').pop(),
						fileSizeInBytes: fs.statSync(fileUri.fsPath).size,
					};

					st.serial.close();

					await filedownload(
						fileUri.fsPath,
						st.serial.path,
						st.serial.baudRate,
						fileData,
						fullFilePath
					);
				}
			}
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

export const createDir = vscode.commands.registerCommand(
	'qpy-ide.createDir',
	async () => {
		try {
			const fullFilePath = await vscode.window.showInputBox({
				placeHolder: 'Enter full directory path... (e.g. /usr/test)',
			});

			if (!fullFilePath) {
				return;
			}

			if (fullFilePath.startsWith('/usr/')) {
				const st = getActiveSerial();
				
				// this flag is monitored by EventEmitter in serialBridge.ts
				setTerminalFlag(true, cmd.createDir);
				
				newDirPath = fullFilePath;
				st.handleCmd(`import ql_fs\r\n`);
				st.handleCmd(`ql_fs.mkdirs('${fullFilePath}')\r\n`);
				await utils.sleep(400);
				
				await _refreshTree(); // refresh tree view after creating folder
			} else {
				vscode.window.showErrorMessage('Invalid directory path.');
				return;
			}
		} catch {
			vscode.window.showErrorMessage('Something went wrong.');
			setTerminalFlag();
		}
	}
);

async function _refreshTree() {
	// private func to refresh folder tree view

	setTerminalFlag(true, cmd.ilistdir);
    const st = getActiveSerial();
    st.handleCmd(`example.exec('usr/q_init_fs.py')\r\n`);
    await utils.sleep(400);
    serialEmitter.emit(cmd.ilistdir, cmd.ilistdir);
    moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
    moduleFsTreeProvider.refresh();
};

async function updateColorTheme(color: vscode.ColorTheme){
	// when theme changed, update extension page, if open
	if (HtmlPanel.currentPanel){
		HtmlPanel.currentPanel.dispose();
		vscode.commands.executeCommand('qpy-ide.projectsPage');
	}
}

export const registerCommands = (context: vscode.ExtensionContext): void => {
	// register commands to the extension
	const projectsPage = vscode.commands.registerCommand(
		'qpy-ide.projectsPage',
		async (extensionUri: vscode.Uri) => { 
			await HtmlPanel.createOrShow(context.extensionUri, 'projectsPage');
		}
	);
	const currentProjectPage = vscode.commands.registerCommand(
		'qpy-ide.currentProjectPage',
		async (extensionUri: vscode.Uri) => { 
			HtmlPanel.createOrShow(context.extensionUri, 'currentProjectPage');
		}
	);
	const myProjects = vscode.commands.registerCommand(
		'qpy-ide.myProjects',
		async (extensionUri: vscode.Uri) => { 
			HtmlPanel.createOrShow(context.extensionUri, 'myProjects');
		}
	);
	const colorChangeTheme = vscode.window.onDidChangeActiveColorTheme(updateColorTheme);

	context.subscriptions.push(
		colorChangeTheme,
		openConnection,
		closeConnection,
		setLineEndCommand,
		toggleHexTranslationCommand,
		clearCommand,
		downloadFile,
		selectiveDownloadFile,
		clearFirmware,
		refreshModuleFs,
		runScript,
		removeFile,
		removeDir,
		createDir,
		projectsPage,
		currentProjectPage,
		myProjects,
		vscode.window.registerWebviewViewProvider(
			FirmwareViewProvider.viewType,
			fwProvider
		)
	);
};
