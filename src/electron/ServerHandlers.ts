import * as Docker from 'dockerode';
import config from './config';
import * as fs from 'fs';
import * as path from 'path';
import * as keytar from 'keytar';
import { send } from './ServerIpc';
import axios from 'axios';
import { createMarkdownArrayTableSync } from 'parse-markdown-table';
import * as ElectronStore from 'electron-store';
import AwsAdapter from './AwsAdapter';

const docker = new Docker();
const localStore = new ElectronStore();
const dockerHubCredentialKeyName = 'Crane-DockerHub';
const primeHubCredentialKeyName = 'Crane-PrimeHub';
const awsCredentialKeyName = 'Crane-AWS';

// Init the AWS credential config
getAwsCredential()
  .then((credential) => AwsAdapter.setup(credential))
  .then(() => {
    const aws = AwsAdapter.getInstance();
    return aws.verifyAccessPermission();
  })
  .then((data) => console.log(data));

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

export async function getAwsCredential() {
  const awsCredential = {
    accessKey: '',
    secretKey: '',
    region: '',
  };
  const credential = await getCredential(awsCredentialKeyName);
  if (credential) {
    awsCredential.accessKey = credential.account;
    awsCredential.secretKey = credential.password;
  }
  awsCredential.region = (localStore.get('AWSRegion') as string) || '';
  console.log('[Get Crane-AWS Region]', awsCredential.region);
  return awsCredential;
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
  'get-aws-credential': async () => await getAwsCredential(),
  'save-dockerhub-credential': async (args) =>
    await saveCredential(
      dockerHubCredentialKeyName,
      args.account,
      args.password
    ),
  'save-primehub-credential': async (args) =>
    await saveCredential(primeHubCredentialKeyName, args.endpoint, args.token),
  'save-aws-credential': async (args) => {
    const { accessKey, secretKey, region } = args;
    if (accessKey && secretKey) {
      await saveCredential(awsCredentialKeyName, accessKey, secretKey);
      AwsAdapter.setup({ accessKey, secretKey, region });
    }
    localStore.set('AWSRegion', region);
  },
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
  'push-image-aws': async ({ image_name }) => {
    function extractTrueName(rawName: string): {
      repoName: string;
      tag: string;
    } {
      const group = rawName.match(/amazonaws\.com\/([a-z0-9-_/]*)/);
      const trueName = group ? group[1] : rawName;
      const [repoName, tag] = trueName.split(':');
      return { repoName, tag: tag || 'latest' };
    }
    function extractAuthPassword(token: string): {
      username: string;
      password: string;
    } {
      const buff = Buffer.from(token, 'base64');
      const plaintext = buff.toString('utf8');
      const [username, password] = plaintext.split(':');
      return { username, password };
    }
    const { repoName, tag } = extractTrueName(image_name);
    const ecrRegistry = await AwsAdapter.getInstance().createEcrRepository(
      repoName
    );
    const ecrToken = await AwsAdapter.getInstance().getAuthorizationToken();
    const authToken = ecrToken.authorizationData[0].authorizationToken;
    const endpoint = ecrToken.authorizationData[0].proxyEndpoint;
    const { username, password } = extractAuthPassword(authToken);
    const auth = {
      username: username,
      password: password,
      serveraddress: endpoint,
    };

    // Generate Image Tag for ECR
    const ecrImageName = `${ecrRegistry.repositoryUri}:${tag}`;
    await docker
      .getImage(image_name)
      .tag({ repo: ecrRegistry.repositoryUri, tag: tag });

    console.log(`[Push Image] ${ecrImageName}`, ecrRegistry);
    const push_stream = await docker.getImage(ecrImageName).push({
      authconfig: auth,
    });

    const log_ipc_name = `push-log-${ecrImageName}`;
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
  'push-image-dockerhub': async ({ image_name }) => {
    function extractTrueName(
      rawName: string,
      project: string
    ): {
      repoName: string;
      tag: string;
    } {
      const trueName = rawName.split('/').pop();
      const [repoName, tag] = trueName.split(':');
      return { repoName, tag: tag || 'latest' };
    }
    const credential = await getCredential(dockerHubCredentialKeyName);
    if (!credential) {
      return null;
    }
    const auth = {
      username: credential.account,
      password: credential.password,
      serveraddress: 'https://index.docker.io/v1',
    };
    const project = credential.account;
    const { repoName, tag } = extractTrueName(image_name, project);
    const dockerRepository = `${project}/${repoName}`;

    // Generate Image Tag for DockerHub
    await docker.getImage(image_name).tag({ repo: dockerRepository, tag: tag });
    const dockerHubImageName = `${dockerRepository}:${tag}`;

    console.log(`[Push Image] ${dockerHubImageName}`);
    const log_ipc_name = `push-log-${image_name}`;
    const push_stream = await docker
      .getImage(dockerHubImageName)
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
  'list-aws-ecr-repositories': async () => {
    try {
      return {
        repositories: await AwsAdapter.getInstance().listEcrRepositories(),
      };
    } catch (err) {
      return { error: err };
    }
  },
  'list-aws-ecr-images': async (repositoryName: string) =>
    AwsAdapter.getInstance().listEcrImages(repositoryName),
};

export default handlers;
