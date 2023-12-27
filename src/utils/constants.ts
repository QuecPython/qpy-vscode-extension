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
	mainBg95Port: 'Quectel USB NMEA Port',
	mainDmPort: 'Quectel USB DM Port',
	mainFCM360WPort: 'USB-Enhanced-SERIAL-B CH342',
	mainFCM360WDownloadPort: 'USB-Enhanced-SERIAL-A CH342',

};

export const portId = {
	mainEc600u: 'MI_08',
	mainBg95: 'MI_01',
	mainBg95Dm: 'MI_00',
	mainDevice: 'MI_05',
	atEc600u: 'MI_02',
	atDevice: 'MI_03',
	productEc600u: '0901',
	productBg95: '0700',
	productDevice: '6001',
	productfcm360w: '55D2',

};

export const fwConfig = {
	baud: '115200',
	downloadPorts: [
		'VID_2ECC&PID_3017',
		'VID_2ECC&PID_3004',
		'VID_0525&PID_A4A7',
		'VID_2C7C&PID_0700',
		'VID_1A86&PID_55D2',
	],

	download: '\\QuecPythonDownload.exe',
};

export const status = {
	conn: 'statusConn',
	disc: 'statusDisc',
	startProg: 'startProgress',
	updateProg: 'updatePercentage',
	downFinish: 'downloadFinished',
};

export const progLabel = {
	downloadFile: 'Downloading File',
	flashFw: 'Flashing Firmware',
};

export const scriptName = {
	fileDownloadScript: '\\QuecPyComTools.exe',
	initTreeScript: '\\q_init_fs.py',
	activateBat: "\\set_pythonpath.bat",
	portListBat: "\\get_com.bat",
};

export const moduleList = {
	all: ['EC100Y', 'EC600S', 'EC600N', 'EC600U',  'BG95', 'FCM360W'],
	ec100y: 'EC100Y',
	ec600s: 'EC600S',
	ec600n: 'EC600N',
	ec600u: 'EC600U',
	bg95: 'BG95',
	fcm360w: 'FCM360W',
};

export const chiregex =
	/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
