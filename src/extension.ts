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
    context.subscriptions.push(
    vscode.commands.registerCommand('catCoding.start', () => {
      const resourcesDir = vscode.Uri.joinPath(context.extensionUri)

      const panel = vscode.window.createWebviewPanel(
        'catCoding',
        'Cat Coding',
        vscode.ViewColumn.One,
        {
        }
      );

      // Get path to resource on disk
      const onDiskPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'cat.gif');
      console.log('onDiskPath ' + onDiskPath);


      // And get the special URI to use with the webview
      const catGifSrc = panel.webview.asWebviewUri(onDiskPath);
      let filePath = panel.webview.asWebviewUri(onDiskPath);

		  const workspaceFolderUri = vscode.workspace.workspaceFolders?.[0]?.uri;

      if (workspaceFolderUri) {
        // Construct the full path to 'media/one.jpg' within the workspace folder
        const imageOnDiskPath = vscode.Uri.joinPath(workspaceFolderUri, 'media', '20250425131903.jpg');

        // Convert this local URI to a special URI that the webview can use
        filePath = panel.webview.asWebviewUri(imageOnDiskPath);
      }

      console.log('catGifSrc ' + catGifSrc);
      panel.webview.html = getWebviewContent(catGifSrc, filePath);
    })
  );

    enableAutoComplete();

	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);
	vscode.window.registerTreeDataProvider('quickAccess', new QuickAccessProvider());
	fwProvider = new FirmwareViewProvider(context.extensionUri);
	initStatusButtons();
	registerCommands(context);
	console.log("QuecPyhton activate success");
}

function getWebviewContent(catGifSrc: vscode.Uri, filePath: vscode.Uri) {
    let t = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cat Coding</title>
</head>
<body>
    <img src="${catGifSrc}" width="300" />
    <img src="${filePath}" width="300" />
</body>
</html>`;
    return t;
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
