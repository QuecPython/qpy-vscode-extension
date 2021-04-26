import * as vscode from 'vscode';
import { serialEmitter } from '../serial/serialBridge';

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

		let childProcess = serialEmitter.on('downloadFinished', () => {
			resolve();
			clearInterval(interval);
		});

		childProcess.on('statusDisc', () => {
			resolve();
			clearInterval(interval);
		});

		childProcess.on('updatePercentage', data => {
			const p = percentageParser(data.dataLen, data.index);
			messageUpdate = p.toString() + '%';
		});

		token.onCancellationRequested(_ => resolve());
	});
};

const percentageParser = (total: number, step: number): number => {
	const percentDecimal = (step * 100) / total;
	const percent = Math.round(percentDecimal);
	return percent;
};
