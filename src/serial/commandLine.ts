import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import * as Stream from 'stream';
import { serialEmitter } from './serialBridge';
import { chiregex, cmd } from '../utils/constants';
import { log } from '../api/userInterface';


export abstract class CommandLineInterface implements vscode.Pseudoterminal {
	// fire to write to terminal
	protected writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;

	// fire to close terminal
	protected closeEmitter = new vscode.EventEmitter<void>();
	onDidClose?: vscode.Event<number | void> | undefined =
		this.closeEmitter.event;

	// properties used for tracking and rendering terminal input
	private currentInputLine = '';
	private inputIndex = 0;

	// properties used for tracking data
	protected endsWithNewLine = false;

	// current size of terminal. Used for detecting line wraps to allow multi-line input
	private dimensions: vscode.TerminalDimensions | undefined;

	// keeps track of already sent data to enable arrow up/down to scroll through it
	private prevCommands: string[] = [];
	private prevCommandsIndex = 0;

	// flag to distinct internal commands from user commands
	public cmdFlag = false;
	public cmdFlagLabel = '';

	constructor(
		private backendStream: Stream.Duplex,
		private translateHex: boolean = true,
		private lineEnd: string = '\r\n'
	) {}

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
		this.dimensions = initialDimensions;
		this.backendStream.on('data', this.handleData);
		this.backendStream.on('error', this.writeError);
		this.saveCursor();
		this.updateInputArea();
	}

	close(): void {
		this.writeEmitter.dispose();
		this.closeEmitter.dispose();
	}

	// 移动光标到指定位置
	public moveCursorTo(row: number, column: number): void {
		const cursorMove = [row, column];
		this.writeEmitter.fire(`\x1B[${cursorMove[0]}A`);
		this.writeEmitter.fire(`\x1B[${cursorMove[1]}D`);
	}

	// 清除光标到行尾的所有字符
	public clearToEndOfLine(): void {
		this.writeEmitter.fire("\x1B[0K");
	}

	// 清除光标到行首的所有字符
	public clearToBeginningOfLine(): void {
		this.writeEmitter.fire("\x1B[0G");
	}
	
	protected handleData: (data: Buffer) => void = (data: Buffer) => {
		// check for UI driven command
		if (this.cmdFlag) {
			log(`${this.cmdFlagLabel}`, `${data.toString()}`);
			serialEmitter.emit(`${this.cmdFlagLabel}`, `${data.toString()}`);
			return;
		}

		this.setColor();
		// this.loadCursor();
		// this.clearScreen();

		let stringRepr = '';

		// check for command close signal
		if (data.toString() === cmd.disconnect) {
			this.closeEmitter.fire();
		}

		if (this.translateHex) {
			stringRepr = new TextDecoder('utf-8').decode(data);
		} else {
			// HEX format
			for (const byte of data) {
				if (
					this.dimensions &&
					stringRepr.length >= this.dimensions.columns - 3
				) {
					this.writeEmitter.fire('\r\n');
				}
				this.writeEmitter.fire(byte.toString(16).padStart(2, '0') + ' ');
			}
		}
		
		log('串口内容 : ',stringRepr);
		this.writeEmitter.fire(stringRepr);
	};

	public handleDataAsText(data: string): void {
		const thOld = this.translateHex;
		this.translateHex = true;
		this.handleData(Buffer.from(data));
		this.translateHex = thOld;
	}

	handleInput(data: string): void {
		let firstRun = true;
		let charsHandled = 0;

		// Ignore Chinese letters
		if (data.match(chiregex)) {
			return;
		}
		log('按键内容 : ', data);
		this.backendStream.write(data);
	}

	handleCmd(data: string): void{
		this.backendStream.write(data);
	}

	private updateCursor(index: number): void {
		this.loadCursor();
		this.moveCursor('d', 1);
		
		if (this.dimensions) {
			const lineDelta: number = Math.trunc(index / this.dimensions.columns);
			this.moveCursor('d', lineDelta);
			this.moveCursor('r', index % this.dimensions.columns);
		} else {
			this.moveCursor('r', index);
		}
	}

	private moveCursor(direction: 'u' | 'd' | 'l' | 'r', amount = 1): void {
		if (amount < 0) {
			throw new Error('Amount must be non-negative');
		}
		if (amount === 0) {
			return;
		}
		switch (direction) {
			case 'u': {
				this.writeEmitter.fire(`\u001b[${amount}A`);
				break;
			}
			case 'd': {
				this.writeEmitter.fire(`\u001b[${amount}B`);
				break;
			}
			case 'r': {
				this.writeEmitter.fire(`\u001b[${amount}C`);
				break;
			}
			case 'l': {
				this.writeEmitter.fire(`\u001b[${amount}D`);
				break;
			}
			default: {
				throw new Error('Invalid direction ' + direction);
			}
		}
	}

	private updateInputArea(): void {
		this.loadCursor();
		this.clearScreen();
		// this.writeEmitter.fire(this.currentInputLine);
		this.updateCursor(this.inputIndex);
	}

	// 保存光标位置
	private saveCursor(): void {
		this.writeEmitter.fire('\u001b[s');
	}

	// 恢复光标位置
	private loadCursor(): void {
		this.writeEmitter.fire('\u001b[u');
	}

	// 设置绿色（256 色终端）
	private setColor(): void {
		this.writeEmitter.fire('\u001b[38;5;118m');
	}

	private clearScreen(level = 0): void {
		// n = 0从光标清除到屏幕结束， n = 1从光标到屏幕的开头清除， n = 2清除整个屏幕
		this.writeEmitter.fire(`\u001b[${level}J`);
	}

	public clear(): void {
		this.prevCommandsIndex = this.prevCommands.length;
		this.inputIndex = 0;
		this.currentInputLine = '';
		this.writeEmitter.fire('\u001bc');
		this.saveCursor();
		this.updateInputArea();
	}

	protected writeError = (err: Error | null | undefined): void => {
		if (err) {
			this.writeEmitter.fire(
				('An error occured: ' + err.message).replace('\n', '\r\n')
			);
			console.error(err);
		}
	};

	setDimensions(newDims: vscode.TerminalDimensions): void {
		this.dimensions = newDims;
		this.updateInputArea();
	}

	public getDimensions(): vscode.TerminalDimensions | undefined {
		return this.dimensions;
	}

	public setLineEnd(le: string): void {
		this.lineEnd = le;
	}

	public setHexTranslate(state: boolean): void {
		this.translateHex = state;
	}

	public toggleHexTranslate(): void {
		this.setHexTranslate(!this.translateHex);
	}
}
