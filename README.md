## QuecPython

Extension for handling interaction with QuecPython native modules.

### Supported Modules

| Platform | Module model      | Download command                                             | Description                                                  |
| -------- | ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| ASR      | EC100Y<br/>EC600S | adownload.exe [OPTION]... [FILE]<br/>e.g. download.exe -p COM1 -a -s 115200 aboot.zip | -h, --help            Display this help and exit  <br/> -p, --port=port       Use named serial ports separate with comma  <br/> -a, --auto-enable     Or auto enable arom usb ports device  <br/> -u, --usb-only        Use arom usb ports only  <br/> -d, --dump-enable     Enable dump download protocol packet  <br/> -s, --speed=speed     Use given speed for serial communication      <br/> --baud=speed          Supported baud rates:<br/>						(115200, 230400, 460800, 921600, 1842000, 3686400)  <br/> -g, --upgrade         Running in upgrade mode, default is production mode  <br/> -r, --reboot          Reboot device after finished  <br/> -q, --quit            Quit application after any port finished |
| RDA      | EC200U<br/>EC600U | CmdDloader.exe  <-pac PacFile>  [-port ComPort] [-c] <br/>e.g. CmdDloader.exe -pac D:\SC7702_sc7701.pac -port 195 | -pac PacFile: Enter the pac file. <br/>-port ComPort: Enter the port number of the download device. <br/>-c: This command is optional. When you enter this parameter, the CMDDLoader application will clear the download process before executing the download. |


### Notes
- README-orig.md contains original readme provided by Yeoman Generator, use it when publishing the extension (and remove this one!).
