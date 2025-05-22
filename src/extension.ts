import * as vscode from 'vscode';

import SerialTerminal from './serial/serialTerminal';
import { moduleFsTreeProvider, initStatusButtons, log, openLog, closeLog } from './api/userInterface';
import { registerCommands } from './api/commands';
import FirmwareViewProvider from './sidebar/firmwareSidebar';
import QuickAccessProvider from './sidebar/quicAccess';
import path from 'path';

// lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};
// exported context
export let fwProvider: FirmwareViewProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('activate');

    const stubsPath = path.join(__filename, '..', '..', 'snippets', 'quecpython_stubs');

    log(stubsPath);
    
    const pylanceConfig = vscode.workspace.getConfiguration('python.analysis');
    // log(pylanceConfig);

    let extraPaths = pylanceConfig.get<string[]>('extraPaths') || [];
    
    if (!extraPaths.includes(stubsPath)) {
        extraPaths.push(stubsPath);
        pylanceConfig.update('extraPaths', extraPaths, vscode.ConfigurationTarget.Global)
            .then(() => {
                vscode.window.showInformationMessage('Pylance extraPaths updated successfully');
            }, (error) => {
                vscode.window.showErrorMessage(`Failed to update Pylance setting: ${error}`);
        });
    }

    // if (extraPaths.includes(stubsPath)) {
    //     extraPaths = extraPaths.filter(item => item != stubsPath);
    //     pylanceConfig.update('extraPaths', extraPaths, vscode.ConfigurationTarget.Global)
    //         .then(() => {
    //             vscode.window.showInformationMessage('Pylance extraPaths updated successfully');
    //         }, (error) => {
    //             vscode.window.showErrorMessage(`Failed to update Pylance setting: ${error}`);
    //     });
    // }    

    // Register the completion item provider
    // let disposable = vscode.languages.registerCompletionItemProvider(
    //     { scheme: 'file', language: 'python' }, // Replace 'yourCustomLanguageId' with the ID you defined in package.json
    //     {
    //         provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    //             // This function will be called when VS Code needs completion items
    //             const linePrefix = document.lineAt(position).text.substr(0, position.character);

    //             // Create an array to hold our completion items
    //             const completionItems: vscode.CompletionItem[] = [];

    //             // --- Your logic to determine completion items goes here ---

    //             return completionItems;
    //         }
    //     },
    //     // Optional: Define characters that trigger completion (e.g., '.')
    //     '.'
    // );

	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);
	vscode.window.registerTreeDataProvider('quickAccess', new QuickAccessProvider());
	fwProvider = new FirmwareViewProvider(context.extensionUri);
	// openLog();
	initStatusButtons();
	registerCommands(context);
	console.log("QuecPyhton activate success");
}

export async function deactivate(context: vscode.ExtensionContext): Promise<void> {
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

	closeLog;
}

