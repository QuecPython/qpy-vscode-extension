import * as vscode from 'vscode';
import path from 'path';
import { log } from '../api/userInterface';

import * as html from '../packagePanel/html';
import * as currentProject from '../packagePanel/currentProject';
import * as history from '../packagePanel/panelHistory';
import axios from 'axios';
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { makerFile } from '../utils/constants';
import { createMarkdownText }  from '../utils/utils';

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
        // Enable javascript in the webview
        enableScripts: true,

        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    };
}

// Manages webview html panels
export class HtmlPanel {
    /*
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: HtmlPanel | undefined;

    public static readonly viewType = 'html';
    private subModules: string; // used for project subModules

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, page: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        // if (HtmlPanel.currentPanel) {
        // 	HtmlPanel.currentPanel._panel.reveal(column);
        // 	return;
        // }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            HtmlPanel.viewType,
            'Loading...',
            column || vscode.ViewColumn.One,
            getWebviewOptions(extensionUri),
        );

        HtmlPanel.currentPanel = new HtmlPanel(panel, extensionUri, page);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, page: string) {
        HtmlPanel.currentPanel = new HtmlPanel(panel, extensionUri, page);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, page: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update(page);

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            async () => {
                if (this._panel.visible) {
                    await this._update(page);
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the html panel
        this._panel.webview.onDidReceiveMessage(
            message => {
                const dialogOptions: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    openLabel: 'Select',
                    canSelectFiles: false,
                    canSelectFolders: true,
                };
                let readmeUrl: string, submodulesUrl: string, project: any;

                const gitOptions: Partial<SimpleGitOptions> = {
                    baseDir: process.cwd(),
                    binary: 'git',
                    maxConcurrentProcesses: 6,
                    trimmed: false,
                 };
                
                const git: SimpleGit = simpleGit(gitOptions);

                switch (message.command) {
                    case 'logData':
                        log(`logData: ${JSON.stringify(message)}`);
                        return;
                    case 'openUrl':
                        vscode.env.openExternal(vscode.Uri.parse(message.value));
                        return;
                    case 'homeButton':
                        // return to home page
                        this._update(page, 'homeButton');
                        return
                    case 'backButton':
                        // return to home page
                        history.getLastStep();
                        let lastStep = history.getLastStep();

                        if (lastStep.page == 'projectsPage') {
                            this._update(lastStep.page, 'homeButton');
                        } else if (lastStep.page == 'currentProjectPage') {
                            this._update(lastStep.page);
                        } else {
                            this._getReadme(lastStep.page, lastStep.submodulesUrl, lastStep.projectId);
                        }
                        return;
                    case 'newProjectClick':
                        vscode.window.showOpenDialog(dialogOptions).then(fileUri => {
                            // Check if user cancelled the dialog
                            if (!fileUri || fileUri.length === 0) {
                                vscode.window.showInformationMessage('Operation cancelled by user.');
                                return; // User cancelled, do nothing
                            }
                            
                            const uri = vscode.Uri.file(fileUri[0].fsPath);
                            vscode.commands.executeCommand('vscode.openFolder', uri, true);
                        });
                        return
                    case 'importClick':
                        // clone a project to a selected path
                        this._importClick(git, dialogOptions, message);
                        return;
                    case 'removeComponentClick':
                        this._remvoeSubmodule(message.value);
                        return;
                    case 'viewComponentClick':
                        this._viewSubmodule(message.value, message.source);
                        return;
                    case 'viewChineseClick':
                        project = html.projectsInfo[message.value];
    
                        // if we have a component, not a project
                        if (project == undefined) {
                            project = html.componentsInfo[message.value];
                        }

                        readmeUrl = 'https://raw.githubusercontent.com/QuecPython/' + project.name + '/' + project.default_branch + '/README.zh.md';
                        submodulesUrl = 'https://raw.githubusercontent.com/QuecPython/' + project.name + '/refs/heads/' + project.default_branch + '/.gitmodules';

                        // build readme file for a project
                        this._getReadme(readmeUrl, submodulesUrl, message.value);
                        return;
                    case 'viewClick':
                        project = html.projectsInfo[message.value];

                        // if we have a component, not a project
                        if (project == undefined) {
                            project = html.componentsInfo[message.value];
                        }

                        readmeUrl = 'https://raw.githubusercontent.com/QuecPython/' + project.name + '/' + project.default_branch + '/README.md';
                        submodulesUrl = 'https://raw.githubusercontent.com/QuecPython/' + project.name + '/refs/heads/' + project.default_branch + '/.gitmodules';

                        // build readme file for a project
                        this._getReadme(readmeUrl, submodulesUrl, message.value);
                        return;
                    case 'addToProject':
                        this._addToProject(message.value);
                        return;
                    case 'viewComponent':
                        let component = html.componentsInfo[message.value];
                        readmeUrl = 'https://raw.githubusercontent.com/QuecPython/' + component.name + '/' + component.default_branch + '/README.md';
                        submodulesUrl = 'https://raw.githubusercontent.com/QuecPython/' + component.name + '/refs/heads/' + component.default_branch + '/.gitmodules';

                        // build readme file for a project
                        this._getReadme(readmeUrl, submodulesUrl, message.value);
                        return;
                    case 'viewCurrentReadme':
                        // open readme file from the current project
                        let workspaceFolders = vscode.workspace.workspaceFolders;
                        const firstWorkspaceFolder = workspaceFolders[0];
                        const rootPath = firstWorkspaceFolder.uri; // This is a vscode.Uri
                        const readmeUri = vscode.Uri.joinPath(rootPath, 'README.md');
                        vscode.commands.executeCommand('vscode.open', readmeUri, { preview: false });
                        return;
                    case 'viewCurrentTabReadme':
                        // inside current proejct, view readme with another language
                        this._update('currentProjectPage', message.value);
                        return;

                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
                return;
            }
        );
    }

    private async _addToProject(componentId: string) {
        // import submodule to current project

        let component = html.componentsInfo[componentId];

        // create git with workspace folder
        const git = simpleGit({ baseDir:  vscode.workspace.workspaceFolders[0].uri.fsPath});
        await git.init();
        vscode.window.showInformationMessage('Cloning component...');
        
        await git.subModule(['add', '-f', component.clone_url]).then((response) => {
            vscode.window.showInformationMessage('Cloning completed!');
        }).catch((error) => {
            vscode.window.showErrorMessage('Cloning error, please try again later!');
            console.error('Error adding submodule repository:', error);
        });
    }

    private async _remvoeSubmodule(componentName: string) {
        // Show confirmation dialog
        const result = await vscode.window.showWarningMessage(
            'Are you sure you want to remove this component from the project?',
            { modal: true },
            'Yes, Remove'
        );

        if (result !== 'Yes, Remove') {
            vscode.window.showInformationMessage('Operation cancelled by user.');
            return; // User cancelled
        }

        // Proceed with removal
        try {
            const git = simpleGit({ baseDir: vscode.workspace.workspaceFolders[0].uri.fsPath });
                     
            // git submodule deinit -f <modules>
            await git.subModule(['deinit', '-f', componentName]);
            
            // git rm -f <modules>
            await git.raw(['rm', '-f', componentName]);
            
            vscode.window.showInformationMessage('Component removed successfully!');
            
            // Refresh the current project view to show updated component list
            await this._update('currentProjectPage');
        } catch (error) {
            vscode.window.showErrorMessage('Error removing component');
            console.error('Error removing submodule:', error);
        }
    }

    private _viewSubmodule(repoUrl: string, source?: string) {
        // get default_branch for repo
        const start = repoUrl.indexOf('.com/') + 5; // Find the position after '.com/'
        const end = repoUrl.indexOf('.git'); // Find the position of '.git'
        const repoName = repoUrl.substring(start, end);

        let url = `https://api.github.com/repos/${repoName}`;
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: url,
            headers: {}
        };

        axios.request(config).then((response) =>{
            let repo = response.data;

            let readmeUrl = 'https://raw.githubusercontent.com/' + repoName + '/' + repo.default_branch + '/README.md';
            let submodulesUrl = 'https://raw.githubusercontent.com/' + repoName + '/refs/heads/' + repo.default_branch + '/.gitmodules';

            // build readme file for a project
            this._getReadme(readmeUrl, submodulesUrl, repo.id, source);
        }).catch((error) =>{
            log(`Error fetching subModule info: ${error}`);
            vscode.window.showErrorMessage('Error fetching subModule, please try again later.');
        });
    }

    public dispose() {
        /* when closing the panel */
        HtmlPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update(page: string, source?: string) {
        // update html panel home page, on page is loaded add content

        const webview = this._panel.webview;

        switch (page) {
            case 'projectsPage':
                // for new panel we clear steps
                if (source != 'homeButton') {
                    history.clearSteps();
                }
                history.addStep('projectsPage');

                vscode.window.showInformationMessage('Loading projects...');
                await html.getProjects(this, webview, page);
                return;
            case 'currentProjectPage':
                history.addStep('currentProjectPage');

                vscode.window.showInformationMessage('Checking Current Project...');
                await currentProject.getCurrentProject(this, page, source);

                return;
        }
    }

