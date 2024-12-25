import { spawn, exec } from 'child_process';
import * as path from 'path';
import { fwConfig, progLabel, status } from '../utils/constants';
import { serialEmitter } from '../serial/serialBridge';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as https from 'https';
import { sleep } from '../utils/utils';
import { log } from '../api/userInterface';


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
	filePath: string, downloadPort: string,
): Promise<void> {
	if (filePath.startsWith('http')){
		const rawFwConfig = fs.readFileSync(fwConfigPath);
		const parsedFwConfig = JSON.parse(rawFwConfig.toString());
		//已下载过文件
		if (parsedFwConfig['downloadflag'] === true) {
			vscode.window.showWarningMessage('The online firmware has already been downloaded.');
			// TODO 判断文件夹是否存在
			let filename = filePath.split('/').pop();
			log(filename);
			let dirPath =  path.join(fwDirPath, filename.slice(0, filename.length - 4));
			if (	
				filename.includes('EG915U') ||
				filename.includes('EG912U') ||
				filename.includes('EC600U') ||
				filename.includes('EC200U') 
				) {
				filePath = path.join(dirPath, filename.slice(0, filename.length - 4), filename.slice(0, filename.length - 4) + '.pac');
			} else if (
				filename.includes('EC600N') ||
				filename.includes('EC800N') ||
				filename.includes('EC200N') ||
				filename.includes('EG915N') ||
				filename.includes('EG912N') ||
				filename.includes('EC800M') ||
				filename.includes('EC600M') ||
				filename.includes('EC600G') ||
				filename.includes('EC800G') ||
				filename.includes('EC600K') ||
				filename.includes('EC800K') ||
				filename.includes('FCM360W') ||
				filename.includes('FC41D')
				) {
				filePath = path.join(dirPath, filename.slice(0, filename.length - 4), filename.slice(0, filename.length - 4) + '.bin');
			}else if (
				filename.includes('EC600E') ||
				filename.includes('EC800E') 
				) {
				filePath = path.join(dirPath, filename.slice(0, filename.length - 4), '\\at_command.binpkg');
			} else if (filename.includes('EC200A')) {
				filePath = path.join(dirPath, filename.slice(0, filename.length - 4), '\\Falcon_EVB_QSPI_Nor_LWG_Only_Nontrusted_PM802_LPDDR2.blf');	
			} else if (filename.includes('BG95') || filename.includes('BG600L')) {
				filePath = path.join(dirPath, filename.slice(0, filename.length - 4), '\\update\\firehose\\partition.mbn');
			};
		}else{
			vscode.window.showInformationMessage('Start download online firmware...');
			let filename = filePath.split('/').pop();
			let dirPath =  path.join(fwDirPath, filename.slice(0, filename.length - 4));
			await fs.mkdir(dirPath, { recursive: true }, (err) => {
				if (err) {
					console.error(err);
				} else {
					log('Temp firmware directory created successfully');
				}
			});
			await sleep(100);
			let downloadresult = await downloadFile(filePath, dirPath);
			if (downloadresult === true) {
				parsedFwConfig['downloadflag'] = true;
				fs.writeFile(fwConfigPath, JSON.stringify(parsedFwConfig), err => {
					if (err) {
						console.error(err);
						return;
					}});
			};
			// 解压文件夹
			const { execFile } = require('node:child_process');
			const childProcess = execFile("tar", ["-zxf", path.join(dirPath, filename), "-C", dirPath], (error, stdout, stderr) => {
				if (error) {
					throw error;
				}
			});
			// 新版本固件支持（bin固件）
			childProcess.on('close', (code) => {
				log(`website firmware unzip child process exited with code ${code}`);
				if (code === 0) {
					// vscode.window.showInformationMessage('File decompressed successfully.');
					// filePath = path.join(dirPath, filename.slice(0, filename.length - 4), filename.slice(0, filename.length - 4) + '.bin');
					if (	
						filename.includes('EG915U') ||
						filename.includes('EG912U') ||
						filename.includes('EC600U') ||
						filename.includes('EC200U') 
						) {
						filePath = path.join(dirPath, filename.slice(0, filename.length - 4), filename.slice(0, filename.length - 4) + '.pac');
					} else if (
						filename.includes('EC600N') ||
						filename.includes('EC800N') ||
						filename.includes('EC200N') ||
						filename.includes('EG915N') ||
						filename.includes('EG912N') ||
						filename.includes('EC800M') ||
						filename.includes('EC600M') ||
						filename.includes('EC600G') ||
						filename.includes('EC800G') ||
						filename.includes('EC600K') ||
						filename.includes('EC800K') ||
						filename.includes('FCM360W') ||
						filename.includes('FC41D')
						) {
						filePath = path.join(dirPath, filename.slice(0, filename.length - 4), filename.slice(0, filename.length - 4) + '.bin');
					}else if (
						filename.includes('EC600E') ||
						filename.includes('EC800E') 
						) {
						filePath = path.join(dirPath, filename.slice(0, filename.length - 4), '\\at_command.binpkg');
					} else if (filename.includes('EC200A')) {
						filePath = path.join(dirPath, filename.slice(0, filename.length - 4), '\\Falcon_EVB_QSPI_Nor_LWG_Only_Nontrusted_PM802_LPDDR2.blf');	
					} else if (filename.includes('BG95') || filename.includes('BG600L')) {
						filePath = path.join(dirPath, filename.slice(0, filename.length - 4), '\\update\\firehose\\partition.mbn');
					};
				} else {
					vscode.window.showErrorMessage('File decompression failed.');
					return;
				}
			});
		};
	};
	
	await sleep(1000);
	serialEmitter.emit(status.startProg, progLabel.flashFw);
	const { exec } = require('child_process');
	log(batScriptPath + fwConfig.download, " -d ", downloadPort, " -b ", "115200", " -f ", filePath);
	// const download = spawn(batScriptPath + fwConfig.download, ["-d", downloadPort, "-b", "115200", "-f", filePath], {cwd: fwDirPath, stdio: 'pipe'});
	const download = exec(batScriptPath + fwConfig.download + " -d " + downloadPort+" -b "+"115200"+" -f "+filePath, (error, stdout, stderr) => {
		if (error) {
		  console.error(`exec error: ${error}`);
		  return;
		};
	});
	log("download cmd run in child_process");
	let line = '';
	download.stdout.on('data', data => {
		line += data.toString();
		let index = line.indexOf('\n');
		while (index !== -1) {
			log(line.slice(10, index));
			serialEmitter.emit(status.updateProg, line.slice(10, index));
			line = line.slice(index + 1);
			index = line.indexOf('\n');
		};
		const result: string = data.toString(10, data.length);
	
	});

	download.on('close', code => {
		log(`firmware flash child process exited with code ${code}`);
		if (code === 0) {
			serialEmitter.emit(status.downFinish);
		} else {
			serialEmitter.emit(status.downFail);
		}
	});

	download.stderr.on('error', error => {
		log(`firmware flash child process stderr: ${error.message}`);
		serialEmitter.emit(status.downFail);
	});
};