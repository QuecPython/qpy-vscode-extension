import * as vscode from 'vscode';

import { HtmlPanel } from '../packagePanel/htmlPanel';
import { 
    projectsInfo,
    readProjects,
    projectsIdsListString,
    projectsReleasesString
} from '../packagePanel/html';
import { checkFileExists, createMarkdownText, readGitSubmodules } from '../utils/utils';
import { makerFile } from '../utils/constants';
import { log } from '../api/userInterface';

export let currentProject = ''; // projects html page

export async function getCurrentProject(htmlPanel: HtmlPanel, webview, page, readmeFile='README.md'): Promise<void> {
    let stickyButtonsBackgroundColor = '#f8f9fa';

    // toggle colors by theme
    // 1 is light, 2 is black theme
    if (vscode.window.activeColorTheme.kind == 2){
        stickyButtonsBackgroundColor = '#0a0a0b';
    }

    let innerHTML = '';
    let readmeUri: vscode.Uri;
    let componentsString = '[]';
    let subModules = '[]';
    return new Promise(async (resolve) => {
        let workspaceFolders = vscode.workspace.workspaceFolders;
        let fileContent = '';
        if (!workspaceFolders) {
            // no project open
            innerHTML = '<center>No project is open<br>Or Curren proejct is not QuecPython Project</center>';
        } else {
            // check if proejct is QuecPython project
            if (await checkFileExists(makerFile)) {

                // read projects info from github api, used with readme view
                if (Object.keys(projectsInfo).length == 0) {
                    await readProjects();
                }
                
                // get file path
                readmeUri = vscode.Uri.joinPath(workspaceFolders[0].uri, readmeFile);
                const fileContentUint8Array = await vscode.workspace.fs.readFile(readmeUri);
                fileContent = new TextDecoder('utf-8').decode(fileContentUint8Array);
                
                // format md file
                fileContent = createMarkdownText(fileContent, true);
                const workspaceFolderUri = vscode.workspace.workspaceFolders[0].uri;
                let modules = await readGitSubmodules(workspaceFolderUri.fsPath, '.gitmodules');
                componentsString = '\[' + modules.map(item => `\"${item.name}\"`).join(', ') + '\]';
                subModules = '\[' + modules.map(item => `\"${item.url}\"`).join(', ') + '\]';

                innerHTML = `
<div id="container">
    <div id="left">
        <h1>README</h1>
        <button onclick="vscode.postMessage({ command: 'viewCurrentReadme'});">Open Readme File</button>
        <div id="readme-content"></div>
        <button id="show-more" class="hidden">Show More</button>
    </div>
    <div id="right">
        <h1>List of Components</h1>
        <div id="components-content"></div>
    </div>
</div>
`
            } else {
                innerHTML = '<center>No project is open<br>Or Curren proejct is not QuecPython Project</center>';
            }
        }

        let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Markdown Preview</title>

    <style>
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .sticky-buttons {
            position: sticky;
            top: 0;
            background-color: ${stickyButtonsBackgroundColor};
            padding: 10px;
            display: flex;
            justify-content: center;
            border-bottom: 1px solid #ddd;
            width: 100%;
            z-index: 1000;
        }

        .sticky-buttons button {
            margin: 0 10px;
            padding: 10px 20px;
            cursor: pointer;
            background-color: #007ACC;
            color: white;
        }
        
        .sticky-buttons button:disabled {
            background-color: rgb(100, 110, 120);
            color: #FFFFFF;
        }        

        #container {
            display: flex;
            width: 100%;
            justify-content: space-between;
            margin-top: 20px;
        }
        #container button {
            background-color: #007ACC;
            color: white;
        }
        #container button:disabled {
            background-color: rgb(100, 110, 120);
            color: #FFFFFF;
        }
        #left, #right {
            width: 50%;
            padding: 10px;
        }

        #left {
            border-right: 1px solid #ccc;
        }
    </style>
</head>
<body>
    <!-- top banner -->
    <div class="sticky-buttons">
        <!-- home button is disbled on home screen -->
        <button disabled onclick="vscode.postMessage({ command: 'homeButton'});">Home</button>
        <button disabled onclick="vscode.postMessage({ command: 'backButton'});">Back</button>
        <button id="newProject" onclick="vscode.postMessage({ command: 'newProjectClick'});">Open Project</button>
        <button disabled id="showAll">Show All</button>
        <button disabled id="hideAll">Hide All</button>
    </div>
    ${innerHTML}
    <script src="https://unpkg.com/prettier@3.0.3/standalone.js"></script>
    <script src="https://unpkg.com/prettier@3.0.3/plugins/graphql.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moo/moo.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/json-loose/dist/index.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/attributes-parser/dist/index.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked-code-format/dist/index.umd.min.js"></script>
    <script>
        const vscode = acquireVsCodeApi();

        const projectsIds = ${projectsIdsListString};
        const projectsReleases = ${projectsReleasesString};

        function getRelease(option) {
            // from select get selected option
            return document.getElementById(option).value;
        }

        // load readme content
        document.addEventListener('DOMContentLoaded', (event) => {
            if (typeof marked !== 'undefined') {

                const readmeContent = \`${fileContent}\`;
                const readmeLines = readmeContent.split('\\n');

                // show 30 lines before show more button
                const initialContent = readmeLines.slice(0, 31).join('\\n');
                const remainingContent = readmeLines.slice(31).join('\\n');

                document.getElementById('readme-content').innerHTML = marked.parse(initialContent);
                if (remainingContent) {
                    const showMoreButton = document.getElementById('show-more');
                    showMoreButton.classList.remove('hidden');
                    showMoreButton.addEventListener('click', () => {
                        document.getElementById('readme-content').innerHTML += marked.parse(remainingContent);
                        showMoreButton.classList.add('hidden');
                    });
                }
                const components = ${componentsString};
                const subModulesUrlsList = ${subModules};

                // create components items
                let componentsHTML = '';
                if (components.length == 0) {
                    componentsHTML += '<p>No components found today</p>';
                } else {
                    components.forEach((component, index) => {
                        componentsHTML += \`
                            <div class="item-details">
                                <h3>$\{component\}</h3>
                            </div>
                            <div class="item-buttons">
                                <select id="$\{projectsIds[index]\}">
                                    <option selected>Releases</option>
                                    $\{projectsReleases[index]\}
                                </select>
                                <button disabled id="importButton" class="import-button" onclick="vscode.postMessage({ command: 'importClick', value: '$\{projectsIds[index]\}', release: getRelease($\{projectsIds[index]\}) });">Update</button>
                                <button onclick="vscode.postMessage({ command: 'removeComponentClick', value: '$\{component\}'});">Remove from project</button>
                                <button id="submoduleViewButton" class="view-button" onclick="vscode.postMessage({
                                    command: 'viewComponentClick',
                                    value: '$\{subModulesUrlsList[index]\}',
                                    source: 'currentProjectPage'
                                },);">View</button>
                            </div>
                        \`;
                    });
                }

                document.getElementById('components-content').innerHTML = componentsHTML;
            } else {
                document.getElementById('readme-content').innerHTML = '<p>Error loading Markdown parser.</p>';
                document.getElementById('components-content').innerHTML = '<p>Error loading Markdown parser.</p>';
            }
        });
    </script>
</body>
</html>
        `;
        await htmlPanel._updatePanel(webview, page, html);

        resolve();
    });
}