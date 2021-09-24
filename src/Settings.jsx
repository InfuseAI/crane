import React, { useEffect } from 'react';
import { Layout, Breadcrumb, Form, Input, Button } from 'antd';
import { send } from './utils/ipcClient';

const { Content } = Layout;

export default function Settings() {
  const [form] = Form.useForm();
  const onFinish = async (values) => {
    const result = await send('save-dockerhub-credential', {
      account: values['docker-account'],
      password: values['docker-password'],
    });
    console.log('Save values', result);
  };
  useEffect(async () => {
    const credential = await send('get-dockerhub-credential');
    if (credential) {
      form.setFieldsValue({ 'docker-account': credential.account });
      form.setFieldsValue({ 'docker-password': credential.password });
    } else {
      console.log('No credential found');
    }
  });
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
        <Form
          layout='vertical'
          form={form}
          name='settings'
          initialValues={initialValues}
          onFinish={onFinish}
        >
          <Form.Item label='Account' name='docker-account'>
            <Input />
          </Form.Item>
          <Form.Item label='Password' name='docker-password'>
            <Input type='password' />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }}>
            <Button type='primary' htmlType='submit'>
              Save
            </Button>
            <Button style={{ margin: '0 8px' }}>Reset</Button>
          </Form.Item>
        </Form>
      </div>
    </Content>
  );
}
