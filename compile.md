# vscode编译相关问题

## nodejs and electron 编译相关问题解决

在使用electron 编译vscode插件的时候，会遇到一些问题，尤其涉及到serialport库的编译，很容易出现版本兼容以及环境问题，这里记录一些问题和解决方法。

问题现象

```
Activating extension 'Quectel.qpy-ide' failed: The module '\\?\c:\Users\Q\Desktop\vscode-extension-rivern\qpy-vscode-extension\node_modules\@serialport\bindings\build\Release\bindings.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 116. This version of Node.js requires
NODE_MODULE_VERSION 118. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`)..
```

vscode发布新版本会升级node版本导致插件的NODE_MODULE_VERSION与node版本不匹配

elecron官网也给出了解释

Electron 支持原生 Node.js 模块，但由于 Electron 与给定的 Node.js 二进制文件具有不同的 应用程序二进制接口 (ABI)（由于差异，例如使用 Chromium 的 BoringSSL 而不是 OpenSSL），因此您使用的原生模块将需要为 Electron 重新编译。

官网给出的解决方法为rebuild

npm install --save-dev @electron/rebuild

rebuild之后并没有解决问题，还是会出现版本不匹配的问题

npm i electron-rebuild -s
./node_modules/.bin/electron-rebuild

解决方法

删除node_modules目录，重新安装依赖包
npm -i

会出现概率性失败问题  可能是网络问题，切换源即可

serialport库可能会无法编译通过

$$
更新package.json中的vscode版本


## 开发环境安装






