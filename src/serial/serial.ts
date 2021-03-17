import SerialPort from 'SerialPort';

export function listComPorts(): string[] {
    const comPorts: string[] = [];

    SerialPort.list().then(
		(ports: any) => {
			ports.forEach((port: any) => {
				console.log(port);
				comPorts.push(port.path);
		 	});
		},
		(err: any) => {
		 	console.error('Error listing ports', err);
		}
	);

    return comPorts;
}