import * as vscode from 'vscode';
import { log } from '../api/userInterface';

import * as html from '../packagePanel/html';
import * as history from '../packagePanel/panelHistory';
import axios from 'axios';
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

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

    public static readonly viewType = 'Projects';
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
            'Proejcts',
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
                        } else {
                            this._getReadme(lastStep.page, lastStep.submodulesUrl, lastStep.projectId);
                        }
                        return
                    case 'newProjectClick':
                        vscode.window.showOpenDialog(dialogOptions).then(fileUri => {							
                            const uri = vscode.Uri.file(fileUri[0].fsPath);
                            vscode.commands.executeCommand('vscode.openFolder', uri, true);
                        });
                        return
                    case 'importClick':
                        vscode.window.showOpenDialog(dialogOptions).then(fileUri => {
                            project = html.projectsInfo[message.value];
                            let repoPath = fileUri[0].fsPath + '\\' + project.name;
                            let options = [];
                            if (message.release != 'Releases') {
                                options = ['--branch', message.release];
                            }
                            git.clone(project.clone_url, repoPath, options).then(() => {
                                vscode.window.showInformationMessage('Cloning project...');
                                try {
                                    const uri = vscode.Uri.file(repoPath);
                                    vscode.commands.executeCommand('vscode.openFolder', uri, true);
                                } catch (error) {
                                    vscode.window.showErrorMessage('Error cloning repository');
                                    console.error('Error cloning repository:', error);
                                }
                            }).catch((error) => {
                                vscode.window.showErrorMessage('Error cloning repository');
                                console.error('Error cloning repository:', error);
                            });
                        });
                        return;
                    case 'viewComponentClick':
                        this._viewSubmodule(message.value);
                        return;
                    case 'viewChineseClick':
                        project = html.projectsInfo[message.value];
                        readmeUrl = 'https://raw.githubusercontent.com/QuecPython/' + project.name + '/' + project.default_branch + '/README.zh.md';
                        submodulesUrl = 'https://raw.githubusercontent.com/QuecPython/' + project.name + '/refs/heads/' + project.default_branch + '/.gitmodules';

                        // build readme file for a project
                        this._getReadme(readmeUrl, submodulesUrl, message.value);
                        return;
                    case 'viewClick':
                        project = html.projectsInfo[message.value];
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

    private _viewSubmodule(repoUrl: string) {
        // get default_branch for repo
        const start = repoUrl.indexOf('.com/') + 5; // Find the position after '.com/'
        const end = repoUrl.indexOf('.git'); // Find the position of '.git'
        const repoName = repoUrl.substring(start, end);

        let url = `https://api.github.com/repos/${repoName}` ;
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: url,
            headers: {}
        };

        axios.request(config).then((response) =>{
            let project = response.data

            let readmeUrl = 'https://raw.githubusercontent.com/' + repoName + '/' + project.default_branch + '/README.md';
            let submodulesUrl = 'https://raw.githubusercontent.com/' + repoName + '/refs/heads/' + project.default_branch + '/.gitmodules';

            // build readme file for a project
            this._getReadme(readmeUrl, submodulesUrl, project.id);
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

    private async _update(page, source?: string) {
        // update html panel home page

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
        }
    }

    private _getReadme(readmeUrl: string, submodulesUrl: string, projectId = '') {
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

                    // if we have a component, not a proejct
                    if (project == undefined) {
                        project = html.componentsInfo[projectId];
                    }
                    
                    // first item is readme
                    if (index == 0) {
                        readmeData = result.value.data;

                        // files tree
                        let regex = /```plaintext\s([\s\S]*?)```/g;
                        readmeData = readmeData.replace(regex, (match, p1, p2) => {
                            match = match.replace('```plaintext', '');
                            return match.split('\n').join('<br>');
                        });

                        // bash text
                        regex = /```bash\s([\s\S]*?)```/g;
                        readmeData = readmeData.replace(regex, (match, p1, p2) => {
                            match = match.replace('```bash', '')
                            return match.split('\n').join('<br>')
                        });
                        
                        // python text
                        regex = /```python\s([\s\S]*?)```/g;
                        readmeData = readmeData.replace(regex, (match, p1, p2) => {
                            match = match.replace('```python', '')
                            return match.split('\n').join('<br>')
                        });

                        // img urls
                        regex = /!\[\]\((.*?)\)/g;
                        readmeData = readmeData.replace(regex, (match, p1, p2) => {
                          p1 = p1.replace('./','');
                          p1 = p1.replace('../','');
                          let imgUrl = `https://raw.githubusercontent.com/QuecPython/${project.name}/${project.default_branch}/${p1}`;
                          return `<img src="${imgUrl}" style="zoom:67%;" /><br>`;
                        });

                        // other urls
                        regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
                        let match;
                        while ((match = regex.exec(readmeData)) !== null) {
                            const phrase = readmeData.substring(match.index, regex.lastIndex);
                            const wordInBrackets = match[1];
                            const url = match[2];
                            readmeData.replace(phrase,`<a href="" onclick="vscode.postMessage({ command: 'openUrl' , value: '${url}' });">${wordInBrackets}</a>`);
                        }

                        // remove ` from text
                        readmeData = readmeData.split('`').join('');

                        // url for zh readme
                        readmeData = readmeData.replace(
                            '[中文](README.zh.md) | English',
                            `<a href="" onclick="vscode.postMessage({ command: 'viewChineseClick' , value: '${projectId}' });">中文</a> | English`
                        );

                        // url for en readme
                        readmeData = readmeData.replace(
                            '中文 | [English](README.md)',
                            `中文 | <a href="" onclick="vscode.postMessage({ command: 'viewClick' , value: '${projectId}' });">English</a>`
                        );

                        // Replace links with HTML anchor tags
                        regex = /- \[(.*?)\]\(#(.*?)\)/g;
                        readmeData = readmeData.replace(regex, (match, title, anchor) => {
                            return `- <a href='#${anchor.toLowerCase()}'>${title}</a>`;
                        });

                        // Replace headers HTML paragraph tags
                        regex = /(# )(.*)/g;
                        readmeData = readmeData.replace(regex, (match, p1, p2) => {
                            return `${p1}<p id="${p2.toLowerCase()}">${p2}</p>`;
                        });
                    }
                    // second item is components
                    else {
                        submodulesData = this._extractComponents(result.value.data);
                    }
                }
            })

            html.setMd(readmeData, submodulesData, this.subModules);
            let webview = this._panel.webview;
            this._updatePanel(webview, 'mdFile', html.mdFile);
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
        
    private async _updatePanel(webview: vscode.Webview, page: string, text: string) {
        /* update html panel with project page or readme page */

        switch (page) {
            case 'projectsPage':
                this._panel.title = 'Projects + Components';		
                this._panel.webview.html = text;
                break
            case 'mdFile':
                this._panel.title = 'README.md';
                this._panel.webview.html = text;
                break
        }
    }
}
