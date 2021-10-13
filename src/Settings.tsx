import React, { useEffect } from 'react';
import { Layout, Breadcrumb, Form, Input, Button, Tabs } from 'antd';
import { send } from './utils/ipcClient';

const { Content } = Layout;
const { TabPane } = Tabs;

export default function Settings() {
  const [dockerHubForm] = Form.useForm();
  const [primeHubForm] = Form.useForm();
  const onDockerHubFinish = async (values) => {
    const result = await send('save-dockerhub-credential', {
      account: values['docker-account'],
      password: values['docker-password'],
    });
    console.log('Save values', result);
  };
  const onPrimeHubFinish = async (values) => {
    const result = await send('save-primehub-credential', {
      endpoint: values['primehub-api-endpoint'],
      token: values['primehub-api-token'],
    });
    console.log('Save values', result);
  };
  useEffect(() => {
    async function fetchCredential() {
      const credential = await send('get-dockerhub-credential');
      if (credential) {
        dockerHubForm.setFieldsValue({ 'docker-account': credential.account });
        dockerHubForm.setFieldsValue({ 'docker-password': credential.password });
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
        primeHubForm.setFieldsValue({ 'primehub-api-endpoint': credential.account });
        primeHubForm.setFieldsValue({ 'primehub-api-token': credential.password });
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
        <Tabs defaultActiveKey='1' size='large' style={{ marginBottom: 32 }}>
          <TabPane tab='DOCKER HUB' key='1'>
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
          <TabPane tab='PRIMEHUB' key='2' forceRender={true}>
          <Form
              layout='vertical'
              form={primeHubForm}
              name='settings'
              initialValues={initialValues}
              onFinish={onPrimeHubFinish}
            >
              <Form.Item label='API Endpoint' name='primehub-api-endpoint'>
                <Input />
              </Form.Item>
              <Form.Item label='API Token' name='primehub-api-token'>
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
        </Tabs>

      </div>
    </Content>
  );
}
