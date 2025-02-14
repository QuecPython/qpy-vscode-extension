import * as vscode from 'vscode';
import { serialEmitter } from '../serial/serialBridge';
import { status } from '../utils/constants';

export const progressBar = (title: string): void => {
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title,
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
			vscode.window.showInformationMessage('Downloaded Successfully! Please restart the module!');
			resolve();
			clearInterval(interval);
		});

		childProcess.on(status.updateProg, (data) => {
			messageUpdate = data.toString();
		});

		childProcess.on(status.downFail, () => {
			resolve();
			clearInterval(interval);
			vscode.window.showErrorMessage('downloaded failed!');
		});

		token.onCancellationRequested(_ => resolve());
	});
};
