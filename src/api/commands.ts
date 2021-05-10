import * as vscode from 'vscode';
import * as fs from 'fs';
import SerialPort from 'SerialPort';

import * as utils from '../utils/utils';
import { getActiveSerial, setTerminalFlag } from './terminal';
import { moduleFsTreeProvider } from './userInterface';
import { fwProvider } from '../extension';
import { cmd, supportedBaudRates } from '../utils/constants';
import SerialTerminal from '../serial/serialTerminal';
import { terminalRegistry } from '../extension';
import { ModuleDocument } from '../deviceTree/moduleFileSystem';
import { serialEmitter } from '../serial/serialBridge';
import { removeTreeNodeByName, sortTreeNodes } from './treeView';

export const refreshModuleFs = vscode.commands.registerCommand(
    'qpy-ide.refreshModuleFS',
    () => {
        try {
            const st = getActiveSerial();
            st.readStatFiles();
            moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
            moduleFsTreeProvider.refresh();
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
            st.handleInput(`${cmd.runScript}import example\r\n`);
            st.handleInput(
                `${cmd.runScript}example.exec('${node.filePath.slice(1)}')\r\n`
            );
        } catch {
            vscode.window.showErrorMessage('Something went wrong.');
            setTerminalFlag();
        }
    }
);

export const removeFile = vscode.commands.registerCommand(
    'qpy-ide.removeFile',
    (node: ModuleDocument) => {
        try {
            const st = getActiveSerial();
            setTerminalFlag(true, cmd.removeFile);
            st.handleInput(`${cmd.removeFile}uos.remove('${node.filePath}')\r\n`);
        } catch {
            vscode.window.showErrorMessage('Something went wrong.');
            setTerminalFlag();
        }
    }
);

export const removeDir = vscode.commands.registerCommand(
    'qpy-ide.removeDir',
    (node: ModuleDocument) => {
        try {
            const st = getActiveSerial();
            setTerminalFlag(true, cmd.removeDir);
            st.handleInput(`${cmd.removeDir}uos.rmdir('${node.filePath}')\r\n`);
        } catch {
            vscode.window.showErrorMessage('Something went wrong.');
            setTerminalFlag();
        }
    }
);

export const downloadFile = vscode.commands.registerCommand(
    'qpy-ide.downloadFile',
    (fileUri: vscode.Uri) => {
        try {
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
                setTerminalFlag(true, cmd.downloadFile);
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
                                    dataLen: splitData.length,
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
                
                moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
                moduleFsTreeProvider.refresh();
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
                setTerminalFlag(true, cmd.createDir);
                st.handleInput(`${cmd.createDir}uos.mkdir('${fullFilePath}')\r\n`);
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

export const registerCommands = (context: vscode.ExtensionContext): void => {
    context.subscriptions.push(
        openConnection,
        closeConnection,
        setLineEndCommand,
        toggleHexTranslationCommand,
        clearCommand,
        downloadFile,
        clearFirmware,
        refreshModuleFs,
        runScript,
        removeFile,
        removeDir,
        createDir,
    );
};
