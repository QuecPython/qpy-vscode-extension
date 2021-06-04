// @ts-nocheck

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    document.querySelector('.select-fw').addEventListener('click', () => {
        selectFirmware();
    });

    document.querySelector('.flash-fw').addEventListener('click', () => {
        flashDevice();
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'selectFw':
                {
                    document.querySelector('.fw-value').innerHTML = `${message.data}`; 
                    break;
                }
            case 'clearFw':
                {
                    document.querySelector('.fw-value').innerHTML = ``; 
                    break;
                }
            case 'loadFw': 
                {
                    loadFirmware();
                }
        }
    });

    function selectFirmware() {
        vscode.postMessage({ type: 'fwSelect' });
    }

    function flashDevice() {
        vscode.postMessage({ type: 'fwFlash' });
    }

    function loadFirmware() {
        vscode.postMessage({ type: 'fwLoad' });
    }

    loadFirmware();

}());


