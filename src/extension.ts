import * as vscode from 'vscode';

import SerialTerminal from './serial/serialTerminal';
import { moduleFsTreeProvider, initStatusButtons } from './api/userInterface';
import { registerCommands } from './api/commands';
import FirmwareViewProvider from './sidebar/firmwareSidebar';

// lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};
// exported context
export let fwProvider: FirmwareViewProvider;

export function activate(context: vscode.ExtensionContext) {
	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);
	fwProvider = new FirmwareViewProvider(context.extensionUri);

	initStatusButtons();
	registerCommands(context);
}

export function deactivate() {}