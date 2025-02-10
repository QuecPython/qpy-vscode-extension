import * as vscode from 'vscode';

import SerialTerminal from './serial/serialTerminal';
import { moduleFsTreeProvider, initStatusButtons, initPythonPath, log, openLog, closeLog, activateEnv } from './api/userInterface';
import { registerCommands } from './api/commands';
import FirmwareViewProvider from './sidebar/firmwareSidebar';
import TreeDataProvider from './sidebar/quicAccess';

// lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};
// exported context
export let fwProvider: FirmwareViewProvider;

export async function activate(context: vscode.ExtensionContext) {
	log(`${new Date().toLocaleString()} - registerTreeDataProvider activated`);
	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);
	vscode.window.registerTreeDataProvider('nodeDependencies', new TreeDataProvider());
	vscode.window.registerTreeDataProvider('quickAccess', new TreeDataProvider());
	vscode.window.registerTreeDataProvider('commandsList', new TreeDataProvider());
	fwProvider = new FirmwareViewProvider(context.extensionUri);
	openLog();
	initStatusButtons();
	initPythonPath(); // used for autocomplete 
	registerCommands(context);
	// activateEnv();
	console.log("QuecPyhton activate success");

}

export function deactivate() {
	closeLog;
}
