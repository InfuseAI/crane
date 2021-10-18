function parseArgs(argv) {
  return argv.reduce((args, arg) => {
    const match = arg.split('=');
    args.set(match[0], match[1] || true);
    return args;
  }, new Map());
}

const opts = parseArgs(process.argv);
const version = opts.get('--appVersion');
const workingDir = opts.get('--workingDir');
const isDev = opts.get('--isDev');
const socketAppspace = opts.get('--socketAppspace');
const socketId = opts.get('--socketId');

const config = {
  version,
  workingDir,
  isDev,
  socketAppspace,
  socketId,
};

export default config;
