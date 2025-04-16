import * as vscode from 'vscode';
import axios from 'axios';
import { log } from '../api/userInterface';


let projects_list: string[][] = [];
// save preojcts info to list of dicts
export let projects_info = {};
export let componentsInfo = {};
let componentsList: string[][] = [];
let projects_list_string : string = '';
let projects_ids_list_string : string = '';
let components_ids_list_string : string = '';
let componentsListString : string = '';
let projects_description_list_string : string = '';
let components_description_list_string : string = '';

export async function getProjects(htmlPanel, webview, page): Promise<void> {
    return new Promise((resolve) => {
        // solution repos config
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.github.com/search/repositories?q=org:QuecPython+topic:solution',
            headers: {}
        };
    
        // component repos config
        let config1 = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.github.com/search/repositories?q=org:QuecPython+topic:component',
            headers: {}
        };
    
        Promise.all([
            axios.request(config),
            axios.request(config1)
        ])
        .then(([response, response1]) => {
            const items = response.data.items;
            // save projects to dict, keys are projects ids
            items.map((item: any) => projects_info[item.id] = item);
    
            // build string from a list, and use it in js string
            projects_list = items.map((item: any) => [item.name, item.id, item.description]);
            projects_list_string = '\[' + projects_list.map(item => `\"${item[0]}\"`).join(', ') + '\]';
            projects_ids_list_string = '\[' + projects_list.map(item => `\"${item[1]}\"`).join(', ') + '\]';
            projects_description_list_string = '\[' + projects_list.map(item => `\"${item[2]}\"`).join(', ') + '\]';
    
            const items1 = response1.data.items;
            items1.map((item: any) => componentsInfo[item.id] = item);
            componentsList = response1.data.items.map((item: any) => [item.name, item.id, item.description]);
            componentsListString = '\[' + componentsList.map(item => `\"${item[0]}\"`).join(', ') + '\]';
            components_ids_list_string = '\[' + componentsList.map(item => `\"${item[1]}\"`).join(', ') + '\]';
            components_description_list_string = '\[' + componentsList.map(item => `\"${item[2]}\"`).join(', ') + '\]';
            
            // if folder is open, for add submodule
            let workspaceOpen = 'disabled';
            if (vscode.workspace.workspaceFolders) {
                workspaceOpen = 'enabled';
            }
            setProjects(
                projects_list_string,
                projects_ids_list_string,
                projects_description_list_string,
                componentsListString,
                components_description_list_string,
                components_ids_list_string,
                workspaceOpen
            );
            htmlPanel._updatePanel(webview, page, projects);
        })
        .catch((error) => {
            console.log('Error fetching projects:', error);
        });
    
        resolve();
    });
}

let mdText = '';
export let mdFile = '';

