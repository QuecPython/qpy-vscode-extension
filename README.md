# QuecPython

Extension for handling interaction with QuecPython based modules. Communicate with Python based Quectel modules using the built-in REPL or AT CLI. Besides serial communication, extension provides out-of-the box module file system preview in a tree view. Users are free to opt using commands from the extension UI or execute raw commands via REPL.

- Works with Windows only at the moment.

## Requirements
- **NodeJS installed on your system (12 or higher)** https://nodejs.org

## Supported Modules

| Platform | Module model      |
| -------- | ----------------- | 
| ASR      | EC100Y<br/>EC600S | 
| RDA      | EC200U<br/>EC600U | 


## Usage

Open the serial connection by opening the commands palette the `CTRL+SHIFT+P` and running the command `QuecPython: Connect to COM Port`.

Upon successful connection, the terminal with open with either REPL or AT CLI depending on the chosen port. The board can be disconnected from the VSC by killing the active serial connection terminal. When manually closing the terminal (`x` on the right top of the terminal) the connection stays active.

## Extension Settings
This extension contributes the following settings for configuring it's usage:

* `QuecPython.defaultLineTerminator`: Text added to end of all sent lines. Will be appended to sent data but will not be rendered in terminal. Allows escape characters (\\r, \\n etc.), hex    representation (\\x6F, \\xF8 etc.) and unicode representation (\\u006F, \\u00F8 etc.)
* `QuecPython.translateHex`: Set to true to translate incomming hex data. Set to false to output raw hex.


## Known Issues

Nothing reported so far.

## Release Notes
### 1.0.0

Initial release of QuecPython VSCode Extension