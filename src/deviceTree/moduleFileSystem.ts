import * as vscode from 'vscode';
import * as path from 'path';

export class ModuleFileSystemProvider implements vscode.TreeDataProvider<ModuleDocument> {
	private _onDidChangeTreeData: vscode.EventEmitter<ModuleDocument | undefined | void> = new vscode.EventEmitter<ModuleDocument | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ModuleDocument | undefined | void> = this._onDidChangeTreeData.event;

	private _data: ModuleDocument[];

	constructor() {
        this._data = [];
	}

	public get data() {
		return this._data;
	}

	public set data(newData: ModuleDocument[]) {
		this._data = newData;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ModuleDocument): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ModuleDocument|undefined): vscode.ProviderResult<ModuleDocument[]> {
        if (element === undefined) {
            return this._data;
        }

        return element.children;
    }
}

export class ModuleDocument extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly size: string,
        public readonly filePath: string,
        public children?: ModuleDocument[]
	) {
		super(
            label,
            children === undefined ? vscode.TreeItemCollapsibleState.None :
                                 vscode.TreeItemCollapsibleState.Collapsed
        );

		this.tooltip = children === undefined ? this.label : `${this.label} ${this.size}`;
		this.description = this.size;
        this.children = children;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', '..', 'resources', 'light', !this.children ? this.label.includes('.py') ? 'python.svg' : 'document.svg' : 'folder.svg'),
		dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', !this.children ? this.label.includes('.py') ? 'python.svg' : 'document.svg' : 'folder.svg')
	};

	contextValue = 'moduleDocument';
}