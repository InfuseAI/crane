const Docker = require('dockerode');
const opts = require('./server-opts')
const docker = new Docker();
const fs = require('fs');
const path = require('path');

let handlers = {}

function generateDockerfile(options) {
  let base_image_url = options['base_image_url'];
  let apt = ''
  let conda = ''
  let pip = ''

  if (options['apt']) {
    apt = `RUN apt-get update && apt-get install -y --no-install-recommends ${options['apt'].replace(/[\r\n]+/g, ' ')} && apt-get purge && apt-get clean`
  }

  if (options['conda']) {
    conda = `RUN conda install --quiet --yes ${options['conda'].replaceAll(/[\r\n]+/g, ' ')} && conda clean --all -f -y`
  }

  if (options['pip']) {
    pip = `RUN pip install --no-cache-dir ${options['pip'].replaceAll(/[\r\n]+/g, ' ')}`
  }

  let dockerfileContent = `FROM ${base_image_url}
USER root
${apt}
${conda}
${pip}`

  return dockerfileContent
}

function writeDockerfile(dockerfileContent) {
  fs.writeFileSync(path.join(opts.workingDir, 'Dockerfile'), dockerfileContent);
}

handlers["build-image"] = async ({ base_image_url, apt, conda, pip }) => {
  console.log("build-image");
  writeDockerfile(generateDockerfile({base_image_url, apt, conda, pip}));
  docker.buildImage({
    context: opts.workingDir,
    src: ['Dockerfile']
  }, {t: 'cranetest'}, function (err, response) {
    console.log(err)
    console.log(response)
  });
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
