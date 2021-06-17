# QuecPython

Extension for handling interaction with QuecPython based modules. Communicate with Python based Quectel modules using the built-in REPL or AT CLI. Besides serial communication, extension provides out-of-the box module file system preview in a tree view. Users are free to opt using commands from the extension UI or execute raw commands via REPL.

- Works with Windows only at the moment.

## Requirements
- **NodeJS installed on your system (12 or higher) -** [NodeJS](https://nodejs.org)
- **Python3 installed (3.2 or higher) -** [Python](https://www.python.org/)

## Supported Modules

| Platform | Module model      |
| -------- | ----------------- | 
| ASR      | EC100Y<br/>EC600S | 
| RDA      | EC600N<br/>EC600U | 


## Usage

Open the serial connection by opening the commands palette the `CTRL+SHIFT+P` and running the command `QuecPython: Connect to COM Port`.

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
* Select firmware from the PC file system
* Click `Flash` button

#### Note: When flashing EC600U modules, there will be a pop-up window promting you to confrim firmware flashing.
#### Note: Only one module can be flashed simultaneously.

## Known Issues

* There are cases that carret `'>>>'` does not appear on boot-up, if that happens, press `ENTER` key.
* There are cases when file system does not appear on boot-up, if that happens, please manually refresh the file system tree view.

## Release Notes
### 1.0.5
- Improved stability for firmware operations
### 1.0.4
- Added support for EC600U modules
- Added support for firmware flashing for EC600U modules
- Improved stability for file system tree view
### 1.0.3
- Added support for EC600S_CNLA and EC600S_CNLB
- Added firmware flashing feature for supported modules
### 1.0.2

- Fixed issue with downloading files
- Fixed issues with connectivity
### 1.0.1

- Fixed issue with removing directory
- Fixed issue with removing files
### 1.0.0

- Initial version of QuecPython VSCode Extension