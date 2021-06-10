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
	mainPort: 'Quectel USB MI05 COM Port',
	mainEc600uPort: 'Quectel USB Serial-1 Port',
	mainEc600u: 'MI_08',
	mainDevice: 'MI_05',
	atEc600u: 'MI_02',
	atDevice: 'MI_03',
	productEc600u: '0901',
	productDevice: '6001',
};

export const fwConfig = {
	baud: '115200',
	downloadPorts: [
		'VID_2ECC&PID_3017',
		'VID_2ECC&PID_3004',
		'VID_0525&PID_A4A7',
	],
	atQdownload: 'at+qdownload=1\r\n',
};

export const status = {
	conn: 'statusConn',
	disc: 'statusDisc',
	startProg: 'startProgress',
	updateProg: 'updatePercentage',
	downFinish: 'downloadFinished',
};

export const scriptName = {
	fileDownloadScript: '\\QuecPyComTools.py',
	initTreeScript: '\\q_init_fs.py',
};

export const moduleList = {
	all: ['EC100Y', 'EC600S', 'EC600N', 'EC600U'],
	ec100y: 'EC100Y',
	ec600s: 'EC600S',
	ec600n: 'EC600N',
	ec600u: 'EC600U',
};

export const chiregex =
	/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