    private _importClick(git, dialogOptions, message) {

        vscode.window.showOpenDialog(dialogOptions).then(fileUri => {
            // Check if user cancelled the dialog
            if (!fileUri || fileUri.length === 0) {
                vscode.window.showInformationMessage('Operation cancelled by user.');
                return;
            }
            
            // Use progress bar instead of simple message
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Cloning project...",
                cancellable: false
            }, async (progress, token) => {
                let project = html.projectsInfo[message.value];
                let repoPath = fileUri[0].fsPath + '\\' + project.name;
                let options = ['--recurse-submodules'];
                
                // if user choose a certain release
                if (message.release != 'Releases') {
                    options.push('--branch', message.release);
                }

                progress.report({ increment: 10, message: "Initializing..." });

                try {
                    progress.report({ increment: 30, message: "Downloading files..." });
                    
                    // clone the project and open a new folder with the new repo
                    await git.clone(project.clone_url, repoPath, options);
                    
                    progress.report({ increment: 50, message: "Setting up project..." });
                    
                    const uri = vscode.Uri.file(repoPath);
                    
                    // mark the folder as QuecPython project
                    const markerFileUri = vscode.Uri.file(path.join(uri.fsPath, makerFile));
                    await vscode.workspace.fs.writeFile(markerFileUri, Buffer.from(JSON.stringify({
                        managedBy: 'QuecPython.qpy-ide',
                        createdAt: new Date().toISOString()
                    }, null, 2)));

                    progress.report({ increment: 10, message: "Finalizing..." });
                    
                    vscode.window.showInformationMessage('Project cloned successfully!');
                    vscode.commands.executeCommand('vscode.openFolder', uri, true);
                } catch (error) {
                    vscode.window.showErrorMessage('Error cloning repository');
                    console.error('Error cloning repository:', error);
                }
            });
        });

    }
    private _getReadme(readmeUrl: string, submodulesUrl: string, projectId = '', source?: string) {
        // get readme page from git using url, with submodules list

        history.addStep(readmeUrl, submodulesUrl, projectId);
        vscode.window.showInformationMessage('Loading readme...');
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: readmeUrl,
            headers: { }
        };

        let config1 = {
            method: 'get',
            maxBodyLength: Infinity,
            url: submodulesUrl,
            headers: { }
        };

        Promise.allSettled([
            axios.request(config),
            axios.request(config1)
        ])
        .then(results => {
            let readmeData: string, submodulesData: string = '[]';
            results.forEach((result, index) => {
                if (result.status == 'fulfilled') {
                    // get project
                    let project = html.projectsInfo[projectId];

                    // if we have a component, not a project
                    if (project == undefined) {
                        project = html.componentsInfo[projectId];
                    }
                    
                    // first item is readme
                    if (index == 0) {
                        readmeData = result.value.data;
                        // prepare the text for MD
                        readmeData = createMarkdownText(readmeData, false, project);

                    }
                    // second item is components
                    else {
                        submodulesData = this._extractComponents(result.value.data);
                    }
                }
            })

            html.setMd(readmeData, submodulesData, this.subModules, source);
            let webview = this._panel.webview;
            this._updatePanel('mdFile', html.mdFile);
        });
    }

    private _extractComponents(text: string): string {
        /* return list of submodules to show them as a list in readme page  */

        const urlRegex = /url = (https:\/\/github\.com\/[^\s]+)/g;
        const components: string[] = [];
        const subModules: string[] = [];
        let match;
    
        while ((match = urlRegex.exec(text)) !== null) {
            subModules.push(match[1]);
            const repoName = match[1].replace('.git', '').split('/').pop();
            components.push(repoName);
        }
        let components_string = '\[' + components.map(item => `\"${item}\"`).join(', ') + '\]';
        this.subModules = '\[' + subModules.map(item => `\"${item}\"`).join(', ') + '\]';
        return components_string;
    }
        
    public async _updatePanel(page: string, text: string) {
        /* update html panel with project page, current project page or readme page */

        switch (page) {
            case 'projectsPage':
                this._panel.title = 'Projects + Components';		
                this._panel.webview.html = text;
                break
            case 'mdFile':
                this._panel.title = 'README.md';
                this._panel.webview.html = text;
                break
            case 'currentProjectPage':
                this._panel.title = 'Current Project';
                this._panel.webview.html = text;
                break
        }
    }
}
