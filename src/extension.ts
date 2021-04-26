import * as vscode from 'vscode';

import FirmwareViewProvider from './sidebar/firmwareSidebar';
import SerialTerminal from './serial/serialTerminal';
import { 
	moduleFsTreeProvider,
	fwProvider,
	initStatusButtons
} from './api/userInterface';
import {
	clearCommand,
	clearFirmware,
	createDir,
	downloadFile,
	openConnection,
	refreshModuleFs,
	removeDir,
	removeFile,
	runScript,
	setLineEndCommand,
	toggleHexTranslationCommand
} from './api/commands';

// lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};
// exported context
export let contextUri: vscode.Uri;

export function activate(context: vscode.ExtensionContext) {
	contextUri = context.extensionUri;

	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);

	initStatusButtons();

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
}

export function deactivate() {}
