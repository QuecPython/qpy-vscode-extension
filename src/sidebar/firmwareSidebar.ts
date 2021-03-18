import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import getNonce from '../getNonce';

const fwJsonPath: string = path.join(__dirname, '..', '..', 'config');
const fwConfig: string = fwJsonPath + '\\qpy_fw.json';

export default class FirmwareViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'qpyFirmware';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'fwSelect':
					{
						const options: vscode.OpenDialogOptions = {
							canSelectMany: false,
							openLabel: 'Select',
							canSelectFiles: true,
							canSelectFolders: false
						};
					   
					   vscode.window.showOpenDialog(options).then(fileUri => {
						   if (fileUri && fileUri[0]) {
								const newFwPath = {
									path: fileUri[0].fsPath
								};
								fs.writeFile(fwConfig, JSON.stringify(newFwPath), (err) => {
									if (err) {
										vscode.window.showErrorMessage('Unable to set selected firmware!');
										console.error(err);
									}

									vscode.window.showInformationMessage('New firmware selected!');
								});
								this.selectFirmware(fileUri[0].fsPath);
						   }
					   });
					   break;
					}
				case 'fwFlash':
					{
						vscode.window.showInformationMessage('FIRMARE FLASH METHOD');
						break;
					}
				case 'fwLoad':
					{
						const rawFwConfig = fs.readFileSync(fwConfig);
						const parsedFwConfig = JSON.parse(rawFwConfig.toString());
						this.selectFirmware(parsedFwConfig['path']);
						break;
					}
			}
		});
	}

	public clearFw() {
		if (this._view) {
			this.selectFirmware('');
			fs.writeFileSync(fwConfig, JSON.stringify({path: ""}));
			this._view.webview.postMessage({ type: 'clearFw' });
		}
	}

	public selectFirmware(fwPath: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: 'selectFw', data: fwPath});
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webviews', 'firmware', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webviews', 'firmware', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webviews', 'firmware', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webviews', 'firmware', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>Firmware Manager</title>
			</head>
			<body>
				<button class="select-fw">Select Firmware</button>
				<label class="fw-label">Selected Firmware:</label>
				<label class="fw-value"></label>
				<button class="flash-fw">Flash</button>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}
