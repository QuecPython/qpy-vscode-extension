import SerialTerminal from "../serial/serialTerminal";
import * as vscode from 'vscode';
import { terminalRegistry } from "../extension";

export const getActiveSerial = (): SerialTerminal | undefined => {
	const activeTerminal = vscode.window.activeTerminal;

	if (activeTerminal === undefined) {
		vscode.window.showErrorMessage('No QPY device connected.');
		return;
	}

	if (!Object.keys(terminalRegistry).includes(activeTerminal.name)) {
		vscode.window.showErrorMessage(
			'Active terminal is not a registered serial terminal.'
		);
		return;
	}

	return terminalRegistry[activeTerminal.name];
};

export const setTerminalFlag = (cmdFlag = false, cmdFlagLabel = ''): void => {
    const st = getActiveSerial();
    st.cmdFlag = cmdFlag;
    st.cmdFlagLabel = cmdFlagLabel;
};
