import * as vscode from 'vscode';

import SerialTerminal from './serial/serialTerminal';
import { moduleFsTreeProvider, initStatusButtons } from './api/userInterface';
import { registerCommands } from './api/commands';

// lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};

export function activate(context: vscode.ExtensionContext) {

	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);

	initStatusButtons();
	registerCommands(context);
}

export function deactivate() {}
