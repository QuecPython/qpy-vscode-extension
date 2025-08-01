/* create html script for projects page + readme page */

import * as vscode from 'vscode';
import axios from 'axios';
import { log } from '../api/userInterface';
import * as history from '../packagePanel/panelHistory';

// for projects in home page
export let projects = ''; // projects html page
let projectsList: string[][] = [];
export let projectsInfo = {}; // save projects info to list of dicts
let projectsListString : string = '';
export let projectsIdsListString : string = '';
let projectsDescriptionListString : string = '';
export let projectsReleasesString: string = '';

// for components in home page
export let componentsInfo = {}; // save components info to list of dicts
let componentsList: string[][] = [];
let componentsIdsListString : string = '';
let componentsListString : string = '';
let componentsDescriptionListString : string = '';
let componentsReleasesString : string = '';

// for readme page
let mdText = '';
export let mdFile = '';

/* make several requests to github
- get list of repos from solution topic (projects)
- get list of repos from component topic
- build list of projects and components  and their detils to be used in html page
- send all the data to the html page using setProjects(...)
 */
export async function getProjects(htmlPanel, webview, page): Promise<void> {
    return new Promise(async (resolve) => {
        // if folder is open, for add submodule
        let workspaceOpen = 'disabled';
        if (vscode.workspace.workspaceFolders) {
            workspaceOpen = 'enabled';
        }

        // if we have data already from github api
        if (Object.keys(projectsInfo).length > 0) {
            setProjects(
                projectsDescriptionListString,
                componentsListString,
                componentsIdsListString,
                componentsDescriptionListString,
                componentsReleasesString,
                workspaceOpen
            );
            htmlPanel._updatePanel(page, projects);
        } else {
            await readProjects();

            await setProjects(
                projectsDescriptionListString,
                componentsListString,
                componentsIdsListString,
                componentsDescriptionListString,
                componentsReleasesString,
                workspaceOpen
            );
            await htmlPanel._updatePanel(page, projects);
        }
        resolve();
    });
}

