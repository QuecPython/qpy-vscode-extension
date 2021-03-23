import * as vscode from 'vscode';
import * as path from 'path';

export class ModuleFileSystemProvider implements vscode.TreeDataProvider<ModuleDocument> {
	private _onDidChangeTreeData: vscode.EventEmitter<ModuleDocument | undefined | void> = new vscode.EventEmitter<ModuleDocument | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ModuleDocument | undefined | void> = this._onDidChangeTreeData.event;

	public data: ModuleDocument[];

	constructor() {
		this.data = [];
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ModuleDocument): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ModuleDocument): Thenable<ModuleDocument[]> {
		if (element) {
			return Promise.resolve(this.data);
		} else {
			return Promise.resolve(this.data);
		}
	}
}

export class ModuleDocument extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		private readonly size: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.label}-${this.size}`;
		this.description = this.size;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'document.svg'),
		dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'document.svg')
	};

	contextValue = 'moduleDocument';
}
