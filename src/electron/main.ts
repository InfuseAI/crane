import { app, BrowserWindow, shell } from 'electron';
import { fork } from 'child_process';
import * as isDev from 'electron-is-dev';
import * as fs from 'fs';
import * as path from 'path';
import * as squirrelStartup from 'electron-squirrel-startup';

if (squirrelStartup) app.quit();

const workingDir = path.resolve(app.getPath('userData'), 'workingDir');

let serverProcess;

function createWindow(args) {
  const win = new BrowserWindow({
    width: 1024,
    height: 640,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#244764',
    show: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: args,
      preload: path.resolve(__dirname, 'client-preload.js'),
    },
  });

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL('http://localhost:16888');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.resolve(__dirname, '../build', 'index.html'));
  }

  win.once('ready-to-show', () => win.show());
}

function createBackgroundWindow(args) {
  const win = new BrowserWindow({
    width: 1024,
    height: 640,
    minWidth: 1024,
    minHeight: 640,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: args,
      preload: path.resolve(__dirname, 'server.js'),
    },
  });
  win.loadFile(path.resolve(__dirname, '../public/index.html'));
  win.webContents.openDevTools();
}

function createBackgroundProcess(args) {
  console.log('fork process', path.resolve(__dirname, 'server.js'));
  serverProcess = fork(path.resolve(__dirname, 'server.js'), [
    '--subprocess',
    ...args,
  ]);
  serverProcess.on('message', (msg) => {
    console.log('index', msg);
  });
}

const socketAppspace = `myapp.${process.pid}.`;
const socketId = 'server';

function createAppDirectory() {
  if (!fs.existsSync(workingDir)) {
    fs.mkdir(workingDir, (err) => {
      if (err) {
        return console.error(err);
      }
      console.log('Directory created successfully!', workingDir);
    });
  }
}

app.on('ready', async () => {
  const args = [
    `--appVersion=${app.getVersion()}`,
    `--socketAppspace=${socketAppspace}`,
    `--socketId=server`,
    `--workingDir=${workingDir}`,
  ];
  if (isDev) args.push('--isDev');

  createAppDirectory();

  createWindow(args);
  const forceToUseBackgroundProcess =
    process.env.FORCE_BACKGROUND_PROCESS === '1';
  if (isDev && !forceToUseBackgroundProcess) {
    createBackgroundWindow(args);
  } else {
    createBackgroundProcess(args);
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  // cleanup: remove socket after use
  const socketPath = `/tmp/${socketAppspace}${socketId}`;
  fs.unlinkSync(socketPath);
});
