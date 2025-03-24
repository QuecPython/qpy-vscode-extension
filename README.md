# QuecPython

Extension for handling interaction with QuecPython based modules. Communicate with Python based Quectel modules using the built-in REPL or AT CLI. Besides serial communication, extension provides out-of-the box module file system preview in a tree view. Users are free to opt using commands from the extension UI or execute raw commands via REPL.

- Works with Windows only at the moment.

## Requirements
- NodeJS installed on your system (12 or higher) - [NodeJS](https://nodejs.org)

## Supported Modules
- Support all QuecPython modules.

## Usage

- Check [User Guide](https://python.quectel.com/doc/Application_guide/en/dev-tools/VSCode-Plugin-quecpython/index.html) on our site.

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

To compile:

    npm install -g vsce
    vsce package

## Release Notes
## 1.1.1
- compatible with vs code 1.98.1 or higher
- udpate list of modules
- fix minor issues
## 1.1.0
- compatible with vs code 1.98.1 or higher
- fix minor issue
## 1.0.13
- compatible with vs code 1.95.3 or higher
- fix create multiple dirs
- fix minor issue
## 1.0.12
- fix issue with firmware zip files
- update firmware download tool
- fix issue with EC200A module
## 1.0.11
- update dependecies
- remove clear project button
## 1.0.10
- Fix issues with flashing online firmware
- Fix issues with autocomplete
- Update libraries

## 1.0.8
- New feature for flashing firmware fool-proofing.
- Add log output function (console & file)
- Fix issues with flashing online firmware

## 1.0.7
- Fixed issues with create directory and remove directory commands probability failed.
- Added repl and flash firmware feature for supported module (support for all QuecPython modules).
- supported module list : [	'EC600N', 'EC800N', 'EC200N', 'EG915N', 'EG912N', 'EC800K', 'EC600K','EG800M', 'EG810M', 'EC600M','EC600U',  'EC200U',  'EG915U', 'EG912U', 'EC600G', 'EC800G','EC600E', 'EC800E','EC200A','BC25','BG95', 'BG600L','FCM360W', 'FC41D'],
- new feature for download and flash online firmware. burning firmware can be selected directly on vscode. The plugin will automatically download the correct firmware from the official QuecPython official website according to the selected module and firmware version.
- new feature for display content of connect serial port. add `connect` button on status bar, and click `connect` button to open the serial port directly instead of selecting the module first.

## 1.0.6
- Fixed issues with repl
- 
## 1.0.5
- Improved stability for firmware operations

## 1.0.4
- Added support for EC600U modules
- Added support for firmware flashing for EC600U modules
- Improved stability for file system tree view

## 1.0.3
- Added support for EC600S_CNLA and EC600S_CNLB
- Added firmware flashing feature for supported modules

## 1.0.2
- Fixed issue with downloading files
- Fixed issues with connectivity

## 1.0.1
- Fixed issue with removing directory
- Fixed issue with removing files

## 1.0.0
- Initial version of QuecPython VSCode Extension


new feature about directly burning online firmware

According to the prompts, you can directly select the firmware provided by QuecPython on the vscode page.

After selecting the module and firmware version you want to burn, You can directly burn the selected firmware.

In addition, local firmware files can also be selected for burning.