export async function setMd(text: string, submodulesData: string, subModulesUrls: string){
    mdText = text;
    mdFile = `
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
            background-color: #f8f9fa;
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
        }
        #container {
            display: flex;
            width: 100%;
            justify-content: space-between;
            margin-top: 20px;
        }
        #left, #right {
            width: 50%;
            padding: 10px;
        }
        #left {
            border-right: 1px solid #ccc;
        }
        .item-details, .item-buttons {
            margin-bottom: 10px;
        }
        .hidden {
            display: none;
        }
    </style>
    </head>
    <body>
        <div class="sticky-buttons">
            <button onclick="history.back()">Go Back</button>
            <button id="newProject" onclick="vscode.postMessage({ command: 'newProjectClick'});">New Project</button>
            <button id="showAll">Show All</button>
            <button id="hideAll">Hide All</button>
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
            document.addEventListener('DOMContentLoaded', (event) => {
                if (typeof marked !== 'undefined') {
                    const readmeContent = \`${mdText}\`;
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
                    const components = ${submodulesData};
                    const subModulesUrlsList = ${subModulesUrls};

                    vscode.postMessage({ command: 'logData' , value: components });

                    const components_description = ['Description 1', 'Description 2', 'Description 3'];
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
}
export let projects = '';
function setProjects(
    projects_list_string: string,
    projects_ids_list_string: string,
    description_list_string: string,
    componentsListString: string,
    components_description_list_string: string,
    components_ids_list_string: string,
    workspaceOpen: string = 'disabled'
){
    projects = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solutions + Components</title>
        <style>
            body {
                margin: 0;
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                background-color: #f0f0f0;
            }
            .sticky-buttons {
                position: sticky;
                top: 0;
                background-color: #f8f9fa;
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
            }

            .container {
                padding: 20px;
                background-color: #fff;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                width: 80%;
                max-width: 800px;
                margin: 20px 0;
            }

            .item-list {
                list-style-type: none;
                padding: 0;
            }

            .item-list li {
                padding: 10px;
                border-bottom: 1px solid #ddd;
            }
            .search-bar {
                width: 100%;
                padding: 10px;
                margin-bottom: 20px;
                box-sizing: border-box;
            }
            .item {
                border: 1px solid #ccc;
                padding: 20px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .item-details {
                flex-grow: 1;
            }
            .item-buttons {
                display: flex;
                gap: 10px;
            }
            .item-buttons button {
                padding: 10px 20px;
                cursor: pointer;
            }
            .hidden {
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="sticky-buttons">
        
             <button onclick="history.back()">Go Back</button>

            <button id="newProejct" onclick="vscode.postMessage({ command: 'newProjectClick'});">New Project</button>
            <button id="showAll">Show All</button>
            <button id="hideAll">Hide All</button>
        </div>
        <div class="container">
            <h2>Projects</h2>
            <input type="text" class="search-bar" id="projectSearchBar" placeholder="Search Solutions..." onkeyup="filterProjects()">
            <ul class="item-list" id="projectList"></ul>
            <button id="projectToggle" onclick="toggleItems('project')">Show More</button>
            <h2>Components</h2>
            <input type="text" class="search-bar" id="componentSearchBar" placeholder="Search components..." onkeyup="filterComponents()">
            <ul class="item-list" id="componentList"></ul>
            <button id="componentToggle" onclick="toggleItems('component')">Show More</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            vscode.postMessage({ command: 'startup' });

            // projects data
            const projects = ${projects_list_string};
            const projects_ids = ${projects_ids_list_string};
            const projects_description = ${description_list_string};

            // components
            const components = ${componentsListString};
            const components_ids = ${components_ids_list_string};
            const components_description = ${components_description_list_string};

            document.getElementById('showAll').addEventListener('click', function() {
                document.querySelectorAll('.item-list').forEach(function(element) {
                    element.querySelectorAll('li').forEach(function(item) {
                        item.style.display = 'block';
                    });
                });
                document.querySelectorAll('button[id$="Toggle"]').forEach(function(button) {
                    button.textContent = 'Show Less';
                });
            });

            document.getElementById('hideAll').addEventListener('click', function() {
                document.querySelectorAll('.item-list').forEach(function(element) {
                    const items = element.querySelectorAll('li');
                    items.forEach((item, index) => {
                        item.style.display = index < 2 ? 'block' : 'none';
                    });
                });
                document.querySelectorAll('button[id$="Toggle"]').forEach(function(button) {
                    button.textContent = 'Show More';
                });
            });

            function generateItemList() {
                const projectList = document.getElementById('projectList');

                projects.forEach((project, index) => {
                    const projectItem = document.createElement('li');
                    projectItem.className = 'item';
                    if (index >= 2) projectItem.classList.add('hidden');
                    projectItem.innerHTML = \`
                        <div class="item-details">
                            <h3>$\{project\}</h3>
                            <p>$\{projects_description[index]\}</p>
                        </div>
                        <div class="item-buttons">
                            <select id="versionSelect" disabled>
                                <option value="1">Version 1</option>
                                <option value="2">Version 2</option>
                                <option value="3">Version 3</option>
                            </select>
                            <button id="importButton" class="import-button" onclick="vscode.postMessage({ command: 'importClick', value: '$\{projects_ids[index]\}'});">Import</button>
                            <button id="viewProjectButton" class="view-button" onclick="vscode.postMessage({ command: 'viewClick', value: '$\{projects_ids[index]\}'});">View</button>
                        </div>
                    \`;
                    projectList.appendChild(projectItem);
                });
                const componentList = document.getElementById('componentList');

                let projectOpen = true;
                let buttonState = projectOpen ? 'enabled' : 'disabled';
                components.forEach((component, index) => {
                    const componentItem = document.createElement('li');
                    componentItem.className = 'item';
                    if (index >= 2) componentItem.classList.add('hidden');
                    componentItem.innerHTML = \`
                        <div class="item-details">
                            <h3>$\{component\}</h3>
                            <p>$\{components_description[index]\}.</p>
                        </div>
                        <div class="item-buttons">
                            <select id="versionSelect" disabled>
                                <option value="1">Version 1</option>
                                <option value="2">Version 2</option>
                                <option value="3">Version 3</option>
                            </select>
                            <button ${workspaceOpen} id="addToProjectButton" class="view-button" onclick="vscode.postMessage({ command: 'addToProject', value: '$\{components_ids[index]\}'});">Add to project</button>
                            <button id="viewComponentButton" class="view-button" onclick="vscode.postMessage({ command: 'viewComponent', value: '$\{components_ids[index]\}'});">View</button>
                        </div>
                    \`;
                    componentList.appendChild(componentItem);
                });
            }

            function filterProjects() {
                const searchInput = document.getElementById('projectSearchBar').value.toLowerCase();
                const projectItems = document.querySelectorAll('#projectList .item');
                
                projectItems.forEach(item => {
                    const title = item.querySelector('h3').textContent.toLowerCase();
                    const description = item.querySelector('p').textContent.toLowerCase();
                    
                    if (title.includes(searchInput) || description.includes(searchInput)) {
                        item.style.display = '';
                        item.classList.remove('hidden');
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
            function filterComponents() {
                const searchInput = document.getElementById('componentSearchBar').value.toLowerCase();
                const componentItems = document.querySelectorAll('#componentList .item');
                
                componentItems.forEach(item => {
                    const title = item.querySelector('h3').textContent.toLowerCase();
                    const description = item.querySelector('p').textContent.toLowerCase();
                    
                    if (title.includes(searchInput) || description.includes(searchInput)) {
                        item.style.display = '';
                        item.classList.remove('hidden');
                    } else {
                        item.style.display = 'none';
                    }
                });
            }

            function toggleItems(type) {
                const list = document.getElementById(type + 'List');
                const button = document.getElementById(type + 'Toggle');
                const items = list.querySelectorAll('li');
                if (button.textContent === 'Show More') {
                    items.forEach(item => item.style.display = 'block');
                    button.textContent = 'Show Less';
                } else {
                    items.forEach((item, index) => {
                        item.style.display = index < 2 ? 'block' : 'none';
                    });
                    button.textContent = 'Show More';
                }
            }

            // Generate the item lists on page load
            window.onload = generateItemList;
        </script>
    </body>
    </html>
    `;
}