import axios, { AxiosInstance } from 'axios';
import { get } from 'lodash';

const API_BASE_URL = 'https://hub.docker.com';
const API_VERSION = 'v2';
const API_URL = `${API_BASE_URL}/${API_VERSION}`;

interface DockerHubCredential {
  username: string;
  password: string;
}

export enum DockerHubError {
  MISSING_CREDENTIAL = 'Missing DockerHub Credential',
  INVALID_CREDENTIAL = 'Invalid DockerHub Credential',
}

export interface DockerHubRepository {
  key: any;
  user: string;
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  description: string;
  is_private: boolean;
  last_updated: string;
}

export interface DockerHubImage {
  architecture: string;
  os: string;
  size: number;
  last_pushed: string;
  status: string;
}

export default class DockerHubAdapter {
  private static instance?: DockerHubAdapter;
  private credential: DockerHubCredential;
  private api: AxiosInstance;

  private constructor(credential: DockerHubCredential) {
    this.credential = credential;
    this.api = axios.create({
      baseURL: API_URL,
    });
  }

  public static getInstance(): DockerHubAdapter {
    if (!DockerHubAdapter.instance) {
      throw new Error(DockerHubError.MISSING_CREDENTIAL);
    }
    return DockerHubAdapter.instance;
  }

  public static setup(credential: DockerHubCredential) {
    if (DockerHubAdapter.instance) {
      delete DockerHubAdapter.instance;
    }
    console.log('[Setup] DockerHub Adapter');
    DockerHubAdapter.instance = new DockerHubAdapter(credential);
    return DockerHubAdapter.instance;
  }

  public static async verifyCredentials(
    username: string,
    password: string
  ): Promise<boolean> {
    const loginUrl = `${API_URL}/users/login`;
    const response = await axios.post(loginUrl, { username, password });
    const token = get(response, 'data.token', null);
    if (token) {
      return true;
    }
    return false;
  }

  public async login(): Promise<void> {
    const loginUrl = `${API_URL}/users/login`;
    const response = await axios.post(loginUrl, this.credential);
    const token = get(response, 'data.token', null);
    if (!token) {
      throw new Error(DockerHubError.INVALID_CREDENTIAL);
    }
    const AUTH_TOKEN = `JWT ${token}`;
    // @ts-ignore: Object is possibly 'undefined'.
    this.api.defaults.headers.common['Authorization'] = AUTH_TOKEN;
    console.log('[Login] DockerHub');
  }

  public async listRepositories(
    namespace = this.credential.username,
    page = 1,
    page_size = 100
  ): Promise<{ count: number; repositories: DockerHubRepository[] }> {
    if (!namespace) {
      throw new Error(DockerHubError.MISSING_CREDENTIAL);
    }
    const url = `${API_URL}/repositories/${namespace}?page_size=${page_size}&page=${page}`;
    const response = await this.api.get(url);

    return {
      count: get(response, 'data.count', 0),
      repositories: get(response, 'data.results', []).map(
        (repository: DockerHubRepository, index: number) => {
          repository.key = index;
          return repository;
        }
      ),
    };
  }

  public async listImageTags(
    repository: string,
    namespace = this.credential.username,
    page = 1,
    page_size = 100
  ): Promise<{ count: number; images: DockerHubImage[] }> {
    if (!namespace) {
      throw new Error(DockerHubError.MISSING_CREDENTIAL);
    }
    const url = `${API_URL}/repositories/${namespace}/${repository}/tags?page_size=${page_size}&page=${page}`;
    const response = await this.api.get(url);

    return {
      count: get(response, 'data.count', 0),
      images: get(response, 'data.results', []).map((tag) => {
        tag.key = tag.id;
        return tag;
      }),
    };
  }
}
