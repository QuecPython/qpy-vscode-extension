// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import SerialPort from 'SerialPort';

import FirmwareViewProvider from './sidebar/firmwareSidebar';
import { supportedBaudRates } from './utils/constants';
import { listComPorts } from './serial/serial';

import { SerialTerminal } from './serialTerminal';
import { api } from './api';
import * as stringUtilities from './util';

// Lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let connection = false;
	let availablePorts: string[] = [];
	let currentPort: string;
	let currentBaudRate = '9600';
	let port: SerialPort;

	const provider = new FirmwareViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			FirmwareViewProvider.viewType,
			provider
	));

	// Status Bar items defintions
	const selectPort = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left
	);
	selectPort.text = 'No Port Selected';
	selectPort.command = 'qpy-ide.selectComPort';
	selectPort.tooltip = 'Current COM Port';
	selectPort.show();

	const baudRateItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left
	);
	baudRateItem.text = '9600';
	baudRateItem.command = 'qpy-ide.setBaudRate';
	baudRateItem.tooltip = 'Current Baud Rate';
	baudRateItem.show();

	const connSerialPort = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left
	);
	connSerialPort.text = `$(plug) Connect`;
	connSerialPort.command = 'qpy-ide.connectOrDisconnect';

	if (connection) {
		connSerialPort.tooltip = 'Disconnect Serial Port';
	} else {
		connSerialPort.tooltip = 'Connect Serial Port';
	}
	connSerialPort.show();

	const refreshComPorts = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left
	);
	refreshComPorts.text = `$(refresh)`;
	refreshComPorts.command = 'qpy-ide.refreshPorts';
	refreshComPorts.tooltip = 'Refresh Serial Ports';
	refreshComPorts.show();

	const replItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left
	);
	replItem.text = `$(repl)`;
	replItem.command = 'qpy-ide.startSerialTerminal';
	replItem.tooltip = 'Start Serial Terminal';
	replItem.show();

	// Commands definition
	context.subscriptions.push(vscode.commands.registerCommand('qpy-ide.startSerialTerminal', () => {
		const terminal = vscode.window.createTerminal(`QuecPython Terminal`);
		terminal.show();
		terminal.sendText(`serialport-terminal -p ${currentPort} -b ${currentBaudRate} --no-echo`);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('qpy-ide.refreshPorts', () => {
		availablePorts = listComPorts();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('qpy-ide.refreshModuleFS', () => {
		vscode.window.showInformationMessage('This should refresh module files!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('qpy-ide.setBaudRate', async () => {
        const selectedBaudRate = await vscode.window.showQuickPick(
            supportedBaudRates,
            { placeHolder: 'Select Baud Rate' }
		);

		if (selectedBaudRate) {
			baudRateItem.text = selectedBaudRate;
			currentBaudRate = selectedBaudRate;
		}
    }));

	context.subscriptions.push(vscode.commands.registerCommand('qpy-ide.selectComPort', async () => {
        const selectedComPort = await vscode.window.showQuickPick(
			availablePorts,
			{ placeHolder: 'Select COM Port' }
		);

		if (selectedComPort) {
			selectPort.text = selectedComPort;
			currentPort = selectedComPort;

			port = new SerialPort(
				currentPort, 
				{ 
					baudRate: parseInt(currentBaudRate, 10),
					autoOpen: false
			});
		}
    }));

	context.subscriptions.push(vscode.commands.registerCommand('qpy-ide.connectOrDisconnect', async () => {
		if (listComPorts().includes(currentPort)) {
			if (port.isOpen) {
				port.close(function() {
					connSerialPort.tooltip = 'Disconnect Serial Port';
					connSerialPort.text = `$(plug) Connect`;
					connection = false;
				});
			} else {
				port.open(function() {
					connSerialPort.tooltip = 'Connect Serial Port';
					connSerialPort.text = `$(plug) Disconnect`;
					connection = true;
				});
			}
		} else {
			selectPort.text = 'No Port Selected';
			availablePorts = [];
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('qpy-ide.downloadFiles', () => {
		vscode.window.showInformationMessage('FILES TO DOWNLOAD!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('qpy-ide.clearFw', () => {
		provider.clearFw();
	}));

	// inital serial port listing
	availablePorts = listComPorts();

	const openTerminalCommand = vscode.commands.registerCommand(
        'qpy-ide.openTerminal',
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
                    placeHolder: 'Select port',
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
                        `Invalid baud rate ${chosenBaudString}. Must be an integer > 0`
                    );
                    return;
                }
            }
            if (chosenBaud <= 0 || !Number.isInteger(chosenBaud)) {
                vscode.window.showErrorMessage(
                    `Invalid baud rate ${chosenBaud}. Must be an integer > 0`
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
                lineEnd = stringUtilities.unescape(configDLT);
            }
            lineEnd = lineEnd ?? '\r\n';

            const st = new SerialTerminal(
                chosenPortPath,
                chosenBaud,
                translateHex,
                lineEnd
            );
            const terminal = vscode.window.createTerminal({
                name: `${chosenPortPath} (Baud: ${chosenBaud})`,
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
                    newLineEnd = stringUtilities.unescape(newLineEnd);
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

    context.subscriptions.push(
        openTerminalCommand,
        setLineEndCommand,
        toggleHexTranslationCommand,
        clearCommand
    );

    //Export api defined in api.ts
    return api;
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getActiveSerial(): SerialTerminal | undefined {
	const activeTerminal = vscode.window.activeTerminal;
	if (activeTerminal === undefined) {
		vscode.window.showErrorMessage('No active terminal');
		return;
	}
	if (!Object.keys(terminalRegistry).includes(activeTerminal.name)) {
		vscode.window.showErrorMessage(
			'Active terminal is not a registered serial terminal'
		);
		return;
	}
	return terminalRegistry[activeTerminal.name];
}