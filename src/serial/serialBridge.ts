import { EventEmitter } from 'events';

class SerialEmitter extends EventEmitter {}

export const serialEmitter = new SerialEmitter();