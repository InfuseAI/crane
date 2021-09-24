import React from 'react';
import { Layout, Breadcrumb, Form, Input, Button, Row, Col } from 'antd';
import { send } from './utils/ipcClient';

const { Content } = Layout;
const { TextArea } = Input;

export default function BuildImage() {
  const placeholder = `one package per line. e.g., \npackage1\npackage2\n`;
  const [form] = Form.useForm();
  const onFinish = async (values) => {
    console.log('form values', values);
    const result = await send('build-image', values)
    console.log(result);
  };
  const initialValues = {
    base_image_url: 'ubuntu:xenial',
  };
  return (
    <Content style={{ margin: '0 16px' }}>
      <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Crane</Breadcrumb.Item>
        <Breadcrumb.Item>Build a new Image</Breadcrumb.Item>
      </Breadcrumb>
      <div
        className='site-layout-background'
        style={{ padding: 24, minHeight: 360 }}
      >
        <Form
          layout='vertical'
          form={form}
          name='build_image'
          initialValues={initialValues}
          onFinish={onFinish}
        >
          <Form.Item label='Base Image' name='base_image_url' required>
            <Input placeholder='e.g., jupyter/base-notebook, jupyter/scipy-notebook' />
          </Form.Item>
          <Form.Item label='Image Name' required>
            <Input />
          </Form.Item>
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item label='apt' name='apt'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='conda' name='conda'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='pip' name='pip'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ textAlign: 'right' }}>
            <Button type='primary' htmlType='submit'>
              Submit
            </Button>
            <Button style={{ margin: '0 8px' }}>Reset</Button>
          </Form.Item>
        </Form>
      </div>
    </Content>
  );
}
