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

const { Content } = Layout;
const { TabPane } = Tabs;

export default function Settings() {
  const { tabName } = useParams<{ tabName: string }>();
  const [dockerHubForm] = Form.useForm();
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
  useEffect(() => {
    async function fetchCredential() {
      const credential = await send('get-dockerhub-credential');
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
      const credential = await send('get-primehub-credential');
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
  const initialValues = {};
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
          <TabPane tab='DOCKER HUB' key='dockerhub'>
            <Form
              layout='vertical'
              form={dockerHubForm}
              name='settings'
              initialValues={initialValues}
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
                <Button style={{ margin: '0 8px' }}>Reset</Button>
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
              initialValues={initialValues}
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
                <Button style={{ margin: '0 8px' }}>Reset</Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </div>
    </Content>
  );
}
