import { log } from './userInterface';

 let projects_list = [
    "Project 1",
    "Project 2",
    "Project 3",
    "Project 4",
    "Project 5",
    "Project 6"
];
let projects_list_string = '\[' + projects_list.map(item => `\"${item}\"`).join(', ') + '\]';

let components_list = [
    "Component 1",
    "Component 2",
    "Component 3",
    "Component 4",
    "Component 5",
    "Component 6"
];
let components_list_string = '\[' + components_list.map(item => `\"${item}\"`).join(', ') + '\]';

export const projects = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Projects and Components</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
        }
        .container {
            width: 80%;
            max-width: 800px;
            margin: auto;
        }
        .search-bar {
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            box-sizing: border-box;
        }
        .item-list {
            list-style-type: none;
            padding: 0;
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
    <div class="container">
        <h2>Projects</h2>
        <input type="text" class="search-bar" id="projectSearchBar" placeholder="Search projects..." onkeyup="filterProjects()">
        <ul class="item-list" id="projectList"></ul>
        <button id="projectToggle" onclick="toggleItems('project')">Show More</button>
        
        <h2>Components</h2>
        <input type="text" class="search-bar" id="componentSearchBar" placeholder="Search components..." onkeyup="filterComponents()">
        <ul class="item-list" id="componentList"></ul>
        <button id="componentToggle" onclick="toggleItems('component')">Show More</button>
    </div>
    <script>
        const projects = ${projects_list_string};

        const components = ${components_list_string};

        function generateItemList() {
            const projectList = document.getElementById('projectList');
            const componentList = document.getElementById('componentList');

            projects.forEach((project, index) => {
                const projectItem = document.createElement('li');
                projectItem.className = 'item';
                if (index >= 2) projectItem.classList.add('hidden');
                projectItem.innerHTML = \`
                    <div class="item-details">
                        <h3>$\{project\}</h3>
                        <p>Description of $\{project\}.</p>
                    </div>
                    <div class="item-buttons">
                        <button>Import</button>
                        <button>View</button>
                    </div>
                \`;
                projectList.appendChild(projectItem);
            });

            components.forEach((component, index) => {
                const componentItem = document.createElement('li');
                componentItem.className = 'item';
                if (index >= 2) componentItem.classList.add('hidden');
                componentItem.innerHTML = \`
                    <div class="item-details">
                        <h3>$\{component\}</h3>
                        <p>Description of $\{component\}.</p>
                    </div>
                    <div class="item-buttons">
                        <button>Import</button>
                        <button>View</button>
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

        function toggleItems(section) {
            const items = document.querySelectorAll(\`#$\{section\}List .item.hidden\`);
            const button = document.getElementById(\`$\{section}Toggle\`);
            if (items.length > 0) {
                items.forEach(item => item.classList.remove('hidden'));
                button.textContent = 'Show Less';
            } else {
                const allItems = document.querySelectorAll(\`#$\{section\}List .item\`);
                allItems.forEach((item, index) => {
                    if (index >= 2) item.classList.add('hidden');
                });
                button.textContent = 'Show More';
            }
        }

        // Generate the item lists on page load
        window.onload = generateItemList;
    </script>
</body>
</html>

`
export const packages = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Package List</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
        }
        .container {
            width: 80%;
            max-width: 800px;
            margin: auto;
        }
        .search-bar {
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            box-sizing: border-box;
        }
        .package-list {
            list-style-type: none;
            padding: 0;
        }
        .package-item {
            border: 1px solid #ccc;
            padding: 20px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .package-details {
            flex-grow: 1;
        }
        .package-buttons {
            display: flex;
            gap: 10px;
        }
        .package-buttons button {
            padding: 10px 20px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <input type="text" class="search-bar" placeholder="Search packages..." onkeyup="filterPackages()">
        <ul class="package-list" id="packageList"></ul>
    </div>
    <script>
        const packages = [
            "wiki",
            "Community-document",
            "QPYcom",
            "toolchain",
            "FactoryTool",
            "QuecPython_Ymodem",
            "solution-electricMeter",
            "solution-cloudBOX",
            "solution-tracker",
            "solution-DTU",
            "solution-POC",
            "solution-student-card",
            "solution-eleBicycleChargingPile",
            "modules",
            "solution-gateMonitor",
            ".github",
            "example_tcp_client",
            "example_udp",
            "example_http_client",
            "jtt808",
            "gt06"
        ];

        function generatePackageList() {
            const packageList = document.getElementById('packageList');
            packages.forEach(pkg => {
                const listItem = document.createElement('li');
                listItem.className = 'package-item';
                listItem.innerHTML = \`
                    <div class="package-details">
                        <h3>$\{pkg\}</h3>
                        <p>Description of $\{pkg\}.</p>
                    </div>
                    <div class="package-buttons">
                        <button>Import</button>
                        <button>View</button>
                    </div>
                \`;
                packageList.appendChild(listItem);
            });
        }

        function filterPackages() {
            const searchInput = document.querySelector('.search-bar').value.toLowerCase();
            const packageItems = document.querySelectorAll('.package-item');
            
            packageItems.forEach(item => {
                const title = item.querySelector('h3').textContent.toLowerCase();
                const description = item.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(searchInput) || description.includes(searchInput)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        // Generate the package list on page load
        window.onload = generatePackageList;
    </script>
</body>
</html>
`;
