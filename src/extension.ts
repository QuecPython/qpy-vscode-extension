import * as vscode from 'vscode';
import * as fs from 'fs';
import SerialPort from 'SerialPort';

import FirmwareViewProvider from './sidebar/firmwareSidebar';
import { supportedBaudRates, cmd } from './utils/constants';
import SerialTerminal from './serial/serialTerminal';
import * as utils from './utils/utils';
import { serialEmitter } from './serial/serialBridge';
import { ModuleDocument, ModuleFileSystemProvider } from './deviceTree/moduleFileSystem';

// Lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};

export function activate(context: vscode.ExtensionContext) {
	const fwProvider = new FirmwareViewProvider(context.extensionUri);

    const moduleFsTreeProvider = new ModuleFileSystemProvider();
    vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);

	const connStatus = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left
	);

    setButtonStatus(connStatus, false);
	connStatus.show();

	// Commands definitions
	const refreshModuleFs = vscode.commands.registerCommand(
        'qpy-ide.refreshModuleFS',
        () => moduleFsTreeProvider.refresh()
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
            // Resolve port path
            let chosenPortPath: string | undefined = portPath;
            if (!chosenPortPath) {
                const ports = await SerialPort.list();
                const portPaths = ports.map((p) => p.path);
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

            // Resolve baud rate
            let chosenBaud: number | undefined = baudRate;
            if (!chosenBaud) {
                let chosenBaudString: string | undefined = await vscode.window.showQuickPick(
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
                vscode.window.showErrorMessage(
                    `Invalid baud rate ${chosenBaud}!`
                );
                return;
            }

            // Figure out if hex from the com port should be converted to text
            const wsConfig = vscode.workspace.getConfiguration();
            translateHex = translateHex ?? wsConfig.get('QuecPython.translateHex') ?? true;

            // Resolve line terminator
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
            st.handleInput(`${cmd.runScript}import example\r\n`);
            st.handleInput(`${cmd.runScript}example.exec('usr/${node.label}')\r\n`);
	    }
	);

    const removeFile = vscode.commands.registerCommand(
		'qpy-ide.removeFile',
		(node: ModuleDocument) => {
		    const st = getActiveSerial();
            st.handleInput(`${cmd.removeFile}uos.remove('/usr/${node.label}')\r\n`);
	    }
	);

    const removeDir = vscode.commands.registerCommand(
		'qpy-ide.removeDir',
		(node: ModuleDocument) => {
		    const st = getActiveSerial();
            st.handleInput(`${cmd.removeDir}uos.rmdir('/usr/${node.label}')\r\n`);
	    }
	);

    const downloadFile = vscode.commands.registerCommand(
        'qpy-ide.downloadFile',
        (fileUri: vscode.Uri) => {
            if (utils.isDir(fileUri.fsPath)) {
                vscode.window.showErrorMessage('Specified target is not a valid file!');
                return;
            } else {
                let data = '';
                const readStream = fs.createReadStream(fileUri.fsPath, 'utf8');

                readStream.on('data', (chunk) => {
                    data += chunk;
                }).on('end', () => {
                    const filename = fileUri.fsPath.split('\\').pop();
                    const splitData = data.split(/\r\n/);

                    const stats = fs.statSync(fileUri.fsPath);
                    const fileSizeInBytes = stats.size;

                    const st = getActiveSerial();
                    st.handleInput(`${cmd.downloadFile}f = open('/usr/${filename}', 'wb', encoding='utf-8')\r\n`);
                    st.handleInput(`${cmd.downloadFile}w = f.write\r\n`);
                    splitData.forEach((dataLine: string) => {
                        st.handleInput(`${cmd.downloadFile}w(b"${dataLine}\\r\\n")\r\n`);
                    });
                    st.handleInput(`${cmd.downloadFile}f.close()\r\n`);

                    removeExistingTreeElem(filename, moduleFsTreeProvider);

                    moduleFsTreeProvider.data.push(
                        new ModuleDocument(
                            filename,
                            `${fileSizeInBytes} B`,
                            vscode.TreeItemCollapsibleState.None)
                    );
                    
                    moduleFsTreeProvider.refresh();
                });
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
            } else {
                const st = getActiveSerial();
                st.handleInput(`${cmd.createDir}uos.mkdir('${fullFilePath}')\r\n`);
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

    // Serial Emitter events
    serialEmitter.on('statusConn', () => {
        setButtonStatus(connStatus, true);
    });

    serialEmitter.on('statusDisc', () => {
        setButtonStatus(connStatus, false);
    });

    serialEmitter.on(`${cmd.ilistdir}`, (data: string) => {
        if (data !== '') {
            const temp: ModuleDocument[] = [];
            const splitData = data.split(/\r\n/);
            splitData.slice(5, -1).forEach((block: string) => {
                const splitBlock = block.slice(1, -1)
                                        .replace(/\'/g, '')
                                        .split(', ');
                // Avoid displaying system files
                if (splitBlock[0] === 'apn_cfg.json' ||
                    splitBlock[0] === 'system_config.json') {
                    return;
                }

                temp.push(new ModuleDocument(
                    splitBlock[0],
                    splitBlock[3] === '0' ? '' : `${splitBlock[3]} B`,
                    vscode.TreeItemCollapsibleState.None
                ));
            });
            moduleFsTreeProvider.data = temp;
        } else {
            moduleFsTreeProvider.data = [];
        }

        moduleFsTreeProvider.refresh();
    });

    serialEmitter.on(`${cmd.runScript}`, (data: string) => {
        if (data.includes('Error')) {
            vscode.window.showErrorMessage('Failed to execute script!');
            return;
        }
        const jointData = data.split(/\r\n/).slice(2).join('\r\n');
        const st = getActiveSerial();
        st.handleDataAsText(`${jointData}`);
    });

    serialEmitter.on(`${cmd.createDir}`, (data: string) => {
        if (data.includes('Error')) {
            vscode.window.showErrorMessage('Directory already exists on given path!');
            return;
        }
        const parsedData = utils.extractFromParentheses(data);
        moduleFsTreeProvider.data.push(new ModuleDocument(
            parsedData, '', vscode.TreeItemCollapsibleState.None
        ));
        moduleFsTreeProvider.refresh();
    });

    serialEmitter.on(`${cmd.removeDir}`, (data: string) => {
        removeExistingTreeElem(utils.extractFromParentheses(data), moduleFsTreeProvider);
        moduleFsTreeProvider.refresh();
    });

    serialEmitter.on(`${cmd.removeFile}`, (data: string) => {
        removeExistingTreeElem(utils.extractFromParentheses(data), moduleFsTreeProvider);
        moduleFsTreeProvider.refresh();
    });
}

export function deactivate() {}

function getActiveSerial(): SerialTerminal | undefined {
	const activeTerminal = vscode.window.activeTerminal;

	if (activeTerminal === undefined) {
		vscode.window.showErrorMessage('No QPY device connected!');
		return;
	}

	if (!Object.keys(terminalRegistry).includes(activeTerminal.name)) {
		vscode.window.showErrorMessage(
			'Active terminal is not a registered serial terminal!'
		);
		return;
	}

	return terminalRegistry[activeTerminal.name];
}

function removeExistingTreeElem(param: string, treeProvider: ModuleFileSystemProvider): void {
    const index = treeProvider.data.findIndex(x => x.label === param);
        if (index > -1) {
            treeProvider.data.splice(index, 1);
        }
}

function setButtonStatus(connStatus: vscode.StatusBarItem, status: boolean) {
    if (status) {
        connStatus.text = `$(plug) Connected`;
        connStatus.tooltip = 'COM Port is Connected';
    } else {
        connStatus.text = `$(plug) Disconnected`;
        connStatus.tooltip = 'COM Port not Connected';
    }
}