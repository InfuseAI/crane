import React from 'react';
import { Layout, Breadcrumb, Form, Input, Button, Row, Col } from 'antd';
const { Content } = Layout;
const { TextArea } = Input;

export default function BuildImage() {
  const placeholder = `one package per line. e.g., \npackage1\npackage2\n`;
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
        <Form layout='vertical'>
          <Form.Item label='Base Image' required>
            <Input placeholder='e.g., jupyter/base-notebook, jupyter/scipy-notebook' />
          </Form.Item>
          <Form.Item label='Image Name' required>
            <Input />
          </Form.Item>
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item label='apt'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='conda'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='pip'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ textAlign: 'right' }}>
            <Button type='primary'>Submit</Button>
            <Button style={{ margin: '0 8px' }}>Reset</Button>
          </Form.Item>
        </Form>
      </div>
    </Content>
  );
}
