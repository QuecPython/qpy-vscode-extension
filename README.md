# QuecPython Vs Code Extension

[![Version](https://img.shields.io/visual-studio-marketplace/v/Quectel.qpy-ide)](https://marketplace.visualstudio.com/items?itemName=Quectel.qpy-ide)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/Quectel.qpy-ide)](https://marketplace.visualstudio.com/items?itemName=Quectel.qpy-ide)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/Quectel.qpy-ide)](https://marketplace.visualstudio.com/items?itemName=Quectel.qpy-ide)

Extension for handling interaction with QuecPython based modules. Communicate with Python based Quectel modules using the built-in REPL or AT CLI. Besides serial communication, extension provides out-of-the box module file system preview in a tree view. Users are free to opt using commands from the extension UI or execute raw commands via REPL.

- Works with Windows only at the moment.

## ✨ Features

- 🎯 **Connect to Quectel Modules**: Connect and disconnect to different ports and modules
- 📁 **Open REPL Port**: Open 🔍 repl port and run different QuecPython commands
- 🔘 **Flash Firmware**: Select Firmware online from our stie and locally and flash it to your module
- ⌨️ **Transfer Files**: Transfer one more multiple files to your module
- 🌐 **Quectel Package Manager**: Import Quectel projects, add components to your project and view information about different solutions.
- ⚙️ **Run Script**: Run files and scripts directly from your module
- 📊 **File Treeview**: View list of files and directories on your module
- ✅ **Auto Complete**: Increase your productivity with our auto complete for QuecPython modules

# How to use

## Using Package manger with VS Code

1. From QuecPython menu -> Quick Access -> Quectel -> Projects + Components

<p>
  <img src="https://raw.githubusercontent.com/QuecPython/vscode-extension-issues/refs/heads/main/images/menu.png" alt="Select Menu">
</p>

2. List of Projects + Components will show in the panel
<p>
  <img src="https://raw.githubusercontent.com/QuecPython/vscode-extension-issues/refs/heads/main/images/main-panel.png" alt="Main Panel">
</p>

3. From the panel, you can view usig view button for a project of component, which will show readme + submodules for project or component.
<p>
  <img src="https://raw.githubusercontent.com/QuecPython/vscode-extension-issues/refs/heads/main/images/view-button.png" alt="Ciew Button">
</p>
<p>
  <img src="https://raw.githubusercontent.com/QuecPython/vscode-extension-issues/refs/heads/main/images/readme-info.png" alt="View Info">
</p>

<b>Note:</b> View button will always show the info of project, component or submodule.

4. From Main Panel, Import button will clone the project to your machine.

  - click import
<p>
  <img src="https://raw.githubusercontent.com/QuecPython/vscode-extension-issues/refs/heads/main/images/import-button.png" alt="Import Button">
</p>

  - choose where to save the project
  - please wait while the extension clone the project
  - when done, the extension will open the new project

<p>
  <img src="https://raw.githubusercontent.com/QuecPython/vscode-extension-issues/refs/heads/main/images/clone-done.png" alt="Clone Done">
</p>

5. From Main Panel, Add to project button will clone the submodule to your current open project.

<p>
  <img src="https://raw.githubusercontent.com/QuecPython/vscode-extension-issues/refs/heads/main/images/add-to-project.png" alt="Add to Project">
</p>

<b>Note 1:</b> Add to project will work only when there's an open project already.
If there's no project open, the button will be disabled.

<b>Note 2:</b> Add to project and these submodules can be used and cloned with any of client QuecPython projects or with our projects from our github.

6. Banner buttons, and search fields are give a better experience while using the extension

<p>
  <img src="https://raw.githubusercontent.com/QuecPython/vscode-extension-issues/refs/heads/main/images/banner-buttons.png" alt="Banners Buttons">
</p>

  - Show all / Hide All: Show or Hide all the items from projects + components list.
  - New Project: Create a new project.
  - Home: Redirect to main page (Not active when user is alraedy at main page).
  - Back: go back to previouse page (active only when previouse page is avilable).
  - Search Projects / Components: search the list of Projects or Components.
  - Show More:show the list of Projects or Components.

## Extension Requirements
- NodeJS installed on your system (12 or higher) - [NodeJS](https://nodejs.org)

## Supported Modules
- Support all QuecPython modules.

## Usage

- Check [User Guide](https://developer.quectel.com/doc/quecpython/Application_guide/en/dev-tools/VSCode-Plugin-quecpython/index.html) on our site.

Open the serial connection by opening the commands palette the `CTRL+SHIFT+P` and running the command `QuecPython: Connect to COM Port`.
or click statusbar button `Connect`.

Upon successful connection, the terminal will open with either REPL or AT CLI depending on the chosen port. The board can be disconnected from the VSC by killing the active serial connection terminal. When manually closing the terminal (`x` on the right top of the terminal) the connection stays active.

## Extension Settings

This extension contributes the following settings for configuring it's usage:

* `QuecPython.defaultLineTerminator`: Text added to end of all sent lines. Will be appended to sent data but will not be rendered in terminal. Allows escape characters (\\r, \\n etc.), hex    representation (\\x6F, \\xF8 etc.) and unicode representation (\\u006F, \\u00F8 etc.)
* `QuecPython.translateHex`: Set to true to translate incomming hex data. Set to false to output raw hex.

## Commands list

* `openConnection` - Opens a connection with a serial port of choice
* `closeConnection` - Closes currently open connection
* `qpy-ide.clearTerminal` - Clears active terminal

## Flashing Firmware
It is possible to flash firmware using built-in activity bar `QuecPython`.
Steps for flashing are:
* Select firmware from the PC file system or select firmware from the online.
* Click `Flash` button

## Known Issues
* There are cases when file system does not appear on boot-up, if that happens, please manually refresh the file system tree view.

## Release Notes
Please Check CHANGELOG.md for release info