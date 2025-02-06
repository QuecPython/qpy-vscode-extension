import * as vscode from 'vscode';

import SerialTerminal from './serial/serialTerminal';
import { moduleFsTreeProvider, initStatusButtons, initPythonPath, log, openLog, closeLog, activateEnv } from './api/userInterface';
import { registerCommands } from './api/commands';
import FirmwareViewProvider from './sidebar/firmwareSidebar';

// lookup table for linking vscode terminals to SerialTerminal instances
export const terminalRegistry: { [key: string]: SerialTerminal } = {};
// exported context
export let fwProvider: FirmwareViewProvider;

export async function activate(context: vscode.ExtensionContext) {
	log(`${new Date().toLocaleString()} - registerTreeDataProvider activated`);
	vscode.window.registerTreeDataProvider('qpyModuleFS', moduleFsTreeProvider);
	vscode.window.registerTreeDataProvider('nodeDependencies', new TreeDataProvider());
	vscode.window.registerTreeDataProvider('nodeDependenciestwo', new TreeDataProvider());
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


class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
	onDidChangeTreeData?: vscode.Event<TreeItem|null|undefined>|undefined;
  
	data: TreeItem[];
  
	constructor() {
	  this.data = [new TreeItem('cars', [
		new TreeItem(
			'Ford', [new TreeItem('Fiesta'), new TreeItem('Focus'), new TreeItem('Mustang')]),
		new TreeItem(
			'BMW', [new TreeItem('320'), new TreeItem('X3'), new TreeItem('X5')])
	  ])];
	}
  
	getTreeItem(element: TreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
	  return element;
	}
  
	getChildren(element?: TreeItem|undefined): vscode.ProviderResult<TreeItem[]> {
	  if (element === undefined) {
		return this.data;
	  }
	  return element.children;
	}
  }
  
  class TreeItem extends vscode.TreeItem {
	children: TreeItem[]|undefined;
  
	constructor(label: string, children?: TreeItem[]) {
	  super(
		  label,
		  children === undefined ? vscode.TreeItemCollapsibleState.None :
								   vscode.TreeItemCollapsibleState.Expanded);
	  this.children = children;
	}
  }