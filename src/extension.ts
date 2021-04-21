import * as vscode from 'vscode';
import * as fs from 'fs';
import SerialPort from 'SerialPort';

import FirmwareViewProvider from './sidebar/firmwareSidebar';
import { supportedBaudRates, cmd } from './utils/constants';
import SerialTerminal from './serial/serialTerminal';
import * as utils from './utils/utils';
import { serialEmitter } from './serial/serialBridge';
import {
	ModuleDocument,
	ModuleFileSystemProvider,
} from './deviceTree/moduleFileSystem';

// lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};

export function activate(context: vscode.ExtensionContext) {
	const fwProvider = new FirmwareViewProvider(context.extensionUri);

	const moduleFsTreeProvider = new ModuleFileSystemProvider();
	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);

	const connStatus = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left
	);

	const downloadScript = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left
	);

	setButtonDownload(downloadScript);
	downloadScript.show();
	downloadScript.command = 'qpy-ide.downloadFile';

	setButtonStatus(connStatus, false);
	connStatus.show();

	// commands definitions
	const refreshModuleFs = vscode.commands.registerCommand(
		'qpy-ide.refreshModuleFS',
		() => {
			const st = getActiveSerial();
			st.readStatFiles();
			moduleFsTreeProvider.refresh();
		}
	);

	const clearFirmware = vscode.commands.registerCommand(
		'qpy-ide.clearFw',
		() => {
			fwProvider.clearFw();
		}
	);

	const openConnection = vscode.commands.registerCommand(
		'qpy-ide.openConnection',
		async (
			portPath?: string,
			baudRate?: number,
			translateHex?: boolean,
			lineEnd?: string
		) => {
			// resolve port path
			let chosenPortPath: string | undefined = portPath;
			if (!chosenPortPath) {
				const ports = await SerialPort.list();
				const portPaths = ports.map(p => p.path);
				if (portPaths.length < 1) {
					vscode.window.showErrorMessage('No serial devices found');
					return;
				}

				chosenPortPath = await vscode.window.showQuickPick(portPaths, {
					placeHolder: 'Select COM port',
				});

				if (!chosenPortPath) {
					return;
				}
			}

			// resolve baud rate
			let chosenBaud: number | undefined = baudRate;
			if (!chosenBaud) {
				let chosenBaudString:
					| string
					| undefined = await vscode.window.showQuickPick(
					['[Other]', ...supportedBaudRates],
					{ placeHolder: 'Choose baud rate' }
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
			translateHex =
				translateHex ?? wsConfig.get('QuecPython.translateHex') ?? true;

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
				name: `QPY: ${chosenPortPath} (${chosenBaud} baud)`,
				pty: st,
			});

			terminal.show();
			terminalRegistry[terminal.name] = st;
			return terminal;
		}
	);

	const setLineEndCommand = vscode.commands.registerCommand(
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

	const toggleHexTranslationCommand = vscode.commands.registerCommand(
		'qpy-ide.toggleHexTranslation',
		() => {
			const st = getActiveSerial();
			if (st) {
				st.toggleHexTranslate();
			}
		}
	);

	const clearCommand = vscode.commands.registerCommand(
		'qpy-ide.clearTerminal',
		() => {
			const st = getActiveSerial();
			if (st) {
				st.clear();
			}
		}
	);

	const runScript = vscode.commands.registerCommand(
		'qpy-ide.runScript',
		(node: ModuleDocument) => {
			const st = getActiveSerial();
			st.cmdFlag = true;
			st.cmdFlagLabel = cmd.runScript;
			st.handleInput(`${cmd.runScript}import example\r\n`);
			st.handleInput(
				`${cmd.runScript}example.exec('${node.filePath.slice(1)}')\r\n`
			);
		}
	);

	const removeFile = vscode.commands.registerCommand(
		'qpy-ide.removeFile',
		(node: ModuleDocument) => {
			const st = getActiveSerial();
			st.cmdFlag = true;
			st.cmdFlagLabel = cmd.removeFile;
			st.handleInput(`${cmd.removeFile}uos.remove('${node.filePath}')\r\n`);
		}
	);

	const removeDir = vscode.commands.registerCommand(
		'qpy-ide.removeDir',
		(node: ModuleDocument) => {
			const st = getActiveSerial();
			st.cmdFlag = true;
			st.cmdFlagLabel = cmd.removeDir;
			st.handleInput(`${cmd.removeDir}uos.rmdir('${node.filePath}')\r\n`);
		}
	);

	const downloadFile = vscode.commands.registerCommand(
		'qpy-ide.downloadFile',
		(fileUri: vscode.Uri) => {
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
				const data = fs.readFileSync(downloadPath.fsPath);
				const st = getActiveSerial();
				st.cmdFlag = true;
				st.cmdFlagLabel = cmd.downloadFile;
				const filename = downloadPath.fsPath.split('\\').pop();

				const stats = fs.statSync(downloadPath.fsPath);
				const fileSizeInBytes = stats.size;

				st.serial.flush(() =>
					st.serial.write(`f = open('/usr/${filename}', 'wb')\r\n`)
				);
				st.serial.flush(() => st.serial.write(`w = f.write\r\n`));

				const splitData = data.toString().split(/\r\n/);

				serialEmitter.emit('startProgress');
				splitData.forEach((dataLine: string, index: number) => {
					const rawData = String.raw`${dataLine + '\\r\\n'}`;
					setTimeout(
						() =>
							st.serial.flush(() => {
								st.serial.write(`w(b'''${rawData}''')\r\n`);
                                const updatePaylod = {
                                    index,
                                    dataLen: splitData.length
                                };
								serialEmitter.emit('updatePercentage', updatePaylod);
							}),
						100 + index * 10
					);
				});

				setTimeout(
					() =>
						st.serial.flush(() => {
							st.serial.write(`f.close()\r\n`);
							serialEmitter.emit('downloadFinished');
						}),
					100 + (splitData.length + 1) * 10
				);

				removeTreeNodeByName(filename, moduleFsTreeProvider.data);

				moduleFsTreeProvider.data.push(
					new ModuleDocument(
						filename,
						`${fileSizeInBytes} B`,
						`/usr/${filename}`
					)
				);

				moduleFsTreeProvider.refresh();
			}
		}
	);

	const createDir = vscode.commands.registerCommand(
		'qpy-ide.createDir',
		async () => {
			const fullFilePath = await vscode.window.showInputBox({
				placeHolder: 'Enter full directory path... (e.g. /usr/test)',
			});

			if (!fullFilePath) {
				return;
			}

			if (fullFilePath.startsWith('/usr/')) {
				const st = getActiveSerial();
				st.cmdFlag = true;
				st.cmdFlagLabel = cmd.createDir;
				st.handleInput(`${cmd.createDir}uos.mkdir('${fullFilePath}')\r\n`);
			} else {
				vscode.window.showErrorMessage('Invalid directory path.');
				return;
			}
		}
	);

	context.subscriptions.push(
		openConnection,
		setLineEndCommand,
		toggleHexTranslationCommand,
		clearCommand,
		clearFirmware,
		downloadFile,
		refreshModuleFs,
		runScript,
		removeFile,
		removeDir,
		createDir,
		vscode.window.registerWebviewViewProvider(
			FirmwareViewProvider.viewType,
			fwProvider
		)
	);

	// serial emitter events
	serialEmitter.on('statusConn', () => {
		setButtonStatus(connStatus, true);
	});

	serialEmitter.on('statusDisc', () => {
		setButtonStatus(connStatus, false);
		moduleFsTreeProvider.data = [];
		moduleFsTreeProvider.refresh();
	});

	serialEmitter.on(`${cmd.ilistdir}`, (data: string) => {
		let stringToParse: string;
		if (data.includes(`uos.remove`)) {
			const splitData = data.split(/\r\n/);
			splitData.forEach((dataLine: string) => {
				if (dataLine.includes('[{')) {
					stringToParse = dataLine;
				}
			});

			if (typeof stringToParse !== 'undefined') {
				stringToParse = stringToParse.replace(/'/g, '"');
				const dataArr = JSON.parse(stringToParse);

				moduleFsTreeProvider.data = initTree(dataArr);
				moduleFsTreeProvider.refresh();
			}

			const st = getActiveSerial();
			st.cmdFlag = false;
			st.cmdFlagLabel = '';
		}
	});

	serialEmitter.on(`${cmd.runScript}`, (data: string) => {
		const st = getActiveSerial();
		st.cmdFlag = false;
		st.cmdFlagLabel = '';

		if (data.includes('Error')) {
			vscode.window.showErrorMessage('Failed to execute script.');
			return;
		}

		const jointData = data.split(/\r\n/).slice(2).join('\r\n');
		st.handleDataAsText(`${jointData}`);
	});

	serialEmitter.on(`${cmd.createDir}`, (data: string) => {
		if (data.includes('Traceback')) {
			vscode.window.showErrorMessage('Unable to create directory.');
			return;
		}

		const parsedData = data
			.match(/\(([^)]+)\)/)[1]
			.slice(1, -1)
			.split('/')
			.slice(1);

		const parentPath = `/${parsedData.slice(0, -1).join('/')}`;
		const newDirName = parsedData.pop();
		const newDir = new ModuleDocument(
			newDirName,
			'',
			`${parentPath}/${newDirName}`,
			[]
		);

		if (parentPath === '/usr') {
			moduleFsTreeProvider.data.push(newDir);
			moduleFsTreeProvider.refresh();
		} else {
			const parentDir = findTreeNode(moduleFsTreeProvider.data, parentPath);

			if (parentDir) {
				parentDir.children.push(newDir);
				moduleFsTreeProvider.refresh();
			} else {
				vscode.window.showErrorMessage('Unable to create directory.');
				return;
			}
		}

		const st = getActiveSerial();
		st.cmdFlag = false;
		st.cmdFlagLabel = '';
	});

	serialEmitter.on(`${cmd.removeDir}`, (data: string) => {
		const parsedData = utils.extractFilePath(data);
		removeTreeNodeByPath(moduleFsTreeProvider.data, parsedData);
		moduleFsTreeProvider.refresh();
		const st = getActiveSerial();
		st.cmdFlag = false;
		st.cmdFlagLabel = '';
	});

	serialEmitter.on(`${cmd.removeFile}`, (data: string) => {
		const parsedData = utils.extractFilePath(data);
		removeTreeNodeByPath(moduleFsTreeProvider.data, parsedData);
		moduleFsTreeProvider.refresh();
		const st = getActiveSerial();
		st.cmdFlag = false;
		st.cmdFlagLabel = '';
	});

	serialEmitter.on(`${cmd.downloadFile}`, (data: string) => {
		if (data.includes('close')) {
			const st = getActiveSerial();
			st.cmdFlag = false;
			st.cmdFlagLabel = '';
		}
	});

	serialEmitter.on('startProgress', () => {
		progressBar();
	});
}

