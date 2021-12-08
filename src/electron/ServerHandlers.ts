import * as Docker from 'dockerode';
import config from './config';
import * as fs from 'fs';
import * as path from 'path';
import * as keytar from 'keytar';
import { send } from './ServerIpc';
import axios from 'axios';
import { createMarkdownArrayTableSync } from 'parse-markdown-table';
import AwsAdapter from './AwsAdapter';
import DockerHubAdapter from './DockerHubAdapter';
import * as Sentry from '@sentry/electron';

Sentry.init({
  dsn: 'https://6ad1a0b7db2247719c690f7d373b4bfc@o1081482.ingest.sentry.io/6088888',
});


const docker = new Docker();
const dockerHubCredentialKeyName = 'Crane-DockerHub';
const primeHubCredentialKeyName = 'Crane-PrimeHub';
const awsCredentialKeyName = 'Crane-AWS';
const awsRegionKeyName = 'Crane-AWS-Region';

// Init the AWS credential config
getAwsCredential()
  .then((credential) => AwsAdapter.setup(credential))
  .then(() => {
    const aws = AwsAdapter.getInstance();
    return aws.verifyAccessPermission();
  })
  .then((data) => console.log(data))
  .catch((err) => console.log(err));

getCredential(dockerHubCredentialKeyName)
  .then((credential) =>
    DockerHubAdapter.setup({
      username: credential.account,
      password: credential.password,
    })
  )
  .then((docker) => docker.login())
  .catch((err) => console.log(err));

export function generateDockerfile(options) {
  let base_image_url = options['base_image_url'];
  let description = '';
  let labels = '';
  let apt = '';
  let conda = '';
  let pip = '';

  if (options['image_description']) {
    description = `LABEL crane.description=\"${options['image_description']}\"`;
  }

  if (options['image_labels']) {
    labels = `LABEL crane.labels=\"${options['image_labels'].join()}\"`;
  }

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
${description}
${labels}
USER root
${apt}
${conda}
${pip}`;
  console.log(dockerfileContent);

  return dockerfileContent;
}

export async function getCredential(
  keyName: string
): Promise<{ account: string; password: string }> {
  const credentials = await keytar.findCredentials(keyName);
  if (!credentials || credentials.length === 0) {
    return { account: '', password: '' };
  }
  console.log('[Get ' + keyName + ' Credential]', credentials[0]);
  return credentials[0];
}

export async function saveCredential(
  keyName: string,
  account: string,
  password: string
): Promise<{ account: string; password: string }> {
  const existCredential = await getCredential(keyName);
  if (existCredential.account) {
    await keytar.deletePassword(keyName, existCredential.account);
  }
  await keytar.setPassword(keyName, account, password);
  console.log('[' + keyName + ' Credential Saved]');
  return { account, password };
}

export async function deleteCredential(keyName: string) {
  const existCredential = await getCredential(keyName);
  if (existCredential.account) {
    await keytar.deletePassword(keyName, existCredential.account);
  }
  console.log('[' + keyName + ' Credential Deleted]');
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
  const region = await getCredential(awsRegionKeyName);
  awsCredential.region = region ? region.password : '';
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
  'save-dockerhub-credential': async (args) => {
    try {
      await saveCredential(
        dockerHubCredentialKeyName,
        args.account,
        args.password
      );
      await DockerHubAdapter.setup({
        username: args.account,
        password: args.password,
      });
      await DockerHubAdapter.getInstance().login();
    } catch (error) {
      console.log(error);
    }
  },
  'save-primehub-credential': async (args) =>
    await saveCredential(primeHubCredentialKeyName, args.endpoint, args.token),
  'save-aws-credential': async (args) => {
    const { accessKey, secretKey, region } = args;
    if (accessKey && secretKey) {
      await saveCredential(awsCredentialKeyName, accessKey, secretKey);
      AwsAdapter.setup({ accessKey, secretKey, region });
    }
    await saveCredential(awsRegionKeyName, 'region', region);
  },
  'delete-dockerhub-credential': async () => {
    await deleteCredential(dockerHubCredentialKeyName);
    DockerHubAdapter.setup({ username: '', password: '' });
  },
  'delete-primehub-credential': async () => {
    await deleteCredential(primeHubCredentialKeyName);
  },
  'delete-aws-credential': async () => {
    await deleteCredential(awsCredentialKeyName);
    await deleteCredential(awsRegionKeyName);
    AwsAdapter.setup({ accessKey: '', secretKey: '', region: '' });
  },
  'build-status': async () => {
    return handlers.build_status;
  },
  'build-image': async ({
    base_image_url,
    image_name,
    image_description,
    image_labels,
    apt,
    conda,
    pip,
  }) => {
    handlers.build_events = [];
    handlers.build_status = 'preparing';

    console.log(
      'build-image',
      base_image_url,
      image_description,
      image_labels,
      apt,
      conda,
      pip
    );

    writeDockerfile(
      generateDockerfile({
        base_image_url,
        image_description,
        image_labels,
        apt,
        conda,
        pip,
      })
    );
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

    try {
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
    } catch (error) {
      async function sleep(time: number): Promise<void> {
        return new Promise<void>((res, rej) => {
          setTimeout(res, time);
        });
      }
      async function throwErrorByIpc(ipc_name: string, error) {
        await sleep(1000);
        send(ipc_name, {
          stage: 'finished',
          error: error,
          output: [{ error: `[AWS] ${error.message}` }],
        });
      }
      const error_ipc_name = `push-log-${image_name}`;
      console.log('push error', error.message);
      throwErrorByIpc(error_ipc_name, error);
      return error_ipc_name;
    }
  },
  'get-image-detail': async ({ image_name }) => {
    const image = await docker.getImage(image_name);
    const history = await image.history();
    console.log(`Image ${image_name}'s History: `, history);
    return history;
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
    if (!credential.account || !credential.password) {
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
    } catch (e) {
      return { errorMsg: e.message };
    }
  },
  'list-aws-ecr-images': async (repositoryName: string) =>
    AwsAdapter.getInstance().listEcrImages(repositoryName),
  'list-dockerhub-repositories': async (options) => {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 100;
    try {
      return await DockerHubAdapter.getInstance().listRepositories(
        undefined,
        page,
        pageSize
      );
    } catch (e) {
      return { errorMsg: e.message };
    }
  },
  'list-dockerhub-images': async (repositoryName: string, options) => {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 100;
    try {
      return await DockerHubAdapter.getInstance().listImageTags(
        repositoryName,
        undefined,
        page,
        pageSize
      );
    } catch (e) {
      return { errorMsg: e.message };
    }
  },
};

export default handlers;
