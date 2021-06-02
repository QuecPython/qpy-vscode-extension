import * as vscode from 'vscode';
import { serialEmitter } from '../serial/serialBridge';
import { status } from '../utils/constants';

export const progressBar = (): void => {
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Downloading file',
			cancellable: false,
		},
		async (progress, token) => {
			token.onCancellationRequested(() => {
				vscode.window.showInformationMessage('User canceled file download.');
			});
			return updateProgressBar(progress, token);
		}
	);
};

const updateProgressBar = (
	progress: vscode.Progress<{ message?: string; increment?: number }>,
	token: vscode.CancellationToken
): Promise<void> => {
	return new Promise<void>(resolve => {
		if (token.isCancellationRequested) {
			return;
		}

		let messageUpdate = 'Starting download.';
		let timerUpdate = 500;
		const interval = setInterval(
			() => progress.report({ message: messageUpdate }),
			timerUpdate
		);

		let childProcess = serialEmitter.on(status.downFinish, () => {
			resolve();
			clearInterval(interval);
		});

		childProcess.on(status.updateProg, data => {
			messageUpdate = data.toString() + '%';
		});

		token.onCancellationRequested(_ => resolve());
	});
};
