import React, { useEffect } from 'react';
import {
  Layout,
  Breadcrumb,
  Form,
  Input,
  Button,
  Tabs,
  Alert,
  notification,
  Space,
} from 'antd';
import { useParams } from 'react-router-dom';
import { send } from './utils/ipcClient';
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  gql,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { Select } from 'antd';

const { Option } = Select;
const { Content } = Layout;
const { TabPane } = Tabs;
const defaultAwsRegion = 'us-east-1';

export default function Settings() {
  const { tabName } = useParams<{ tabName: string }>();
  const [dockerHubForm] = Form.useForm();
  const [awsForm] = Form.useForm();
  const [primeHubForm] = Form.useForm();
  const onDockerHubFinish = async (values) => {
    await send('save-dockerhub-credential', {
      account: values['docker-account'],
      password: values['docker-password'],
    });
    notification.info({
      message: 'DockerHub setup saved.',
    });
  };
  const onAwsFinish = async (values) => {
    await send('save-aws-credential', {
      accessKey: values['aws-id'],
      secretKey: values['aws-key'],
      region: values['aws-region'],
    });
    notification.info({
      message: 'AWS setup saved.',
    });
  };
  const onPrimeHubFinish = async (values) => {
    await send('save-primehub-credential', {
      endpoint: values['primehub-api-endpoint'],
      token: values['primehub-api-token'],
    });
    notification.info({
      message: 'PrimeHub setup saved.',
    });
  };
  const onPrimeHubTest = async () => {
    const uri = primeHubForm.getFieldValue('primehub-api-endpoint');
    const token = primeHubForm.getFieldValue('primehub-api-token');
    const httpLink = createHttpLink({
      uri,
    });
    const authLink = setContext((_, { headers }) => {
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : '',
        },
      };
    });
    const client = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    });
    try {
      const result = await client.query({
        query: gql`
          query {
            me {
              id
            }
          }
        `,
      });
      console.log(result);
      notification.success({
        message: 'PrimeHub Connected',
        description: ``,
      });
    } catch (error) {
      console.log(error);
      notification.error({
        message: 'PrimeHub Connection Failed',
        description: ``,
      });
    }
  };
  const onDockerHubReset = async () => {
    await send('delete-dockerhub-credential');
    notification.info({
      message: 'DockerHub setup reset.',
    });
    dockerHubForm.setFieldsValue({
      'docker-account': '',
      'docker-password': '',
    });
  };
  const onAwsReset = async () => {
    await send('delete-aws-credential');
    notification.info({
      message: 'AWS setup reset.',
    });
    awsForm.setFieldsValue({
      'aws-id': '',
      'aws-key': '',
      'aws-region': defaultAwsRegion,
    });
  };
  const onPrimeHubReset = async () => {
    await send('delete-primehub-credential');
    notification.info({
      message: 'PrimeHub setup reset.',
    });
    primeHubForm.setFieldsValue({
      'primehub-api-endpoint': '',
      'primehub-api-token': '',
    });
  };
  useEffect(() => {
    async function fetchCredential() {
      const credential: any = await send('get-dockerhub-credential');
      if (credential) {
        dockerHubForm.setFieldsValue({ 'docker-account': credential.account });
        dockerHubForm.setFieldsValue({
          'docker-password': credential.password,
        });
      } else {
        console.log('No DockerHub credential found');
      }
    }
    fetchCredential();
  }, [dockerHubForm]);
  useEffect(() => {
    async function fetchCredential() {
      const credential: any = await send('get-primehub-credential');
      if (credential) {
        primeHubForm.setFieldsValue({
          'primehub-api-endpoint': credential.account,
        });
        primeHubForm.setFieldsValue({
          'primehub-api-token': credential.password,
        });
      } else {
        console.log('No PrimeHub credential found');
      }
    }
    fetchCredential();
  }, [primeHubForm]);
  useEffect(() => {
    async function fetchCredential() {
      const credential: any = await send('get-aws-credential');
      if (credential.accessKey && credential.secretKey && credential.region) {
        awsForm.setFieldsValue({
          'aws-id': credential.accessKey,
        });
        awsForm.setFieldsValue({
          'aws-key': credential.secretKey,
        });
        awsForm.setFieldsValue({
          'aws-region': credential.region,
        });
      } else {
        console.log('No AWS credential found');
      }
    }
    fetchCredential();
  }, [awsForm]);
  return (
    <Content style={{ margin: '0 16px' }}>
      <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Crane</Breadcrumb.Item>
        <Breadcrumb.Item>Settings</Breadcrumb.Item>
      </Breadcrumb>
      <div
        className='site-layout-background'
        style={{ padding: 24, minHeight: 360 }}
      >
        <Tabs
          defaultActiveKey={tabName}
          size='large'
          style={{ marginBottom: 32 }}
        >
          <TabPane tab='DOCKERHUB' key='dockerhub'>
            <Form
              layout='vertical'
              form={dockerHubForm}
              name='settings'
              initialValues={{}}
              onFinish={onDockerHubFinish}
            >
              <Form.Item label='Account' name='docker-account'>
                <Input />
              </Form.Item>
              <Form.Item label='Password' name='docker-password'>
                <Input.Password />
              </Form.Item>
              <Form.Item style={{ textAlign: 'right' }}>
                <Button type='primary' htmlType='submit'>
                  Save
                </Button>
                <Button style={{ margin: '0 8px' }} onClick={onDockerHubReset}>
                  Reset
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          <TabPane tab='AWS' key='aws'>
            <Form
              layout='vertical'
              form={awsForm}
              name='settings'
              initialValues={{ 'aws-region': defaultAwsRegion }}
              onFinish={onAwsFinish}
            >
              <Form.Item label='Region' name='aws-region'>
                <Select
                  showSearch
                  style={{ width: 200 }}
                  placeholder='Select a region'
                  optionFilterProp='children'
                  filterOption={(input, option) =>
                    option
                      ? option.children
                          .toLowerCase()
                          .indexOf(input.toLowerCase()) >= 0
                      : false
                  }
                >
                  <Option value='us-east-2'>US East (Ohio)</Option>
                  <Option value='us-east-1'>US East (N. Virginia)</Option>
                  <Option value='us-west-1'>US West (N. California)</Option>
                  <Option value='us-west-2'>US West (Oregon)</Option>
                  <Option value='ap-east-1'>Asia Pacific (Hong Kong)</Option>
                  <Option value='ap-south-1'>Asia Pacific (Mumbai)</Option>
                  <Option value='ap-northeast-2'>Asia Pacific (Seoul)</Option>
                  <Option value='ap-southeast-1'>
                    Asia Pacific (Singapore)
                  </Option>
                  <Option value='ap-southeast-2'>Asia Pacific (Sydney)</Option>
                  <Option value='ap-northeast-1'>Asia Pacific (Tokyo)</Option>
                  <Option value='ca-central-1'>Canada (Central)</Option>
                  <Option value='cn-north-1'>China (Beijing)</Option>
                  <Option value='cn-northwest-1'>China (Ningxia)</Option>
                  <Option value='eu-central-1'>Europe (Frankfurt)</Option>
                  <Option value='eu-west-1'>Europe (Ireland)</Option>
                  <Option value='eu-west-2'>Europe (London)</Option>
                  <Option value='eu-west-3'>Europe (Paris)</Option>
                  <Option value='eu-north-1'>Europe (Stockholm)</Option>
                  <Option value='me-south-1'>Middle East (Bahrain)</Option>
                  <Option value='sa-east-1'>South America (São Paulo)</Option>
                  <Option value='us-gov-east-1'>AWS GovCloud (US-East)</Option>
                  <Option value='us-gov-west-1'>AWS GovCloud (US-West)</Option>
                </Select>
              </Form.Item>
              <Form.Item label='Access Key ID' name='aws-id'>
                <Input />
              </Form.Item>
              <Form.Item label='Secret Access Key' name='aws-key'>
                <Input.Password />
              </Form.Item>
              <Form.Item style={{ textAlign: 'right' }}>
                <Button type='primary' htmlType='submit'>
                  Save
                </Button>
                <Button style={{ margin: '0 8px' }} onClick={onAwsReset}>
                  Reset
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          <TabPane tab='PRIMEHUB' key='primehub' forceRender={true}>
            <Alert
              style={{ margin: '8px 0 16px' }}
              className='primehub-alert'
              showIcon
              message={`Looking for a full-stack ML platform?`}
              description={`It'll just take few minutes by our 1-click installer to setup PrimeHub on AWS`}
              action={
                <Space>
                  <Button
                    size='small'
                    type='primary'
                    href='https://one.primehub.io'
                    target='_blank'
                  >
                    Ok Let's Do It
                  </Button>
                </Space>
              }
              closable
              closeText={
                <Button size='small' type='text' style={{ color: '#aaa' }}>
                  Not right now
                </Button>
              }
              type='info'
            />
            <Form
              layout='vertical'
              form={primeHubForm}
              name='settings'
              initialValues={{}}
              onFinish={onPrimeHubFinish}
            >
              <Form.Item
                label='PrimeHub API Endpoint'
                name='primehub-api-endpoint'
              >
                <Input placeholder='https://example.com/primehub/api/graphql' />
              </Form.Item>
              <Form.Item label='PrimeHub API Token' name='primehub-api-token'>
                <Input.Password
                  addonAfter={
                    <Button type='text' onClick={onPrimeHubTest}>
                      Test
                    </Button>
                  }
                />
              </Form.Item>
              <Form.Item style={{ textAlign: 'right' }}>
                <Button type='primary' htmlType='submit'>
                  Save
                </Button>
                <Button style={{ margin: '0 8px' }} onClick={onPrimeHubReset}>
                  Reset
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </div>
    </Content>
  );
}
