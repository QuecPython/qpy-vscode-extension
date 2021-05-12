import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { progressBar } from '../api/progressBar';

import { getActiveSerial, setTerminalFlag } from '../api/terminal';
import { findTreeNode, initTree, removeTreeNodeByPath, sortTreeNodes } from '../api/treeView';
import { moduleFsTreeProvider, setButtonStatus, connStatus} from '../api/userInterface';
import { ModuleDocument } from '../deviceTree/moduleFileSystem';
import { cmd } from '../utils/constants';
import * as utils from '../utils/utils';

class SerialEmitter extends EventEmitter {}

export const serialEmitter = new SerialEmitter();

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
    try {
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
                moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
                moduleFsTreeProvider.refresh();
            }
            setTerminalFlag();
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
    
        moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
        setTerminalFlag();
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
        const parsedData = utils.extractFilePath(data);
        removeTreeNodeByPath(moduleFsTreeProvider.data, parsedData);
        moduleFsTreeProvider.refresh();
        setTerminalFlag();
    } catch {
        setTerminalFlag();
        vscode.window.showErrorMessage('Failed to remove the specified directory.');
    }
});

serialEmitter.on(`${cmd.removeFile}`, (data: string) => {
    try {
        if (data.includes('Traceback')) {
            vscode.window.showErrorMessage('Unable to remove file.');
            return;
        }
        const parsedData = utils.extractFilePath(data);
        removeTreeNodeByPath(moduleFsTreeProvider.data, parsedData);
        moduleFsTreeProvider.refresh();
        setTerminalFlag();
    } catch {
        setTerminalFlag();
        vscode.window.showErrorMessage('Failed to remove the specified file.');
    }
});

serialEmitter.on(`${cmd.downloadFile}`, (data: string) => {
    try {
        if (data.includes('close')) {
            moduleFsTreeProvider.data = sortTreeNodes(moduleFsTreeProvider.data);
            setTerminalFlag();
        }
    } catch {
        setTerminalFlag();
        vscode.window.showErrorMessage('Failed to download the file.');
    }
});

serialEmitter.on('startProgress', () => {
    progressBar();
});
