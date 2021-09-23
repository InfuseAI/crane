let Docker = require('dockerode');

let docker = new Docker();
let handlers = {}

function parseArgs(argv) {
  return argv.reduce((args, arg) => {
    const match = arg.split("=")
    args.set(match[0], match[1] || true)
    return args
  }, new Map())
}
const opts = parseArgs(process.argv)
const workingDir = opts.get("--workingDir")

handlers["build-image"] = async ({ base_image_url, apt, conda, pip }) => {
  console.log(workingDir);
  return "Start building"
}


handlers._history = []

handlers['ring-ring'] = async () => {
  let stream = await docker.pull('busybox');
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
    console.log('inside')
  });
  // docker.pull('busybox', function (err, stream) {
  //   await new Promise()
  //   docker.modem.followProgress(stream, onFinished, onProgress);

  //   function onFinished(err, output) {
  //     console.log(err)
  //     console.log("======")
  //     console.log(output)
  //     ipc.send('build-finished', { message: 'done' })
  //   }
  //   function onProgress(event) {
  //     console.log("---->" + event)
  //   }
  // });
  console.log('picking up the phone')
  return 'hello!'
}

module.exports = handlers
