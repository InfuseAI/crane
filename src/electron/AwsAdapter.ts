import * as AWS from 'aws-sdk';
interface AwsAdapterConfig {
  accessKey: string;
  secretKey: string;
  region: string;
}

const defaultAwsRegion = 'us-east-1';

export enum AwsError {
  MISSING_CREDENTIAL = 'Missing AWS Credential',
  INVALID_CREDENTIAL = 'Invalid AWS Credentials',
}
export default class AwsAdapter {
  private static instance: AwsAdapter;
  private config: AwsAdapterConfig;
  private ecr: AWS.ECR;
  private sts: AWS.STS;

  private constructor(config: AwsAdapterConfig) {
    this.config = config;

    this.ecr = new AWS.ECR({
      accessKeyId: this.config.accessKey,
      secretAccessKey: this.config.secretKey,
      region: this.config.region || defaultAwsRegion,
    });
    this.sts = new AWS.STS({
      accessKeyId: this.config.accessKey,
      secretAccessKey: this.config.secretKey,
      region: this.config.region || defaultAwsRegion,
    });
  }

  public static getInstance(): AwsAdapter {
    return AwsAdapter.instance;
  }

  public static setup(config: AwsAdapterConfig): AwsAdapter {
    console.log('[Setup] AWS Adapter');
    AwsAdapter.instance = new AwsAdapter(config);
    return AwsAdapter.instance;
  }

  public async verifyAccessPermission(): Promise<AWS.STS.GetCallerIdentityResponse> {
    return await this.sts.getCallerIdentity().promise();
  }

  public async listEcrRepositories(
    params?: AWS.ECR.DescribeRepositoriesRequest
  ): Promise<AWS.ECR.RepositoryList> {
    const result = await this.ecr.describeRepositories(params).promise();
    return result.repositories;
  }

  public async listEcrImages(
    repositoryName: string
  ): Promise<AWS.ECR.ImageDetailList> {
    const result = await this.ecr
      .describeImages({ repositoryName: repositoryName })
      .promise();
    return result.imageDetails;
  }

  public async createEcrRepository(
    repoName: string
  ): Promise<AWS.ECR.Repository> {
    try {
      const [repo] = await this.listEcrRepositories({
        repositoryNames: [repoName],
      });
      console.log(`[Found Repository] ${repoName}`);
      return repo;
    } catch (error) {
      console.log(`[Create Repository] ${repoName}`);
      const result = await this.ecr
        .createRepository({ repositoryName: repoName })
        .promise();
      return result.repository;
    }
  }

  public async getAuthorizationToken() {
    return await this.ecr.getAuthorizationToken().promise();
  }
}
