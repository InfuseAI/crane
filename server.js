const serverHandlers = require('./server-handlers')
const ipc = require('./server-ipc')
const { ipcRenderer } = require('electron')
const remote = require('@electron/remote')
const path = require('path')
let isDev, version
let workingDir

if (process.argv[2] === '--subprocess') {
  isDev = false
  version = process.argv[3]
  workingDir = process.argv[5]

  let socketName = process.argv[4]
  ipc.init(socketName, serverHandlers)
} else {
  isDev = true
  version = remote.app.getVersion()
  workingDir = path.join(remote.app.getPath('userData'), 'workingDir')
  ipcRenderer.on('set-socket', (event, { name }) => {
    ipc.init(name, serverHandlers)
  })
}

console.log(version, isDev, workingDir)
