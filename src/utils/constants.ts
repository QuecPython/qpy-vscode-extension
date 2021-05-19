export const supportedBaudRates = [
	'1200',
	'2400',
	'4800',
	'9600',
	'14400',
	'19200',
	'38400',
	'57600',
	'115200',
	'230400',
	'256000',
	'460800',
	'921600',
];

export const cmd = {
	listdir: '[LST]',
	ilistdir: '[IST]',
	runScript: '[RUN]',
	removeFile: '[RMF]',
	removeDir: '[RMD]',
	createDir: '[MKD]',
	downloadFile: '[DWF]',
	selectiveDownFile: '[SDW]',
	disconnect: 'SIG_TERM_9',
};

export const portNames = {
	atPort: 'Quectel USB AT Port',
	diagPort: 'Quectel USB DIAG Port',
	mainPort: 'USB Serial Device',
};

export const fwConfig = {
	baud: '115200',
	deviceDiagPort: 'MI_02',
	deviceAtPort: 'MI_03',
	deviceMainPort: 'MI_05',
	deviceDownloadPort: 'VID_2ECC&PID_3017',
	atQdownload: 'at+qdownload=1\r\n',
};

export const status = {
	conn: 'statusConn',
	startProg: 'startProgress',
	updateProg: 'updatePercentage',
	downFinish: 'downloadFinished'
};
