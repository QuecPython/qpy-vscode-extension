import SerialPort from 'SerialPort';
import * as vscode from 'vscode';
import { cmd } from '../utils/constants';
import { CommandLineInterface } from './commandLine';
import { serialEmitter } from './serialBridge';

export default class SerialTerminal extends CommandLineInterface {
    public serial: SerialPort;

    // Used to automatically attempt to reconnect when device is disconnected
    private reconnectInterval: NodeJS.Timeout | undefined;

    constructor(
        comPort: string,
        baudRate: number,
        translateHex = true,
        lineEnd?: string
    ) {
        const serial: SerialPort = new SerialPort(comPort, {
            autoOpen: false,
            baudRate: baudRate,
        });

        super(serial, translateHex, lineEnd);
        this.serial = serial;
    }

    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        super.handleDataAsText(
            `\rQuecPython Serial Terminal
            \rPort: ${this.serial.path}
            \rBaud rate: ${this.serial.baudRate} baud\r\n\n`
        );

        if (!this.serial.isOpen) {
            this.serial.open(this.writeError);
        }

        this.serial.on('close', (err) => {
            serialEmitter.emit('statusDisc');
            serialEmitter.emit(`${cmd.ilistdir}`, '');
            if (!this.endsWithNewLine) {
                this.handleDataAsText('\r\n');
            }

            this.handleDataAsText('Port closed.');
            if (err?.disconnected) {
                // Device was disconnected, attempt to reconnect
                this.handleDataAsText('Device disconnected.');
                this.reconnectInterval = setInterval(async () => {
                    // Attempt to reopen
                    const availablePorts = await SerialPort.list();
                    for (const port of availablePorts) {
                        if (port.path === this.serial.path) {
                            if (!this.endsWithNewLine) {
                                this.handleDataAsText('\r\n');
                            }
                            this.handleDataAsText(
                                `Device reconnected at port ${this.serial.path}.\r\n`
                            );
                            this.serial.open();
                            break;
                        }
                    }
                }, 1000);
            }
            this.handleDataAsText('\r\n');
        });

        this.serial.on('open', () => {
            serialEmitter.emit('statusConn');
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
            }
            this.readStatFiles();
        });

        super.open(initialDimensions);
    }

    public readStatFiles() {
        this.handleInput(`${cmd.ilistdir}for elem in uos.ilistdir('/usr'):\r\n`);
        this.handleInput(`${cmd.ilistdir}print(elem)\r\n`);
        this.handleInput(`${cmd.ilistdir}\r\n`);
        this.handleInput(`${cmd.ilistdir}\r\n`);
        this.handleInput(`${cmd.ilistdir}\r\n`);
    }

    close(): void {
        if (this.serial.isOpen) {
            this.serial.close((err) => {
                if (err) {
                    throw new Error(`Could not properly close serial terminal: ${err.message}`);
                }
            });
        }

        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
        }

        super.close();
    }
}
