import ServerHandlers from './ServerHandlers';
import * as ipc from './ServerIpc';
import opts from './config';

console.log('server', opts.version, opts.workingDir, opts.isDev);

ipc.init(opts.socketAppspace, opts.socketId, ServerHandlers);
