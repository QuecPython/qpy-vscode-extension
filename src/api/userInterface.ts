import * as vscode from 'vscode';
import { ModuleFileSystemProvider } from '../deviceTree/moduleFileSystem';
import { contextUri } from '../extension';
import FirmwareViewProvider from '../sidebar/firmwareSidebar';

export const setButtonDownload = (downloadScript: vscode.StatusBarItem): void => {
	downloadScript.text = `$(arrow-down) Download File`;
	downloadScript.tooltip = `Download active file to module`;
};

export const setButtonStatus = (connStatus: vscode.StatusBarItem, status: boolean): void => {
	if (status) {
		connStatus.text = `$(plug) Connected`;
		connStatus.tooltip = 'COM Port is connected';
	} else {
		connStatus.text = `$(plug) Disconnected`;
		connStatus.tooltip = 'COM Port not connected';
	}
};

export const initStatusButtons = (): void => {
	setButtonDownload(downloadScript);
	downloadScript.show();
	downloadScript.command = 'qpy-ide.downloadFile';

	setButtonStatus(connStatus, false);
	connStatus.show();
};

export const connStatus = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
);

export const downloadScript = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
);

export const moduleFsTreeProvider = new ModuleFileSystemProvider();

export const fwProvider = new FirmwareViewProvider(contextUri);