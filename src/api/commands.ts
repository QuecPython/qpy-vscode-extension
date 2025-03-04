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

const cats = {
	'Coding Cat': 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
	'Compiling Cat': 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif',
	'Testing Cat': 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif'
};


function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

/**
 * Manages cat coding webview panels
 */
class CatCodingPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: CatCodingPanel | undefined;

	public static readonly viewType = 'catCoding';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (CatCodingPanel.currentPanel) {
			CatCodingPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			CatCodingPanel.viewType,
			'Cat Coding',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			() => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		CatCodingPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;

		// Vary the webview's content based on where it is located in the editor.
		switch (this._panel.viewColumn) {
			case vscode.ViewColumn.Two:
				this._updateForCat(webview, 'Compiling Cat');
				return;

			case vscode.ViewColumn.Three:
				this._updateForCat(webview, 'Testing Cat');
				return;

			case vscode.ViewColumn.One:
			default:
				this._updateForCat(webview, 'Coding Cat');
				return;
		}
	}

	private _updateForCat(webview: vscode.Webview, catName: keyof typeof cats) {
		this._panel.title = catName;
		this._panel.webview.html = this._getHtmlForWebview(webview, cats[catName]);
	}

	private _getHtmlForWebview(webview: vscode.Webview, catGifPath: string) {
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

		// Local path to css styles
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');

		// Uri to load styles into webview
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">

				<title>Cat Coding</title>
			</head>
			<body>
				<button>test</button></br>
				<img src="${catGifPath}" width="300" />
				<h1 id="lines-of-code-counter">0</h1>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

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
			log(portPaths);
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

// register commands to the extension
export const registerCommands = (context: vscode.ExtensionContext): void => {
	const homePage = vscode.commands.registerCommand(
		'qpy-ide.homePage',
		async (extensionUri: vscode.Uri) => { 
			CatCodingPanel.createOrShow(context.extensionUri);
		}
	);
	
	context.subscriptions.push(
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
		homePage,
		vscode.window.registerWebviewViewProvider(
			FirmwareViewProvider.viewType,
			fwProvider
		)
	);
};
