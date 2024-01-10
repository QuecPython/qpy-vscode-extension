import { spawn } from 'child_process';
import * as path from 'path';
import { fwConfig, progLabel } from '../utils/constants';
import { serialEmitter } from '../serial/serialBridge';
import * as vscode from 'vscode';
import { status } from '../utils/constants';
import { executeBatScript } from '../api/userInterface';
import * as fs from 'fs';
import * as https from 'https';
import { sleep } from '../utils/utils';


const batScriptPath: string = path.join(__dirname, '..', '..', 'scripts');
const fwDirPath: string = path.join(__dirname, '..', '..', 'fw');
const fwJsonPath: string = path.join(__dirname, '..', '..', 'config');
const fwConfigPath: string = fwJsonPath + '\\qpy_fw.json';

async function downloadFile(url: string, savePath: string) {
	try {
		const filename = url.split('/').pop();
		const filePath = `${savePath}/${filename}`;
		serialEmitter.emit(status.startProg, progLabel.downloadOnlineFw);
		return new Promise((resolve, reject) => {
			https.get(url, response => {
				const contentLength = parseInt(response.headers['content-length']);
				const data = response.pipe(fs.createWriteStream(filePath));
				let downloadLength = 0;
				response.on('data', (chunk) => {
					downloadLength += chunk.length;
					const percent = Math.round((downloadLength / contentLength) * 100);
					serialEmitter.emit(status.updateProg, percent.toString() + "%");
			  	});
				data.on('finish', () => {
					serialEmitter.emit(status.downFinish);
					resolve(true);
				});
		
				data.on('error', error => {
					console.error('Error downloading file:', error);
					reject(false);
				});
			})
			.on("error", error => {
			  console.error('Error:', error);
			  reject(false);
			});
		  });
		
	  } catch (error) {
		if (error.code === 'ENOTFOUND') {
		  console.error('No internet connection.');
		} else {
		  console.error('Error downloading file:', error);
		}
	  }
};

export async function firmwareFlash(
	filePath: string
): Promise<void> {
	if (filePath.startsWith('http')){
		const rawFwConfig = fs.readFileSync(fwConfigPath);
		const parsedFwConfig = JSON.parse(rawFwConfig.toString());
		if (parsedFwConfig['downloadflag'] === true) {
			vscode.window.showWarningMessage('The online firmware has already been downloaded.');
			// TODO 判断文件夹是否存在
			let filename = filePath.split('/').pop();
			let dirPath =  path.join(fwDirPath, filename.slice(0, filename.length - 4));
			filePath = path.join(dirPath, filename.slice(0, filename.length - 4), filename.slice(0, filename.length - 4) + '.bin');

		}else{
			vscode.window.showInformationMessage('Start download online firmware...');
			let filename = filePath.split('/').pop();
			let dirPath =  path.join(fwDirPath, filename.slice(0, filename.length - 4));
			await fs.mkdir(dirPath, { recursive: true }, (err) => {
				if (err) {
					console.error(err);
				} else {
					console.log('Directory created successfully');
				}
			});
			await sleep(100);
			let downloadresult = await downloadFile(filePath, dirPath);
			if (downloadresult === true) {
				parsedFwConfig['downloadflag'] = true;
				fs.writeFile(fwConfigPath, JSON.stringify(parsedFwConfig), err => {
					if (err) {
						vscode.window.showErrorMessage('File downloaded failed!');
						console.error(err);
						return;
					}});
				vscode.window.showInformationMessage('File downloaded successfully.');
			};
			// 解压文件夹
			const { execFile } = require('node:child_process');
			const childProcess = execFile("tar", ["-zxf", path.join(dirPath, filename), "-C", dirPath], (error, stdout, stderr) => {
				if (error) {
					throw error;
				}
			});
			childProcess.on('close', (code) => {
				// console.log(`child process exited with code ${code}`);
				if (code === 0) {
					// vscode.window.showInformationMessage('File decompressed successfully.');
					filePath = path.join(dirPath, filename.slice(0, filename.length - 4), filename.slice(0, filename.length - 4) + '.bin');
				} else {
					vscode.window.showErrorMessage('File decompression failed.');
					return;
				}
			});
		};
	};

	let downloadPort: string = undefined;
	const portPaths = await executeBatScript();
	if (portPaths.length < 1) {
		vscode.window.showErrorMessage('No serial devices found');
		return;
	}
	portPaths.forEach(element => {
		if (element.includes('Quectel USB AT Port')) {
			downloadPort = element.split(' (')[1].slice(0, -1);
		}
		if (element.includes('Quectel USB DM Port')) {
			downloadPort = element.split(' (')[1].slice(0, -1);
		}
	});
	
	
	if (downloadPort === undefined) {
		downloadPort = await vscode.window.showQuickPick(portPaths, {
			placeHolder: 'Select firmware download port',
		});
	}
	if (downloadPort === undefined) {
		vscode.window.showErrorMessage('Serial port abnormality. Please reset the Module.');
		return;
	} else {
		serialEmitter.emit(status.startProg, progLabel.flashFw);
	}

	const download = spawn(batScriptPath + fwConfig.download, ["-d", downloadPort, "-b", "115200", "-f", filePath], {cwd: fwDirPath});
	
	download.stdout.on('data', data => {
		console.info(data.toString());
		console.info(data.toString().length);
		console.info(data.toString(10, data.toString().length));
		// const result: string = data.toString(10, data.length);
		// console.log(result);
		// serialEmitter.emit(status.updateProg, result);
		
	});

	download.on('close', code => {
		console.log(`child process exited with code ${code}`);
		if (code === 0) {
			serialEmitter.emit(status.downFinish);
		} else {
			serialEmitter.emit(status.downFail);
		}
	});

	download.stderr.on('error', error => {
		console.log(`stderr: ${error.message}`);
		serialEmitter.emit(status.downFail);
	});
};