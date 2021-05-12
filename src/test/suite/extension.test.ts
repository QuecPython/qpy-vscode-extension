import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite("QuecPython: Extension Tests", () => {
    test('Extension Init', function(done) {
        this.timeout(60 * 1000);
        const extension = vscode.extensions.getExtension('Quectel.qpy-ide');
        if (!extension.isActive) {
            extension.activate().then((api) => {
                done();
            }, () => {
                done('Failed to activate extension');
            });
        } else {
            done();
        }
    });

    test('Command Registry', async () => {
        return vscode.commands.getCommands(true).then((commands) => {
            const QUECPYTHON_COMMANDS = [
                'qpy-ide.refreshModuleFS',
                'qpy-ide.openConnection',
                'qpy-ide.closeConnection',
                'qpy-ide.downloadFile',
                'qpy-ide.selectiveDownloadFile',
                'qpy-ide.setLineEnd',
                'qpy-ide.toggleHexTranslation',
                'qpy-ide.clearTerminal',
                'qpy-ide.runScript',
                'qpy-ide.removeFile',
                'qpy-ide.removeDir',
                'qpy-ide.createDir',
            ];

            const foundQpyCommands = commands.filter((value) => {
                return QUECPYTHON_COMMANDS.indexOf(value) >= 0 || value.startsWith('qpy-ide.');
            });

            const errorMsg = 'Some QuecPython commands are not registered properly or a new command is not added to the test';
            assert.strictEqual(foundQpyCommands.length, QUECPYTHON_COMMANDS.length, errorMsg);
        });
    });
});