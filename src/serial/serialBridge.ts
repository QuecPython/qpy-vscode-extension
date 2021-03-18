import { EventEmitter } from 'events';
// import { StatusBarItem } from 'vscode';
// import SerialPort from 'SerialPort';


class SerialEmitter extends EventEmitter {}

export const serialEmitter = new SerialEmitter();