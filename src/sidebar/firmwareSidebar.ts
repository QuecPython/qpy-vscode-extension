import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import getNonce from '../utils/getNonce';
import { firmwareFlash } from '../sidebar/firmwareDownload';
import axios from 'axios';
import { sleep } from '../utils/utils';
import { executeBatScript, log } from '../api/userInterface';
import { moduleList, fwConfig } from '../utils/constants';
import { SerialPort } from 'serialport';


const fwJsonPath: string = path.join(__dirname, '..', '..', 'config');
const fwConfigFile: string = fwJsonPath + '\\qpy_fw.json';
const newFwPath = {
	path: "",
	url: "",
	module: "",
	downloadflag: false
};

export default class FirmwareViewProvider
	implements vscode.WebviewViewProvider
{
	public static readonly viewType = 'qpyProject';

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
			const rawFwConfig = fs.readFileSync(fwConfigFile);
			const parsedFwConfig = JSON.parse(rawFwConfig.toString());
			const getFirmwareConfig = {action: "get_download_by_sec", title: ""};
			let onlineUrl: string = "";
			let selectVersionList: any = [];
			let onlineUrlall: any = {};
			let platform = undefined;
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

						// log(moduleList.url[0], getFirmwareConfig);

						axios.postForm(moduleList.url[0], getFirmwareConfig).then(response => {
							if (response.status !== 200) {
								vscode.window.showErrorMessage('Unable to get online firmware!');
								return;
							} else {
								const firmwareConfig = response.data;
								let dwList = firmwareConfig['data']['download'];
								if (dwList.length === 0) {
									vscode.window.showErrorMessage('No online firmware available!');
									return;
								}else {
									dwList.forEach((item) => {
										const platformStr = item['title'].toString().replaceAll("_", "");
										if (platformStr.includes(module)){
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
							log(JSON.stringify(onlineUrlall));
							if (selectVersionList.length > 0) {
								break;
						  	} else{
								await sleep(50);
							}
						  };
						if (selectVersionList.length === 0) {
							vscode.window.showErrorMessage('No online firmware available!');
							return;
						  }
						onlineUrl = await vscode.window.showQuickPick(selectVersionList, {
							placeHolder: 'Select Firmware Version',
						});

						if (onlineUrl === undefined) {
							return;
						};

						parsedFwConfig["path"] = "";
						parsedFwConfig["module"] = module;
						parsedFwConfig["url"] =  onlineUrlall[onlineUrl];
						parsedFwConfig["downloadflag"] = false;
						fs.writeFile(fwConfigFile, JSON.stringify(parsedFwConfig), err => {
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
								newFwPath["module"] = "";
								fs.writeFile(fwConfigFile, JSON.stringify(newFwPath), err => {
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
					} else {
						let downloadPort: string = undefined;
						let atPort: string = undefined;
						const portPaths = await executeBatScript();
						if (portPaths.length < 1) {
							vscode.window.showErrorMessage('No serial devices found');
							return;
						}
						log(portPaths.join(" "));
						portPaths.forEach(element => {
							if (element.includes('Quectel USB AT Port')) {
								downloadPort = element.split(' (')[1].slice(0, -1);
								atPort = element.split(' (')[1].slice(0, -1);
							}
							if (element.includes('Quectel USB DM Port')) {
								downloadPort = element.split(' (')[1].slice(0, -1);
								portPaths.forEach(e => {
									if (e.includes('Quectel USB Modem')) {
										atPort = e.split(' (')[1].slice(0, -1);
									}
								});
							}
						});

						if (downloadPort === undefined) {
							downloadPort = await vscode.window.showQuickPick(portPaths, {
								placeHolder: 'Select AT (firmware download) port',
							});
						};
						if (downloadPort === undefined) {
							vscode.window.showErrorMessage('Serial port abnormality. Please reset the Module.');
							return;
						};

						log(JSON.stringify(parsedFwConfig));
						// 发送AT 确认版本是否与固件一致
						let matchVer = false;
						let atRet: String = "";
						let atGetVersion: SerialPort = new SerialPort(
							{
								path: atPort,
								baudRate: 115200,
								dataBits: 8,
								parity: 'none',
								stopBits: 1,
								rtscts: true,
								xon: true,
								xoff: true,
								xany: true,
								highWaterMark: 1024,
							}
						);
						atGetVersion.open(() => {
							atGetVersion.write(fwConfig.atGetVer);
						});
						atGetVersion.on('data', (atData: Buffer) => {
							const asciiData = atData.toString('ascii');
							atRet +=  asciiData;
							if (asciiData.includes('OK')) {
								atGetVersion.close();
								log(atRet);
								// local firmware  需要弹窗供客户选择是否可继续下载
								if (parsedFwConfig["module"] === ""){
									//通过at返回版本信息再根据模组表匹配获取具体型号
									atRet.split('\r\n').forEach((item) => {
										if (item.includes('QPY')) {
											moduleList.all.forEach((item1) => {
												if (item.includes(item1)) {
													if (['FCM360W', 'FC41D'].includes(item1)) {
														parsedFwConfig["module"] = item1;
													} else {
														moduleList.platform[item1.toLowerCase()].forEach(item2 => {
															if (item2 === "") {
																if (item.includes("BC25PA")) {
																	parsedFwConfig["module"] = item1;
																}
															} else {
																if (item.includes(item2)) {
																	parsedFwConfig["module"] = item1 + item2;
																}
															}
														});
													};
												}
											});
											log(parsedFwConfig["module"]);
										};
									});
									// TODO 新版本估计需要通过json解析模组平台和型号来判断是否支持
									if (parsedFwConfig["module"] === ""){
										matchVer = false;
									} else {
										if (data.value.replace(/_/g, "").includes(parsedFwConfig["module"])) {
											matchVer = true;
										} else {
											matchVer = false;
										}
									};
									if (matchVer) {
										firmwareFlash(data.value, downloadPort);
									} else {
										log("matchVer:", matchVer);
										vscode.window.showInformationMessage('Inconsistent firmware and module model, Do you want to continue?', { modal: true }, 'Yes', 'No').then((selection) => {
											if (selection === 'Yes') {
												firmwareFlash(data.value, downloadPort);
												log('User chose to continue flash local firmware.');
											} else {
												log('User cancelled the operation (flash local firmware).');
												return;
											}
										});
									};
								} else {
								// online firmware
									if (atRet.replace(/_/g, "").includes(parsedFwConfig["module"])) {
										matchVer = true;
									};
									if (matchVer){
										log('Firmware version match success');
										firmwareFlash(data.value, downloadPort);
									} else {
										vscode.window.showErrorMessage('Please select the firmware that matches the module model!');
									}
								}
							};
						});
					};
					break;
				}
				case 'fwLoad': {
					const rawFwConfig = fs.readFileSync(fwConfigFile);
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
			fs.writeFileSync(fwConfigFile, JSON.stringify({ path: '', module: '', url: "", downloadflag: false }));
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
	console.log("sideabr stat");
};
 