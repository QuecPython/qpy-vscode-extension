import { sleep } from '../utils/utils';
import { log } from './userInterface';
import axios from 'axios';

function github_call(): any {
    let items : string[][] = [];
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://api.github.com/search/repositories?q=org:QuecPython+topic:solution',
        headers: { }
    };
    
    axios.request(config)
    .then((response) => {
        for (let i of response.data.items){
            items.push([i.name, i.description]);
            // console.log([i.name, i.description]);
        }
        return items;
    })
    .catch((error) => {
        console.log(error);
        return items;
    });
}

let projects_list: string[][] = [];
let components_list: string[][] = [];
let projects_list_string : string = '';
let components_list_string : string = '';
let projects_description_list_string : string = '';
let components_description_list_string : string = '';
let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.github.com/search/repositories?q=org:QuecPython+topic:solution',
    headers: {}
};

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
    projects_list = response.data.items.map((item: any) => [item.name, item.description]);
    projects_list_string = '\[' + projects_list.map(item => `\"${item[0]}\"`).join(', ') + '\]';
    projects_description_list_string = '\[' + projects_list.map(item => `\"${item[1]}\"`).join(', ') + '\]';

    components_list = response1.data.items.map((item: any) => [item.name, item.description]);
    components_list_string = '\[' + components_list.map(item => `\"${item[0]}\"`).join(', ') + '\]';
    components_description_list_string = '\[' + components_list.map(item => `\"${item[1]}\"`).join(', ') + '\]';
    set_projects(
        projects_list_string,
        projects_description_list_string,
        components_list_string,
        components_description_list_string
    );
})
.catch((error) => {
    console.log('Error fetching projects:', error);
});

export const mdFile = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Preview</title>
</head>
<body>
    <h1>Markdown Preview</h1>
    <div id="content"></div>
    <script src="https://unpkg.com/prettier@3.0.3/standalone.js"></script>
    <script src="https://unpkg.com/prettier@3.0.3/plugins/graphql.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moo/moo.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/json-loose/dist/index.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/attributes-parser/dist/index.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked-code-format/dist/index.umd.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', (event) => {
            if (typeof marked !== 'undefined') {
                const markdownContent = \`
# QuecPython DTU Solution

[中文](readme_zh.md) | English

Welcome to the QuecPython DTU Solution repository! This repository provides a comprehensive solution for developing DTU device applications using QuecPython.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Directory Structure](#directory-structure)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Introduction

QuecPython has launched a solution for DTU, including multi-protocol data transmission (TCP/UDP/MQTT/HTTP, etc.), integration with common cloud platforms, and support for parameter configuration of DTU using upper computer tools.

![DTU](./docs/en/media/DP-DTU-Q600.png)

## Features

- **Multi-Protocol Data Transmission**: Supports data transmission via TCP/UDP/MQTT/HTTP protocols, configurable as command mode or transparent transmission mode.
- **Integration with Common Cloud Platforms**: Supports integration with Alibaba Cloud, Tencent Cloud, Huawei Cloud, AWS, and other cloud platforms.
- **Parameter Configuration and Storage**: Supports parameter configuration of the device using a dedicated DTU tool, with persistent storage on the device.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following prerequisites:

- **Hardware**:
  - QuecPython development board kit or DTU device.
    > Click for DTU EVB's [schematic](https://images.quectel.com/python/2024/10/DP-DTU-Q600-EVB-V1.3-SCH.pdf) and [silk screen](https://images.quectel.com/python/2024/10/DP-DTU-Q600-EVB-V1.3-SilkScreen.pdf) documents.
  - USB Data Cable (USB-A to USB-C).
  - PC (Windows 7, Windows 10, or Windows 11).

- **Software**:
  - USB driver for the QuecPython module.
  - QPYcom debugging tool.
  - QuecPython firmware and related software resources.
  - Python text editor (e.g., [VSCode](https://code.visualstudio.com/), [Pycharm](https://www.jetbrains.com/pycharm/download/)).

### Installation

1. **Clone the Repository**:
   
   git clone https://github.com/QuecPython/solution-DTU.git
   cd solution-DTU

2. **Flash the Firmware**:
   Follow the [instructions](https://python.quectel.com/doc/Application_guide/en/dev-tools/QPYcom/qpycom-dw.html#Download-Firmware) to flash the firmware to the development board.

   \`;

                document.getElementById('content').innerHTML = marked.parse(markdownContent);
            } else {
                document.getElementById('content').innerHTML = '<p>Error loading Markdown parser.</p>';
            }
        });
    </script>
</body>
</html>`;

export let projects = '';
function set_projects(projects_list_string: string, description_list_string: string, components_list_string: string, components_description_list_string: string){
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
            <button id="showAll">Show All</button>
            <button id="hideAll">Hide All</button>
        </div>
        <div class="container">
            <h2>Solutions</h2>
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
            
            const projects = ${projects_list_string};
            const projects_description = ${description_list_string};
            const components = ${components_list_string};
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
                            <p>$\{projects_description[index]\}.</p>
                        </div>
                        <div class="item-buttons">
                            <button>Import</button>
                            <button id="viewButton" class="view-button" onclick="vscode.postMessage({ command: 'buttonClick' });">View</button>
                        </div>
                    \`;
                    projectList.appendChild(projectItem);
                });
                const componentList = document.getElementById('componentList');

                let projectOpen = true;
                let buttonState = projectOpen ? 'enabled' : 'disabled';
                console.log('buttonState ' + buttonState);
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
                            <select id="versionSelect">
                                <option value="1">Version 1</option>
                                <option value="2">Version 2</option>
                                <option value="3">Version 3</option>
                            </select>
                            <button disabled>Add to project</button>
                            <button id="viewButton" class="view-button" onclick="vscode.postMessage({ command: 'buttonClick' });">View</button>

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

            // function toggleItems(section) {
            //     const items = document.querySelectorAll(\`#$\{section\}List .item.hidden\`);
            //     const button = document.getElementById(\`$\{section}Toggle\`);
            //     if (items.length > 0) {
            //         items.forEach(item => item.classList.remove('hidden'));
            //         button.textContent = 'Show Less';
            //     } else {
            //         const allItems = document.querySelectorAll(\`#$\{section\}List .item\`);
            //         allItems.forEach((item, index) => {
            //             if (index >= 2) item.classList.add('hidden');
            //         });
            //         button.textContent = 'Show More';
            //     }
            // }

            // Generate the item lists on page load
            window.onload = generateItemList;
        </script>
    </body>
    </html>
    `
}