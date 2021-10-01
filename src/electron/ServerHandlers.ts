import * as Docker from 'dockerode';
import config from './config';
import * as fs from 'fs';
import * as path from 'path';
import * as keytar from 'keytar';
import { send } from './ServerIpc';
import axios from 'axios';
import { createMarkdownArrayTableSync } from 'parse-markdown-table';

const docker = new Docker();

export function generateDockerfile(options) {
  let base_image_url = options['base_image_url'];
  let apt = '';
  let conda = '';
  let pip = '';

  if (options['apt']) {
    apt = `RUN apt-get update && apt-get install -y --no-install-recommends ${options[
      'apt'
    ].replace(/[\r\n]+/g, ' ')} && apt-get purge && apt-get clean`;
  }

  if (options['conda']) {
    conda = `RUN conda install --quiet --yes ${options['conda'].replaceAll(
      /[\r\n]+/g,
      ' '
    )} && conda clean --all -f -y`;
  }

  if (options['pip']) {
    pip = `RUN pip install --no-cache-dir ${options['pip'].replaceAll(
      /[\r\n]+/g,
      ' '
    )}`;
  }

  let dockerfileContent = `FROM ${base_image_url}
USER root
${apt}
${conda}
${pip}`;

  return dockerfileContent;
}

export async function getDockerHubCredential() {
  const credentials = await keytar.findCredentials('Crane-DockerHub');
  if (!credentials || credentials.length === 0) {
    return null;
  }
  console.log('[Get DockerHub Credential]', credentials[0]);
  return credentials[0];
}

export async function saveDockerHubCredential(account, password) {
  const existCredential = await getDockerHubCredential();
  if (existCredential) {
    await keytar.deletePassword('Crane-DockerHub', existCredential.account);
  }
  await keytar.setPassword('Crane-DockerHub', account, password);
  console.log('[DockerHub Credential Saved]');
  return { account, password };
}

export function writeDockerfile(dockerfileContent) {
  fs.writeFileSync(path.join(config.workingDir, 'Dockerfile'), dockerfileContent);
}

const handlers = {
  build_events: [],
  build_status: '',
  'get-dockerhub-credential': getDockerHubCredential,
  'save-dockerhub-credential': async (args) =>
    await saveDockerHubCredential(args.account, args.password),
  'build-status': async () => {
    return handlers.build_status;
  },
  'build-image': async ({ base_image_url, image_name, apt, conda, pip }) => {
    handlers.build_events = [];
    handlers.build_status = 'preparing';

    console.log('build-image', base_image_url, apt, conda, pip);

    writeDockerfile(generateDockerfile({ base_image_url, apt, conda, pip }));
    const build_stream = await docker.buildImage(
      {
        context: config.workingDir,
        src: ['Dockerfile'],
      },
      { t: image_name }
    );

    docker.modem.followProgress(build_stream, buildFinished, (event) => {
      console.log(event);
      send('build-log', {
        stage: 'progressing',
        name: image_name,
        output: event,
      });
      handlers.build_events.push(event);
      handlers.build_status = 'building';
    });

    async function buildFinished(err, output) {
      console.log('Build finished', err, output);
      send('build-log', {
        stage: 'finished',
        name: image_name,
        error: err,
        output: output,
      });
      handlers.build_status = 'finished';
    }
    return 'Start building';
  },
  'list-image': async () => {
    console.log('[List Image] start');
    return await docker.listImages();
  },
  'push-image-dockerhub': async ({ image_name }) => {
    const credential = await getDockerHubCredential();
    if (!credential) {
      return null;
    }
    const auth = {
      username: credential.account,
      password: credential.password,
      serveraddress: 'https://index.docker.io/v1',
    };

    const log_ipc_name = `push-log-${image_name}`;

    const push_stream = await docker
      .getImage(image_name)
      .push({ authconfig: auth });
    docker.modem.followProgress(
      push_stream,
      (err, output) => {
        handlers.build_status = 'finished';
        console.log('push finished', err, output);
        send(log_ipc_name, {
          stage: 'finished',
          error: err,
          output: output,
        });
      },
      (event) => {
        console.log(event);
        send(log_ipc_name, {
          stage: 'progressing',
          output: event,
        });
        handlers.build_events.push(event);
      }
    );

    return log_ipc_name;
  },
  'get-primehub-notebooks': async () => {
    let results = [];
    const response = await axios.get(
      'https://raw.githubusercontent.com/InfuseAI/primehub-site/master/docs/guide_manual/images-list.md'
    );
    const md = response.data;
    const mdTableRegex = /(?:(?:\|[^|\r\n]*)+\|(?:\r?\n|\r)?)+/g;
    const tables = md.match(mdTableRegex);

    tables.forEach((markdown) => {
      const t: any = {};
      const table: any = createMarkdownArrayTableSync(markdown);
      t.headers = table.headers;
      t.rows = [];
      for (const row of table.rows) {
        t.rows.push(row);
      }
      results.push(t);
    });

    return results;
  },
};

export default handlers;
