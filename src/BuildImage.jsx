import React, { useEffect, useState } from 'react';
import { Layout, Breadcrumb, Form, Input, Button, Row, Col, AutoComplete, Drawer } from 'antd';
import {SiPython} from 'react-icons/si';
import { send, listen } from './utils/ipcClient';

const { Content } = Layout;
const { TextArea } = Input;

const renderTitle = (title) => (
  <span>
    {title}
    <a
      style={{ float: 'right' }}
      href="https://docs.primehub.io/docs/guide_manual/images-list"
      target="_blank"
      rel="noopener noreferrer"
    >
      details
    </a>
  </span>
);

const renderItem = (imageName, pythonVersion) => ({
  value: imageName,
  label: (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      {imageName}
      <span>
        {<SiPython/>} {pythonVersion}
      </span>
    </div>
  ),
});

export default function BuildImage() {
  const [options, updateOptions] = useState([]);
  const [logDrawerVisible, setLogDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  const placeholder = `one package per line. e.g., \npackage1\npackage2\n`;
  const onFinish = async (values) => {
    console.log('form values', values);
    setLogDrawerVisible(true);
    const result = await send('build-image', values);
    console.log(result);
  };
  const onCloseLogDrawer = () => {
    setLogDrawerVisible(false);
  };
  const buildLogReceiver = (payload) => {
    if (payload.stage === 'finished') {
      setLogDrawerVisible(false);
    } else if (payload.stage === 'progressing') {
      console.log(payload.output);
    }
  };
  const initialValues = {
    base_image_url: 'ubuntu:xenial',
    apt: `curl\ngit`,
  };
  // Test for log streaming
  listen('build-log', (payload) => {
    buildLogReceiver(payload);
  });
  useEffect(() => {
    async function fetchPrimeHubNotebooks() {
      const primehubNotebooks = await send('get-primehub-notebooks');
      if (primehubNotebooks) {
        let primehubNotebookOptions = primehubNotebooks.map((x)=>{
          let row = {}
          row.label = renderTitle(x.rows[0][0].replace(/ [0-9.]+$/,''));
          row.options = x.rows.map((y) => {
            return renderItem(y[1], y[3]);
          });
          return row
        });
        updateOptions(primehubNotebookOptions);
      } else {
        console.log('No primehub notebooks found');
      }
    }
    fetchPrimeHubNotebooks();
  }, []);
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
          <AutoComplete
            dropdownClassName="certain-category-search-dropdown"
            dropdownMatchSelectWidth={500}
            style={{ width: '100%' }}
            options={options}
          >
            <Input.Search size="large" placeholder="" />
          </AutoComplete>
          </Form.Item>
          <Form.Item label='Image Name' name='image_name'>
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
        <Drawer
          title="Image Build Log"
          placement="bottom"
          closable={true}
          height='60%'
          visible={logDrawerVisible}
          onClose={onCloseLogDrawer}
        >
          <p>Show build logs...</p>
        </Drawer>
      </div>
    </Content>
  );
}
