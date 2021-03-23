import * as vscode from 'vscode';
import SerialPort from 'SerialPort';

import FirmwareViewProvider from './sidebar/firmwareSidebar';
import { supportedBaudRates } from './utils/constants';
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

	connStatus.text = `$(plug) Disconnected`;
    connStatus.tooltip = 'COM Port not Connected';
	connStatus.show();

	// Commands definition

	const refreshModuleFs = vscode.commands.registerCommand(
        'qpy-ide.refreshModuleFS',
        () => moduleFsTreeProvider.refresh()
    );

	const downloadFiles = vscode.commands.registerCommand(
        'qpy-ide.downloadFiles',
        () => {
		    vscode.window.showInformationMessage('FILES TO DOWNLOAD!');
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
		() => {
		    vscode.window.showInformationMessage('Run Script!');
	    }
	);

    const deleteFile = vscode.commands.registerCommand(
		'qpy-ide.deleteFile',
		() => {
		    vscode.window.showInformationMessage('Delete File!');
	    }
	);

    const deleteDir = vscode.commands.registerCommand(
		'qpy-ide.deleteDir',
		() => {
		    vscode.window.showInformationMessage('Delete Directory!');
	    }
	);


    context.subscriptions.push(
        openConnection,
        setLineEndCommand,
        toggleHexTranslationCommand,
        clearCommand,
        clearFirmware,
        downloadFiles,
        refreshModuleFs,
        runScript,
        deleteFile,
        deleteDir,
        vscode.window.registerWebviewViewProvider(
			FirmwareViewProvider.viewType,
			fwProvider
        )
    );

    // Serial Emitter events
    serialEmitter.on('statusConn', () => {
        connStatus.text = `$(plug) Connected`;
        connStatus.tooltip = 'COM Port is Connected';
    });

    serialEmitter.on('statusDisc', () => {
        connStatus.text = `$(plug) Disconnected`;
        connStatus.tooltip = 'COM Port not Connected';
    });

    serialEmitter.on('getFileStats', (data: string) => {
        if (data !== '') {
            const splitData = data.split(/\r\n/);
            splitData.slice(5, -1).forEach((block: string) => {
                const splitBlock = block.slice(1, -1).replace(/\'/g, '').split(', ');
                moduleFsTreeProvider.data.push(new ModuleDocument(
                    splitBlock[0],
                    `${splitBlock[3]} B`,
                    vscode.TreeItemCollapsibleState.None
                ));
            });
        } else {
            moduleFsTreeProvider.data = [];
        }

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
