import * as console from 'console';
import * as ipc from 'node-ipc';

export function init(socketAppspace, socketId, handlers) {
  ipc.config.silent = true;
  console.log('server-ipc:init', socketAppspace, socketId);
  ipc.config.appspace = socketAppspace;
  ipc.config.id = socketId;
  ipc.serve(() => {
    ipc.server.on('message', (data, socket) => {
      let msg = JSON.parse(data);
      let { id, name, args } = msg;

      if (handlers[name]) {
        handlers[name](args).then(
          (result) => {
            ipc.server.emit(
              socket,
              'message',
              JSON.stringify({ type: 'reply', id, result })
            );
          },
          (error) => {
            // Up to you how to handle errors, forward them, etc
            ipc.server.emit(
              socket,
              'message',
              JSON.stringify({ type: 'error', id })
            );
            throw error;
          }
        );
      } else {
        console.warn('Unknown method: ' + name);
        ipc.server.emit(
          socket,
          'message',
          JSON.stringify({ type: 'reply', id, result: null })
        );
      }
    });
  });

  ipc.server.start();
}

export function send(name, args) {
  ipc.server.broadcast('message', JSON.stringify({ type: 'push', name, args }));
}
