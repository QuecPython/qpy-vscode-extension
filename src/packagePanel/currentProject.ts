import * as vscode from 'vscode';

import { HtmlPanel } from '../packagePanel/htmlPanel';
import { checkIfMarkerFileExists, createMarkdownText } from '../utils/utils';
import { log } from '../api/userInterface';

export let currentProject = ''; // projects html page

export async function getCurrentProject(htmlPanel: HtmlPanel, webview, page, file='README.md'): Promise<void> {
    
    let stickyButtonsBackgroundColor = '#f8f9fa';

    // toggle colors by theme
    // 1 is light, 2 is black theme
    if (vscode.window.activeColorTheme.kind == 2){
        stickyButtonsBackgroundColor = '#0a0a0b';
    }

    let innerHTML = '';
    return new Promise(async (resolve) => {
        let workspaceFolders = vscode.workspace.workspaceFolders;
        let fileContent = '';
        if (!workspaceFolders) {
            // no project open
            innerHTML = '<center>No project is open<br>Or Curren proejct is not QuecPython Project</center>';
        } else {
            if (checkIfMarkerFileExists()) {
                
                // get file path
                const readmeUri = vscode.Uri.joinPath(workspaceFolders[0].uri, file);

                const fileContentUint8Array = await vscode.workspace.fs.readFile(readmeUri);
                fileContent = new TextDecoder('utf-8').decode(fileContentUint8Array);
                
                // remove ` from text
                fileContent = createMarkdownText(fileContent, true);
                innerHTML = `
<div id="container">
    <div id="left">
        <h1>README</h1>
        <div id="readme-content"></div>
        <button onclick="vscode.postMessage({ command: 'viewCurrentReadme', value: '${readmeUri}' });">Open Readme File</button>

        <br>
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
            background-color:rgb(136, 146, 158);
            color: #A6A6A6;
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
            background-color:rgb(136, 146, 158);
            color: #A6A6A6;
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
    <div id="container">
        <div id="left">
            <h1>README</h1>
            <div id="readme-content"></div>
            <button id="show-more" class="hidden">Show More</button>
        </div>
        <div id="right">
            <h1>List of Components</h1>
            <div id="components-content"></div>
        </div>
    </div>

    <script src="https://unpkg.com/prettier@3.0.3/standalone.js"></script>
    <script src="https://unpkg.com/prettier@3.0.3/plugins/graphql.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moo/moo.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/json-loose/dist/index.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/attributes-parser/dist/index.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked-code-format/dist/index.umd.min.js"></script>
    <script>
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'logData' , value: '1' });

        // load readme content
        document.addEventListener('DOMContentLoaded', (event) => {
            if (typeof marked !== 'undefined') {
                vscode.postMessage({ command: 'logData' , value: '2' });

                const readmeContent = \`${fileContent}\`;
                const readmeLines = readmeContent.split('\\n');
                vscode.postMessage({ command: 'logData' , value: '3' });

                // show 30 lines before show more button
                const initialContent = readmeLines.slice(0, 31).join('\\n');
                const remainingContent = readmeLines.slice(31).join('\\n');

                document.getElementById('readme-content').innerHTML = marked.parse(initialContent);
                if (remainingContent) {
                    vscode.postMessage({ command: 'logData' , value: '4' });

                    const showMoreButton = document.getElementById('show-more');
                    showMoreButton.classList.remove('hidden');
                    showMoreButton.addEventListener('click', () => {
                        document.getElementById('readme-content').innerHTML += marked.parse(remainingContent);
                        showMoreButton.classList.add('hidden');
                    });
                }
                const components = [];
                const subModulesUrlsList = [];

                // create components items
                let componentsHTML = '';
                if (components.length == 0) {
                    componentsHTML += '<p>No components found</p>';
                } else {
                    components.forEach((component, index) => {
                        componentsHTML += \`
                            <div class="item-details">
                                <h3>$\{component\}</h3>
                            </div>
                            <div class="item-buttons">
                                <button disabled>Remove from project</button>
                                <button id="submoduleViewButton" class="view-button" onclick="vscode.postMessage({ command: 'viewComponentClick', value: '$\{subModulesUrlsList[index]\}'});">View</button>
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
        log(html);
        await htmlPanel._updatePanel(webview, page, html);

        resolve();
    });
}