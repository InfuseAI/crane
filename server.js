const serverHandlers = require('./server-handlers')
const ipc = require('./server-ipc')
const opts = require('./server-opts')

console.log("server", opts.version, opts.workingDir, opts.isDev)

ipc.init(opts.socketAppspace , opts.socketId, serverHandlers)