export function deactivate() {}

// vscode component manipulation methods
function getActiveSerial(): SerialTerminal | undefined {
	const activeTerminal = vscode.window.activeTerminal;

	if (activeTerminal === undefined) {
		vscode.window.showErrorMessage('No QPY device connected.');
		return;
	}

	if (!Object.keys(terminalRegistry).includes(activeTerminal.name)) {
		vscode.window.showErrorMessage(
			'Active terminal is not a registered serial terminal.'
		);
		return;
	}

	return terminalRegistry[activeTerminal.name];
}

function setButtonDownload(downloadScript: vscode.StatusBarItem) {
	downloadScript.text = `$(arrow-down) Download File`;
	downloadScript.tooltip = `Download active file to module`;
}

function setButtonStatus(connStatus: vscode.StatusBarItem, status: boolean) {
	if (status) {
		connStatus.text = `$(plug) Connected`;
		connStatus.tooltip = 'COM Port is connected';
	} else {
		connStatus.text = `$(plug) Disconnected`;
		connStatus.tooltip = 'COM Port not connected';
	}
}

// tree manipulation methods
function removeTreeNodeByName(
	param: string,
	documents: ModuleDocument[]
): void {
	const index = documents.findIndex(
		(doc: ModuleDocument) => doc.label === param
	);
	if (index > -1) {
		documents.splice(index, 1);
	}
}

