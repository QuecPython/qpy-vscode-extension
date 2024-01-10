import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import getNonce from '../utils/getNonce';
import { firmwareFlash } from '../sidebar/firmwareDownload';
import {moduleList} from '../utils/constants';
import axios from 'axios';
import { sleep } from '../utils/utils';



const fwJsonPath: string = path.join(__dirname, '..', '..', 'config');
const fwConfig: string = fwJsonPath + '\\qpy_fw.json';
const newFwPath = {
	path: "",
	url: "",
	downloadflag: false
};

export default class FirmwareViewProvider
	implements vscode.WebviewViewProvider
{
	public static readonly viewType = 'qpyFirmware';

	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async data => {
			const rawFwConfig = fs.readFileSync(fwConfig);
			const parsedFwConfig = JSON.parse(rawFwConfig.toString());
			const getFirmwareConfig = {action: "get_download_by_sec", title: ""};
			let onlineUrl: string = "";
			let selectVersionList: any = [];
			let onlineUrlall: any = {};
			switch (data.type) {
				case 'fwSelect': {
					const options: vscode.OpenDialogOptions = {
						canSelectMany: false,
						openLabel: 'Select',
						canSelectFiles: true,
						canSelectFolders: false,
					};
					let downloadType = undefined;
					downloadType = await vscode.window.showQuickPick(["Online Firmware", "Local Firmware"], {
						placeHolder: 'Select Firmware Type',
					});
					if (downloadType === undefined) {
						return;
					};
					if (downloadType === "Online Firmware") {
						vscode.window.showInformationMessage('Select Online firmware...');
						let platform = undefined;
						platform = await vscode.window.showQuickPick(moduleList.all, {
							placeHolder: 'Select Platform Type',
						});
					if (platform !== undefined) {
						let model = moduleList['platform'][platform.toLowerCase()];
						let modelList = [];
						let module = undefined;
						if (model.length === 0) {
							model = platform;
						} else {
							for (let i = 0; i < model.length; i++) {
								modelList[i] = platform + model[i];
							};
							module = await vscode.window.showQuickPick(modelList, {
								placeHolder: 'Select Model Type',
							});
						};
						
						// post获取固件参数
						if (['FCM360W', 'FC41D'].includes(platform)) {
							getFirmwareConfig["title"] = module;
						} else if (['BC25', 'BG95', 'BG900L'].includes(platform)) {
							if (module.length === 4) {
								getFirmwareConfig["title"] = module;
							} else {
								getFirmwareConfig["title"] = platform + "-" +  module.slice(module.length - 2, module.length);
							};
						} else {
							getFirmwareConfig["title"] = platform + "-" +  module.slice(6, 8);
						}

						console.info(moduleList.url[0], getFirmwareConfig);
						axios.postForm(moduleList.url[0], getFirmwareConfig).then(response => {
							if (response.status !== 200) {
								vscode.window.showErrorMessage('Unable to get online firmware!');
								return;
							} else {
								console.log(response);
								const firmwareConfig = response.data;
								console.info(firmwareConfig);
								let dwList = firmwareConfig['data']['download'];
								console.log(dwList);
								if (dwList.length === 0) {
									vscode.window.showErrorMessage('No online firmware available!');
									return;
								}else {
									dwList.forEach((item) => {
										const platformStr = item['title'].toString().replaceAll("_", "");
										console.info(platformStr, module);
										if (platformStr.includes(module)){
											// console.log(item['download_content']);
											const versionList = item['download_content'];
											versionList.forEach((version) => {
												selectVersionList.push(version['version']);
												onlineUrlall[version['version']] = version['download_file'];
											});
										};
										
									});
								}
							}
						
						})
						.catch((error) => {
							console.error(error);
						});
						for (var i = 0; i < 50; i++) {
							console.log(onlineUrlall);
							if (selectVersionList.length > 0) {
								break;
						  	} else{
								await sleep(50);
							}
						  };
						
						onlineUrl = await vscode.window.showQuickPick(selectVersionList, {
							placeHolder: 'Select Firmware Version',
						});

						// console.log(onlineUrlall[onlineUrl]);
						if (onlineUrl === undefined) {
							return;
						};

						parsedFwConfig["path"] = "";
						parsedFwConfig["url"] =  onlineUrlall[onlineUrl];
						parsedFwConfig["downloadflag"] = false;
						fs.writeFile(fwConfig, JSON.stringify(parsedFwConfig), err => {
							if (err) {
								vscode.window.showErrorMessage(
									'Unable to set selected online firmware!'
								);
								console.error(err);
							}
							vscode.window.showInformationMessage('New online firmware selected!');
						});
						this.selectFirmware(onlineUrlall[onlineUrl]);
					};
					};
					if (downloadType === "Local Firmware") {
						vscode.window.showInformationMessage('Select firmware...');
						vscode.window.showOpenDialog(options).then(fileUri => {
							if (fileUri && fileUri[0]) {
								newFwPath["path"] =  fileUri[0].fsPath;
								newFwPath["downloadflag"] = true;
								newFwPath["url"] = "";
								fs.writeFile(fwConfig, JSON.stringify(newFwPath), err => {
									if (err) {
										vscode.window.showErrorMessage(
											'Unable to set selected firmware!'
										);
										console.error(err);
									}
									vscode.window.showInformationMessage('New firmware selected!');
								});
								this.selectFirmware(fileUri[0].fsPath);
							}
						});
					};

					break;
				}
				case 'fwFlash': {
					if (data.value === undefined) {
						vscode.window.showErrorMessage('firmware not select!');
						return;
					}
					firmwareFlash(data.value);
					break;
				}
				case 'fwLoad': {
					const rawFwConfig = fs.readFileSync(fwConfig);
					const parsedFwConfig = JSON.parse(rawFwConfig.toString());
					if (parsedFwConfig['path'] === '') {
						this.selectFirmware(parsedFwConfig['url']);
					};
					if (parsedFwConfig['url'] === '') {
						this.selectFirmware(parsedFwConfig['path']);
					};
					break;
				}
			}
		});
	}

	public clearFw() {
		if (this._view) {
			this.selectFirmware('');
			fs.writeFileSync(fwConfig, JSON.stringify({ path: '', url: "", downloadflag: false }));
			this._view.webview.postMessage({ type: 'clearFw' });
		}
	}

	public selectFirmware(fwPath: string) {
		if (this._view) {
			this._view.webview.postMessage({ type: 'selectFw', data: fwPath });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'webviews', 'firmware', 'main.js')
		);

		// do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				'webviews',
				'firmware',
				'reset.css'
			)
		);
		const styleVSCodeUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				'webviews',
				'firmware',
				'vscode.css'
			)
		);
		const styleMainUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._extensionUri,
				'webviews',
				'firmware',
				'main.css'
			)
		);

		// use a nonce to only allow a specific script to be run.
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
};

export function activate() {

};
 