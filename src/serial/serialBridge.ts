import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { progressBar } from '../api/progressBar';

import { getActiveSerial, setTerminalFlag } from '../api/terminal';
import { findTreeNode, initTree, insertTreeNodeChild, removeTreeNodeByName, removeTreeNodeByPath, sortTreeNodes } from '../api/treeView';
import { moduleFsTreeProvider, setButtonStatus, connStatus} from '../api/userInterface';
import { ModuleDocument } from '../deviceTree/moduleFileSystem';
import { DownloadResponse } from '../types/types';
import { cmd, status } from '../utils/constants';

let listBuffer: string;

class SerialEmitter extends EventEmitter {}

export const serialEmitter = new SerialEmitter();

// serial emitter events
serialEmitter.on(status.conn, () => {
	setButtonStatus(connStatus, true);
});

serialEmitter.on(status.disc, () => {
	setButtonStatus(connStatus, false);
	moduleFsTreeProvider.data = [];
	moduleFsTreeProvider.refresh();
});

serialEmitter.on(`${cmd.ilistdir}`, (data: string) => {
	listBuffer += data;
	try {
		let stringToParse: string;
		if (data.includes(`remove`)) {
			const splitData = listBuffer.split(/\r\n/);
			splitData.forEach((dataLine: string) => {
				if (dataLine.includes('[{')) {
					stringToParse = dataLine;
				}
			});

			if (typeof stringToParse !== 'undefined') {
				stringToParse = stringToParse.replace(/'/g, '"');
				const dataArr = JSON.parse(stringToParse);
				listBuffer = '';
				moduleFsTreeProvider.data = initTree(dataArr);
				moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
				moduleFsTreeProvider.refresh();
			}
			setTimeout(() => setTerminalFlag(), 125);
		}
	} catch {
		setTerminalFlag();
		vscode.window.showErrorMessage('Failed to list files.');
	}
});

serialEmitter.on(`${cmd.runScript}`, (data: string) => {
	try {
		setTerminalFlag();

		const jointData = data.split(/\r\n/).slice(2).join('\r\n');
		const st = getActiveSerial();
		st.handleDataAsText(`${jointData}`);
	} catch {
		setTerminalFlag();
		vscode.window.showErrorMessage('Failed to execute script.');
	}
});

serialEmitter.on(`${cmd.createDir}`, (data: string) => {
	try {
		if (data.includes('Traceback')) {
			vscode.window.showErrorMessage('Unable to create directory.');
			return;
		}

		if (data.includes(cmd.createDir)) {
			const parsedData = data.substring(5).split('/').slice(1);
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

			moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
			setTerminalFlag();
		}
	} catch {
		setTerminalFlag();
		vscode.window.showErrorMessage('Failed to create the specified directory.');
	}
});

serialEmitter.on(`${cmd.removeDir}`, (data: string) => {
	try {
		if (data.includes('Traceback')) {
			vscode.window.showErrorMessage('Unable to remove directory.');
			return;
		}
		if (data.includes(cmd.removeDir)) {
			const parsedData = data.substring(5);
			removeTreeNodeByPath(moduleFsTreeProvider.data, parsedData);
			moduleFsTreeProvider.refresh();
			setTimeout(() => setTerminalFlag(), 100);
		}
	} catch {
		setTerminalFlag();
		vscode.window.showErrorMessage('Failed to remove the specified directory.');
	}
});

serialEmitter.on(`${cmd.removeFile}`, (data: string) => {
	try {
		if (data.includes('Traceback')) {
			vscode.window.showErrorMessage('Unable to remove file.');
			setTerminalFlag();
			return;
		}

		if (data.includes(cmd.removeFile)) {
			const parsedData = data.substring(5);
			removeTreeNodeByPath(moduleFsTreeProvider.data, parsedData);
			moduleFsTreeProvider.refresh();
			setTimeout(() => setTerminalFlag(), 100);
		}
	} catch {
		setTerminalFlag();
		vscode.window.showErrorMessage('Failed to remove the specified file.');
	}
});

serialEmitter.on(`${cmd.downloadFile}`, (data: DownloadResponse) => {
    const st = getActiveSerial();
    try {
        if (data.code.includes('0')) {
            st.serial.open();
            removeTreeNodeByName(data.fileData.filename, moduleFsTreeProvider.data);

            moduleFsTreeProvider.data.push(
                new ModuleDocument(
                    data.fileData.filename,
                    `${data.fileData.fileSizeInBytes} B`,
                    `${data.parentPath}/${data.fileData.filename}`
                )
            );

            moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
            moduleFsTreeProvider.refresh();
        }

        if (data.code.includes('1')) {
            st.serial.open();
            vscode.window.showErrorMessage('Failed to download the file.');
        }
    } catch {
        st.serial.open();
        vscode.window.showErrorMessage('Internal error while executing file download.');
    }
});

serialEmitter.on(`${cmd.selectiveDownFile}`, (data: DownloadResponse) => {
    const st = getActiveSerial();
    try {
        if (data.code.includes('0')) {
            st.serial.open();
            removeTreeNodeByName(data.fileData.filename, moduleFsTreeProvider.data);

            const newNode = new ModuleDocument(
                data.fileData.filename,
                `${data.fileData.fileSizeInBytes} B`,
                `${data.fileData.fileSizeInBytes}/${data.fileData.filename}`
            );

            insertTreeNodeChild(moduleFsTreeProvider.data, data.parentPath, newNode);
            moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
            moduleFsTreeProvider.refresh();
        }

        if (data.code.includes('1')) {
            st.serial.open();
            vscode.window.showErrorMessage('Failed to download the file.');
        }
    } catch {
        st.serial.open();
        vscode.window.showErrorMessage('Internal error while executing file download.');
    }
});

serialEmitter.on(status.startProg, () => {
	progressBar();
});
