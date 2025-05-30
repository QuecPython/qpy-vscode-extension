import * as vscode from 'vscode';

import SerialTerminal from './serial/serialTerminal';
import { moduleFsTreeProvider, initStatusButtons, log, enableAutoComplete } from './api/userInterface';
import { registerCommands } from './api/commands';
import FirmwareViewProvider from './sidebar/firmwareSidebar';
import QuickAccessProvider from './sidebar/quicAccess';
import path from 'path';

// lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};
// exported context
export let fwProvider: FirmwareViewProvider;

export async function activate(context: vscode.ExtensionContext) {
    enableAutoComplete();

	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);
	vscode.window.registerTreeDataProvider('quickAccess', new QuickAccessProvider());
	fwProvider = new FirmwareViewProvider(context.extensionUri);
	initStatusButtons();
	registerCommands(context);
	console.log("QuecPyhton activate success");
}

export async function deactivate(context: vscode.ExtensionContext): Promise<void> {
    // disable auto complete when extension is disabled
    const stubsPath = path.join(__filename, '..', '..', 'snippets', 'quecpython_stubs');
    const pylanceConfig = vscode.workspace.getConfiguration('python.analysis');

    let extraPaths = pylanceConfig.get<string[]>('extraPaths') || [];
    if (extraPaths.includes(stubsPath)) {
        extraPaths = extraPaths.filter(item => item != stubsPath);
        
        await pylanceConfig.update('extraPaths', extraPaths, vscode.ConfigurationTarget.Global)
            .then(() => {
                log('Pylance setting updated successfully');
            }, (error) => {
                log(`Failed to update Pylance setting: ${error}`);
        });
    }
}
