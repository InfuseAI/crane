const electron = require('electron')
const { app, BrowserWindow } = require('electron')
const { fork } = require('child_process')
const findOpenSocket = require('./find-open-socket')
const isDev = require('electron-is-dev')
const fs = require('fs')
const path = require('path');
require('@electron/remote/main').initialize();

let clientWin
let serverWin
let serverProcess

const workingDir = path.join(app.getPath('userData'), 'workingDir')

function createWindow(socketName) {
  clientWin = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: __dirname + '/client-preload.js'
    }
  })

  clientWin.loadFile('client-index.html')

  clientWin.webContents.on('did-finish-load', () => {
    clientWin.webContents.send('set-socket', {
      name: socketName
    })
  })
}

function createBackgroundWindow(socketName) {
  const win = new BrowserWindow({
    x: 500,
    y: 300,
    width: 700,
    height: 500,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })
  require("@electron/remote/main").enable(win.webContents)
  win.loadURL(`file://${__dirname}/server-dev.html`)

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('set-socket', { name: socketName })
  })

  serverWin = win
}

function createBackgroundProcess(socketName) {
  serverProcess = fork(__dirname + '/server.js', [
    '--subprocess',
    app.getVersion(),
    socketName,
    workingDir
  ])

  serverProcess.on('message', msg => {
    console.log(msg)
  })
}

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
  createAppDirectory()
  serverSocket = await findOpenSocket()

  createWindow(serverSocket)

  if (isDev) {
    createBackgroundWindow(serverSocket)
  } else {
    createBackgroundProcess(serverSocket)
  }
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})
