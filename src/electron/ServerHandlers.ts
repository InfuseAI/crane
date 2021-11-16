import * as Docker from 'dockerode';
import config from './config';
import * as fs from 'fs';
import * as path from 'path';
import * as keytar from 'keytar';
import { send } from './ServerIpc';
import axios from 'axios';
import { createMarkdownArrayTableSync } from 'parse-markdown-table';

const docker = new Docker();
const dockerHubCredentialKeyName = 'Crane-DockerHub';
const primeHubCredentialKeyName = 'Crane-PrimeHub';

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

export async function getCredential(keyname) {
  const credentials = await keytar.findCredentials(keyname);
  if (!credentials || credentials.length === 0) {
    return null;
  }
  console.log('[Get ' + keyname + ' Credential]', credentials[0]);
  return credentials[0];
}

export async function saveCredential(keyname, account, password) {
  const existCredential = await getCredential(keyname);
  if (existCredential) {
    await keytar.deletePassword(keyname, existCredential.account);
  }
  await keytar.setPassword(keyname, account, password);
  console.log('[' + keyname + ' Credential Saved]');
  return { account, password };
}

export function writeDockerfile(dockerfileContent) {
  fs.writeFileSync(
    path.join(config.workingDir, 'Dockerfile'),
    dockerfileContent
  );
}

const handlers = {
  build_events: [],
  build_status: '',
  ping_docker: async (args) => {
    try {
      await docker.ping();
    } catch (error) {
      return error;
    }
    return 'ok';
  },
  'get-dockerhub-credential': async () => {
    return await getCredential(dockerHubCredentialKeyName);
  },
  'get-primehub-credential': async () => {
    return await getCredential(primeHubCredentialKeyName);
  },
  'save-dockerhub-credential': async (args) =>
    await saveCredential(
      dockerHubCredentialKeyName,
      args.account,
      args.password
    ),
  'save-primehub-credential': async (args) =>
    await saveCredential(primeHubCredentialKeyName, args.endpoint, args.token),
  'build-status': async () => {
    return handlers.build_status;
  },
  'build-image': async ({ base_image_url, image_name, apt, conda, pip }) => {
    handlers.build_events = [];
    handlers.build_status = 'preparing';

    console.log('build-image', base_image_url, apt, conda, pip);

    writeDockerfile(generateDockerfile({ base_image_url, apt, conda, pip }));
    const pull_stream = await docker.pull(base_image_url, {
      platform: 'linux/amd64',
    });

    docker.modem.followProgress(pull_stream, pullFinished, (event) => {
      console.log(event);
      send('build-log', {
        stage: 'progressing',
        name: image_name,
        output: event,
      });
      handlers.build_events.push(event);
      handlers.build_status = 'building';
    });

    async function pullFinished(err, output) {
      console.log('Pull finished', err, output);
      const build_stream = await docker.buildImage(
        {
          context: config.workingDir,
          src: ['Dockerfile'],
        },
        {
          t: image_name,
          platform: 'linux/amd64',
        }
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
    }

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
    const credential = await getCredential(dockerHubCredentialKeyName);
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
    const md: any = response.data;
    const mdTableRegex = /(?:(?:\|[^|\r\n]*)+\|(?:\r?\n|\r)?)+/g;
    const tables = md.match(mdTableRegex);
    tables.forEach(async (markdown) => {
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
