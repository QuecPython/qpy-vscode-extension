import * as vscode from 'vscode';

class TreeDataProvider1 implements vscode.TreeDataProvider<TreeItem> {
	onDidChangeTreeData?: vscode.Event<TreeItem|null|undefined>|undefined;

	data: TreeItem[];

	constructor() {
	  this.data = [
        new TreeItem(
            'Quectel', [
		        new TreeItem('Home'),
                new TreeItem('Quectel'),
                new TreeItem('Docs')
            ]),
		new TreeItem(
			'Tools', [
                new TreeItem('Terminal'), 
                new TreeItem('Change Log')
            ])
	  ];
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



class QuickItem extends vscode.TreeItem {
    customChildren: QuickItem[] | undefined;

    constructor(
        label: string,
        command?: string,
        args?: any[],
        collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
        children?: QuickItem[]
    ) {
        super(label, collapsibleState);
        if (command) {
        this.command = {
            title: label,
            command,
            arguments: args,
        };
        }
        this.customChildren = children;
    }
}

export default class TreeDataProvider {
    getChildren(element) {
      if (element && element.customChildren) {
        return element.customChildren;
      }
      return [
        new QuickItem(
          'Quectel',
          undefined,
          undefined,
          vscode.TreeItemCollapsibleState.Expanded,
          [
            new QuickItem('Projects Page', 'qpy-ide.homePage'),
            new QuickItem('Components', 'platformio-ide.showHome'),
            new QuickItem('Docs', 'platformio-ide.showHome'),
          ],
        ),
        new QuickItem(
          'Tools',
          undefined,
          undefined,
          vscode.TreeItemCollapsibleState.Expanded,
          [
            new QuickItem('Terminal', 'platformio-ide.showHome'),
          ],
        ),
      ];
    }

    getTreeItem(element) {
      return element;
    }
  }