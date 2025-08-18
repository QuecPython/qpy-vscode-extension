import * as vscode from 'vscode';
import { HtmlPanel } from '../packagePanel/htmlPanel';
import { log } from '../api/userInterface';

// Get user projects from any workspace
export function getUserProjects() {
    const config = vscode.workspace.getConfiguration('QuecPython');
    return config.get('userProjects', []);
}

export interface UserProject {
    id?: string;
    name: string;
    path: string;
    description: string;
};

function generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function removeUserProject(id: string) {
    const confirmation = await vscode.window.showWarningMessage(
        'Are you sure you want to remove this project?', 
        { modal: true },
        'Yes, Remove'
    );
    if (confirmation !== 'Yes, Remove') {
        vscode.window.showInformationMessage('Operation cancelled by user.');
        return;
    }
    const config = vscode.workspace.getConfiguration('QuecPython');
    const currentProjects: UserProject[] = config.get('userProjects', []);
    const project = currentProjects.find(project => project.id === id);

    const updatedProjects = currentProjects.filter(project => project.id !== id);
    
    // delete proejct files or show error message
    try {
        await vscode.workspace.fs.delete(vscode.Uri.file(project.path), { recursive: true, useTrash: false });
    } catch (error) {
        vscode.window.showErrorMessage('Project not found.');
    }
    await config.update('userProjects', updatedProjects, vscode.ConfigurationTarget.Global); // refresh page with new list
}

// Add a new project to the configuration
export async function addUserProject(projectData: UserProject) {
    projectData.id = generateUniqueId();

    const config = vscode.workspace.getConfiguration('QuecPython');
    const currentProjects = config.get('userProjects', []);
    
    currentProjects.push(projectData);
    
    // Update the configuration globally (across all workspaces)
    await config.update('userProjects', currentProjects, vscode.ConfigurationTarget.Global);
}

export async function getMyProjects(htmlPanel: HtmlPanel, page: string): Promise<void> {
    // Get the configuration
    const config = vscode.workspace.getConfiguration('QuecPython');
    const userProjects = config.get<any[]>('userProjects', []);
    // Example usage
    let stickyButtonsBackgroundColor = '#f8f9fa';

    // toggle colors by theme
    // 1 is light, 2 is black theme
    if (vscode.window.activeColorTheme.kind == 2){
        stickyButtonsBackgroundColor = '#0a0a0b';
    }

    // Import the component card style from html.ts if available, else define similar style here
    let innerHTML = `
        <div id="projects-list" style="width: 90%; max-width: 800px; margin: 30px auto;">
            <h2 style="margin-bottom: 24px;">Your QuecPython Projects</h2>
            <div style="display: flex; flex-direction: column; gap: 0;">
                ${
                    userProjects.length === 0
                        ? '<div style="font-size: 1.1em; color: #888;">No projects found.</div>'
                        : userProjects.map(project => `
                            <div class="item" style="margin-bottom: 0;">
                                <div class="item-details">
                                    <div style="font-weight: 600; font-size: 1.15em; margin-bottom: 6px;">${project.name}</div>
                                    <div style="color: #666; margin-bottom: 8px;">${project.description || ''}</div>
                                </div>
                                <div class="item-buttons">
                                    <button onclick="event.stopPropagation(); vscode.postMessage({ command: 'openProject', name: '${project.name}' });">Open Project</button>
                                    <button style="background-color: #d9534f;" onclick="event.stopPropagation(); vscode.postMessage({ command: 'removeFromList', id: '${project.id}' });">Remove from the list</button>
                                </div>
                            </div>
                        `).join('<br>\n')
                }
            </div>
        </div>
    `;
    return new Promise(async (resolve) => {

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

        .item-buttons button:disabled {
            background-color: rgb(100, 110, 120);
            color: #FFFFFF;
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

    </script>
</body>
</html>
        `;
        await htmlPanel._updatePanel(page, html);

        resolve();
    });
}
