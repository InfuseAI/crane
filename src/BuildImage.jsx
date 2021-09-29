import React, { useEffect, useState } from 'react';
import {
  Layout,
  Breadcrumb,
  Form,
  Input,
  Button,
  Row,
  Col,
  AutoComplete,
  Drawer,
  notification,
} from 'antd';
import { SiPython } from 'react-icons/si';
import { send, listen, unlisten } from './utils/ipcClient';

const { Content } = Layout;
const { TextArea } = Input;

const buildNotification = (name, isSuccess) => {
  if (isSuccess) {
    notification['success']({
      message: 'Build Success',
      description: `Image '${name || '<none>'}' is ready`,
    });
  } else {
    notification['error']({
      message: 'Build Failed',
      description: `Image '${name || '<none>'}' failed`,
    });
  }
};

const renderTitle = (title) => (
  <span>
    {title}
    <a
      style={{ float: 'right' }}
      href='https://docs.primehub.io/docs/guide_manual/images-list'
      target='_blank'
      rel='noopener noreferrer'
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
        {<SiPython />} {pythonVersion}
      </span>
    </div>
  ),
});

export default function BuildImage() {
  const [options, updateOptions] = useState([]);
  const [logDrawerVisible, setLogDrawerVisible] = useState(false);
  const [blockBuildButton, setBlockBuildButton] = useState(false);
  const [form] = Form.useForm();
  const placeholder = `one package per line. e.g., \npackage1\npackage2\n`;
  const onFinish = async (values) => {
    console.log('form values', values);
    setBlockBuildButton(true);
    setLogDrawerVisible(true);
    document.getElementById('build-console').innerHTML = '';
    const result = await send('build-image', values);
    console.log(result);
    listen('build-log', (payload) => {
      buildLogReceiver(payload);
    });
  };
  const onCloseLogDrawer = () => {
    setLogDrawerVisible(false);
  };
  const buildLogReceiver = (payload) => {
    if (payload.stage === 'finished') {
      console.log(payload);
      const name = payload.name;
      buildNotification(name, !payload.output.find((x) => x.error));
      setBlockBuildButton(false);
      unlisten('build-log');
    } else if (payload.stage === 'progressing') {
      console.log(payload);
      const logConsole = document.getElementById('build-console');
      if (payload.output.stream) {
        logConsole.innerHTML += `<p style='margin: 0'>${payload.output.stream}</p>`;
      } else if (payload.output.error) {
        logConsole.innerHTML += `<p style='margin: 0;color:red'>${payload.output.error}</p>`;
      }
      logConsole.scrollTop = logConsole.scrollHeight - logConsole.clientHeight;
    }
  };
  const initialValues = {
    base_image_url: 'ubuntu:xenial',
    apt: `curl\ngit`,
  };
  useEffect(() => {
    async function fetchPrimeHubNotebooks() {
      const primehubNotebooks = await send('get-primehub-notebooks');
      if (primehubNotebooks) {
        let primehubNotebookOptions = primehubNotebooks.map((x) => {
          let row = {};
          row.label = renderTitle(x.rows[0][0].replace(/ [0-9.]+$/, ''));
          row.options = x.rows.map((y) => {
            return renderItem(y[1], y[3]);
          });
          return row;
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
              dropdownClassName='certain-category-search-dropdown'
              dropdownMatchSelectWidth={500}
              style={{ width: '100%' }}
              options={options}
            >
              <Input.Search size='large' placeholder='' />
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
            <Button type='primary' htmlType='submit' loading={blockBuildButton}>
              Build
            </Button>
            <Button
              style={{ margin: '0 8px' }}
              onClick={() => setLogDrawerVisible(!logDrawerVisible)}
            >
              Console
            </Button>
          </Form.Item>
        </Form>
        <Drawer
          title='Image Build Log'
          placement='bottom'
          closable={true}
          height='60%'
          visible={logDrawerVisible}
          onClose={onCloseLogDrawer}
        >
          <div
            id='build-console'
            style={{
              backgroundColor: '#222222',
              color: 'white',
              height: '99%',
              overflow: 'scroll',
              fontSize: 'small',
              fontFamily:
                'Consolas,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New, monospace',
            }}
          />
        </Drawer>
      </div>
    </Content>
  );
}
