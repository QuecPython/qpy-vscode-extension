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
	atGetVer: 'AT+CGMR\r\n',
	download: '\\QuecPythonDownload.exe',
	tar: '\\tar.exe' // used to unzip files
};

export const status = {
	conn: 'statusConn',
	disc: 'statusDisc',
	startProg: 'startProgress',
	updateProg: 'updatePercentage',
	downFinish: 'downloadFinished',
	flashFinish: 'flashFinished',
	downFail: 'download failed',
};

export const progLabel = {
	downloadFile: 'Downloading File',
	flashFw: 'Flashing Firmware',
	downloadOnlineFw: 'download Online Firmware',
};

export const scriptName = {
	fileDownloadScript: '\\QuecPyComTools.exe',
	initTreeScript: '\\q_init_fs.py',
	activateBat: "\\set_pythonpath.bat",
	portListBat: "\\get_com.exe",
	logFile: "\\extension.log"
};

export const moduleList = {
	all: [	'EC600N', 'EC800N', 'EC200N', 'EG915N', 'EG912N', 
			'EC800K', 'EC600K',
			'EC800M', 'EG810M', 'EC600M',
			'EC600U',  'EC200U',  'EG915U', 'EG912U', 
			'EC600G', 'EC800G',
			'EC600E', 'EC800E',
			'EC200A',
			'BC25',
			'BG95', 'BG600L',
			'FCM360W', 'FC41D',
		],
	platform: {
		ec600n: ['CNLA', 'CNLC', 'CNLD', 'CNLE', 'CNLF'],
		ec600m: ['EULA', 'CNCCEXT', 'CNLE', 'CNLF'],
		ec800n: ['CNLA'],
		ec800m: ['CNCC', 'CNGA', 'CNGB', 'CNGD', 'CNLE', 'CNLF'],
		ec200n: ['CNAC', 'CNLA'],
		eg915n: ['EUAC', 'EUAG', 'EAAC'],
		eg912n: ['ENAA'],
		ec800k: ['CNLC'],
		ec600k: ['CNLC'],
		ec600u: ['CNLB', 'CNLBBT', 'CNLBEXTFS8M', 'CNLC', 'CNLCEXTFS8M', 'EUAB'],
		ec200u: ['CNLA', 'CNLB', 'CNAA', 'EUAA', 'EUAB', 'AUAA', 'AUAB'],
		eg915u: ['EUAB', 'LAAB', 'EAAC'],
		eg912u: ['GLAA', 'GLAC'],
		ec600g: ['CNLD'],
		ec800g: ['CNLD', 'CNLB'],
		ec600e: ['CNLC', 'CNLCAUDIO'],
		ec800e: ['CNLC', 'CNLCAUDIO'],
		ec200a: ['CNDA', 'CNHA', 'AUHA', 'EUHA', ],
		bc25: ['', 'B5', 'B8'],
		bg95: ['M1', 'M3', 'M6', 'M8', 'M9'],
		eg810m: ['EULA'],
		bg600l: ['M3'],
		fcm360w: [],
		fc41d: []
		},
	url: ["https://python.quectel.com/wp-admin/admin-ajax.php", "https://python.quectel.com/en/wp-admin/admin-ajax.php"]
};

export const chiregex =
	/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