// read projects from github api
export async function readProjects(): Promise<void> {
    return new Promise(async (resolve) => {

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

    await Promise.all([
        axios.request(config),
        axios.request(config1)
    ])
    .then( async ([response, response1]) => {
        // save projects to dict, keys are projects ids
        const items = response.data.items;
        let requests = [];

        items.map(async (item: any) => {
            projectsInfo[item.id] = item;
            // build string from a list, and use it in js string
            projectsList = items.map((item: any) => {
                return [item.name, item.id, item.description]
            });

            // build list in string form, used inside js
            projectsListString = '\[' + projectsList.map(item => `\"${item[0]}\"`).join(', ') + '\]';
            projectsIdsListString = '\[' + projectsList.map(item => `\"${item[1]}\"`).join(', ') + '\]';
            projectsDescriptionListString = '\[' + projectsList.map(item => `\"${item[2]}\"`).join(', ') + '\]';

            let releasesUrl = `https://api.github.com/repos/QuecPython/${item.name}/releases`;
            let config2 = {
                id: '',
                method: 'get',
                maxBodyLength: Infinity,
                url: releasesUrl,
                headers: {} // if limit reached, use git token
            };

            config2.id = item.id;
            requests.push(axios.request(config2));
        });

        await Promise.allSettled(requests).then(async (results) => {
            // get releases for projects
            results.forEach((result, index) => {
                if (result.status == 'fulfilled') {
                    let data = result.value.data;
                    let releases = [];
                    for (let i of data){
                        releases.push(i.tag_name);
                    }
                    let id = result.value.config.id;
                    projectsInfo[id].releases = releases;
                }
            });
        });

        // get projects releases
        let projectsReleases = [];
        for (let i of projectsList) {
            let id = i[1];
            if ('releases' in projectsInfo[id] && projectsInfo[id].releases.length > 0){
                let releases = ''; // for one project
                for (let y in projectsInfo[id].releases) {
                    releases += `<option>${projectsInfo[id].releases[y]}</option>`;
                }
                projectsReleases.push(releases);
            } else {
                projectsReleases.push('');
            }
        }
        projectsReleasesString = '\[' + projectsReleases.map(item => `\'${item}\'`).join(', ') + '\]';
    
        const items1 = response1.data.items;
        requests = [];
        items1.map(async (item: any) => {
            componentsInfo[item.id] = item;

            // build string from a list, and use it in js string
            componentsList = items1.map((item: any) => {
                return [item.name, item.id, item.description]
            });

            // build list in string form, used inside js
            componentsListString = '\[' + componentsList.map(item => `\"${item[0]}\"`).join(', ') + '\]';
            componentsIdsListString = '\[' + componentsList.map(item => `\"${item[1]}\"`).join(', ') + '\]';
            componentsDescriptionListString = '\[' + componentsList.map(item => `\"${item[2]}\"`).join(', ') + '\]';

            let releasesUrl = `https://api.github.com/repos/QuecPython/${item.name}/releases`;
            let config2 = {
                id: '',
                method: 'get',
                maxBodyLength: Infinity,
                url: releasesUrl,
                headers: {} // if limit reached, use git token
            };

            config2.id = item.id;
            requests.push(axios.request(config2));
        });

        await Promise.allSettled(requests).then(async (results) => {
            // get releases for components
            results.forEach((result, index) => {
                if (result.status == 'fulfilled') {
                    let releases = [];
                    let data = result.value.data;
                    for (let i of data){
                        releases.push(i.tag_name);
                    }
                    let id = result.value.config.id;
                    componentsInfo[id].releases = releases;
                }
            });                    
        });

        // get components releases
        let componentsReleases = [];
        for (let i of componentsList) {
            let id = i[1];
            if ('releases' in componentsInfo[id] && componentsInfo[id].releases.length > 0) {
                let releases = ''; // for one components
                for (let y in componentsInfo[id].releases) {
                    releases += `<option>${componentsInfo[id].releases[y]}</option>`;
                }
                componentsReleases.push(releases);
            }
        }
        componentsReleasesString = '\[' + componentsReleases.map(item => `\'${item}\'`).join(', ') + '\]';
                                    
    })
    .catch((error) => {
        log(error);
        vscode.window.showErrorMessage('Error fetching projects, please try again later.');
    });

    resolve();
    });
}
/* using list of data from getProjects, create html page with list of item for projects + components
- the page has top banner with few buttons 
- the page 2 sections, for projects + components
- each section has a search field
- each section shows 2 items + show button
- based on the release certain version will be imported
- view button will open readme page
*/
async function setProjects(
    projectsDescriptionListString: string,
    componentsListString: string,
    componentsIdsListString: string,
    componentsDescriptionListString: string,
    componentsReleasesString: string,
    workspaceOpen: string = 'disabled'
) {
    // banner buttons acitve or not
    let backButton = history.getStepsLength() > 1 ? 'enabled' : 'disabled';
    let showButton = 'enabled';

    let backgroundColor = '#f0f0f0';
    let textColor = '#0a0a0b';
    let stickyButtonsBackgroundColor = '#f8f9fa';
    let containerBackgroundColor= '#fff';

    // toggle colors by theme
    // 1 is light, 2 is black theme
    if (vscode.window.activeColorTheme.kind == 2){
        backgroundColor = '#141414';
        textColor = '#f0f0f0';
        stickyButtonsBackgroundColor = '#0a0a0b';
        containerBackgroundColor = '#000';
    }

    projects = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Projects + Components</title>
        <style>
            body {
                margin: 0;
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                background-color: ${backgroundColor};
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

            .container {
                padding: 20px;
                background-color: ${containerBackgroundColor};
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                width: 80%;
                max-width: 800px;
                margin: 20px 0;
            }

            .container button {
                background-color: #007ACC;
                color: white;
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
                placeholder.color: white;
                color: ${textColor};
                background-color: ${backgroundColor};

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
                background-color: #007ACC;
                color: white;
            }

            .item-buttons select {
                color: ${textColor};
                background-color: ${backgroundColor};
            }
            .item-buttons button:disabled {
                background-color: rgb(100, 110, 120);
                color: #FFFFFF;
            }

            .hidden {
                display: none;
            }
        </style>
    </head>
    <body>
        <!-- top banner -->
        <div class="sticky-buttons">
            <!-- home button is disbled on home screen -->
            <button disabled onclick="vscode.postMessage({ command: 'homeButton'});">Home</button>
            <button ${backButton} onclick="vscode.postMessage({ command: 'backButton'});">Back</button>
            <button id="newProject" onclick="vscode.postMessage({ command: 'newProjectClick'});">New Project</button>
            <button ${showButton} id="showAll">Show All</button>
            <button ${showButton} id="hideAll">Hide All</button>
        </div>

        <!-- Projects and Components sections -->
        <div class="container">
            <h2>Projects</h2>
            <input type="text" class="search-bar" id="projectSearchBar" placeholder="Search Projects..." onkeyup="filterProjects()">
            <ul class="item-list" id="projectList"></ul>
            <button id="projectToggle" onclick="toggleItems('project')">Show More</button>
            <h2>Components</h2>
            <input type="text" class="search-bar" id="componentSearchBar" placeholder="Search Components..." onkeyup="filterComponents()">
            <ul class="item-list" id="componentList"></ul>
            <button id="componentToggle" onclick="toggleItems('component')">Show More</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi(); // used to send event to exention
            
            // projects data
            const projects = ${projectsListString};
            const projectsIds = ${projectsIdsListString};
            const projectsDescription = ${projectsDescriptionListString};
            const projectsReleases = ${projectsReleasesString};

            // components data
            const components = ${componentsListString};
            const componentsIds = ${componentsIdsListString};
            const componentsDescription = ${componentsDescriptionListString};
            const componentsReleases = ${componentsReleasesString};

            // show all button event
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

            // hide all button event
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

            function getRelease(option) {
                // from select get selected option
                return document.getElementById(option).value;
            }

            function generateItemList() {
                // generate list of projects and componenets with buttons + release

                const projectList = document.getElementById('projectList');

                // create project items with button, and releases
                projects.forEach((project, index) => {
                    const projectItem = document.createElement('li');
                    projectItem.className = 'item';
                    if (index >= 2) projectItem.classList.add('hidden');
                    projectItem.innerHTML = \`
                        <div class="item-details">
                            <h3>$\{project\}</h3>
                            <p>$\{projectsDescription[index]\}</p>
                        </div>
                        <div class="item-buttons">
                            <select id="$\{projectsIds[index]\}">
                                <option selected>Releases</option>
                                $\{projectsReleases[index]\}
                            </select>
                            <button id="importButton" class="import-button" onclick="vscode.postMessage({ command: 'importClick', value: '$\{projectsIds[index]\}', release: getRelease($\{projectsIds[index]\}) });">Import</button>
                            <button id="viewProjectButton" class="view-button" onclick="vscode.postMessage({ command: 'viewClick', value: '$\{projectsIds[index]\}'});">View</button>
                        </div>
                    \`;
                    projectList.appendChild(projectItem);
                });
                const componentList = document.getElementById('componentList');

                // create components items with button, and releases
                components.forEach((component, index) => {
                    const componentItem = document.createElement('li');
                    componentItem.className = 'item';
                    if (index >= 2) componentItem.classList.add('hidden');
                    componentItem.innerHTML = \`
                        <div class="item-details">
                            <h3>$\{component\}</h3>
                            <p>$\{componentsDescription[index]\}.</p>
                        </div>
                        <div class="item-buttons">
                            <select id="$\{componentsIds[index]\}">
                                <option selected>Releases</option>
                                $\{componentsReleases[index]\}
                            </select>
                            <button ${workspaceOpen} id="addToProjectButton" class="view-button" onclick="vscode.postMessage({ command: 'addToProject', value: '$\{componentsIds[index]\}'});">Add to project</button>
                            <button id="viewComponentButton" class="view-button" onclick="vscode.postMessage({ command: 'viewComponent', value: '$\{componentsIds[index]\}'});">View</button>
                        </div>
                    \`;
                    componentList.appendChild(componentItem);
                });
            }

            function filterProjects() {
                // search field for projects

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
                // search field for projects

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

            // show all and hide all action
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

/* using marked lib, create readme page to show it in vs code */
export async function setMd(text: string, submodulesData: string, subModulesUrls: string, source?: string) {
    // banner buttons
    let homeButton = 'enabled';
    if (source == 'currentProjectPage') {
        homeButton = 'disabled'; // home button is disabled on current Project Page
    }
    let backButton = history.getStepsLength() > 1 ? 'enabled' : 'disabled';
    let showButton = 'disabled'; // hide all, show all buttons are disabled with md page

    let stickyButtonsBackgroundColor = '#f8f9fa';
    // toggle colors by theme
    // 1 is light, 2 is black theme
    if (vscode.window.activeColorTheme.kind == 2){
        stickyButtonsBackgroundColor = '#0a0a0b';
    }
    
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
            <button ${homeButton} onclick="vscode.postMessage({ command: 'homeButton'});">Home</button>
            <button ${backButton} onclick="vscode.postMessage({ command: 'backButton'});">Back</button>
            <button id="newProject" onclick="vscode.postMessage({ command: 'newProjectClick'});">New Project</button>
            <button ${showButton} id="showAll">Show All</button>
            <button ${showButton} id="hideAll">Hide All</button>
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
            // vscode.postMessage({ command: 'logData' , value: components });

            // load readme content
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
}
