import * as vscode from 'vscode';

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
          arguments: args};
        }
        this.customChildren = children;
      }
}

// QuickAccess side bar items
export default class QuickAccessProvider {
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
            new QuickItem('Projects + Components', 'qpy-ide.projectsPage'),
          ],
        ),
      ];
    }

    getTreeItem(element) {
      return element;
    }
  }