function initTree(array: Object[]): ModuleDocument[] {
	const initialTree: ModuleDocument[] = [];

	array.forEach((doc: any) => {
		if (!doc.sub) {
			initialTree.push(new ModuleDocument(doc.name, doc.size, doc.path));
		} else {
			doc.sub = initTree(doc.sub);
			initialTree.push(
				new ModuleDocument(doc.name, doc.size, doc.path, doc.sub)
			);
		}
	});

	return initialTree;
}

function removeTreeNodeByPath(documents: ModuleDocument[], path: string): void {
	const index = documents.findIndex(doc => doc.filePath === path);
	if (index === -1) {
		documents.forEach(
			doc => doc.children && removeTreeNodeByPath(doc.children, path)
		);
	} else {
		documents.splice(index, 1);
	}
}

function findTreeNode(
	documents: ModuleDocument[],
	path: string
): ModuleDocument | undefined {
	let foundDir = documents.find((doc: ModuleDocument) => doc.filePath === path);
	if (!foundDir) {
		for (let i = 0; i < documents.length; i++) {
			if (documents[i].children) {
				foundDir = findTreeNode(documents[i].children, path);
				if (foundDir) {
					return foundDir;
				}
			}
		}
	}

	return foundDir;
}

function updateProgressBar(
	progress: vscode.Progress<{ message?: string; increment?: number }>,
	token: vscode.CancellationToken
): Promise<void> {
	return new Promise<void>(resolve => {
		if (token.isCancellationRequested) {
			return;
		}

		let messageUpdate = 'Starting download.';
		let timerUpdate = 500;
		const interval = setInterval(
			() => progress.report({ message: messageUpdate }),
			timerUpdate
		);

		let childProcess = serialEmitter.on('downloadFinished', () => {
			resolve();
			clearInterval(interval);
		});

		childProcess.on('updatePercentage', data => {
			const p = percentageParser(data.dataLen, data.index);
			messageUpdate = p.toString() + '%';
		});

		token.onCancellationRequested(_ => resolve());
	});
}

function progressBar() {
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Downloading file',
			cancellable: false,
		},
		async (progress, token) => {
			token.onCancellationRequested(() => {
                vscode.window.showInformationMessage('User canceled file download.');
			});
			return updateProgressBar(progress, token);
		}
	);
}

function percentageParser(total: number, step: number): number {
	const percentDecimal = (step * 100) / total;
	const percent = Math.round(percentDecimal);
	return percent;
}
