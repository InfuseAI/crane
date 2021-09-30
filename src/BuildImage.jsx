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
import useLocalStorage from './hooks/useLocalStorage';
import { SiPython } from 'react-icons/si';
import { send, listen, unlisten } from './utils/ipcClient';
import { LazyLog, ScrollFollow } from 'react-lazylog';

const { Content } = Layout;
const { TextArea } = Input;

const EMPTY_STRING = '\r\n';

const Status = {
  PREPARING: 'preparing',
  FINISHED: 'finished',
  BUILDING: 'building',
  PROGRESSING: 'progressing',
};

const buildNotification = (name, isSuccess) => {
  if (isSuccess) {
    notification['success']({
      message: 'Build Success',
      description: `Image ${name || ''} is ready`,
    });
  } else {
    notification['error']({
      message: 'Build Failed',
      description: `Image ${name || ''} failed`,
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
  const [logText, setLogText] = useLocalStorage('build_log');
  const [form] = Form.useForm();
  const placeholder = `one package per line. e.g., \npackage1\npackage2\n`;
  const onFinish = async (values) => {
    console.log('form values', values);
    setBlockBuildButton(true);
    setLogDrawerVisible(true);
    setLogText('');
    await send('build-image', values);
  };
  const onCloseLogDrawer = () => {
    setLogDrawerVisible(false);
  };
  const buildLogReceiver = (payload) => {
    if (payload.stage === Status.FINISHED) {
      console.log(payload);
      const name = payload.name;
      buildNotification(name, !payload.output.find((x) => x.error));
      setLogText(`${payload.output.map((p) => p.stream).join('')}`);
      setBlockBuildButton(false);
      unlisten('build-log');
    } else if (payload.stage === Status.PROGRESSING) {
      if (payload.output.stream) {
        console.log(payload.output.stream);
        setLogText((prevData) => prevData + payload.output.stream);
      }
    }
  };

  const initialValues = {
    base_image_url: 'ubuntu:xenial',
    apt: `curl\ngit`,
  };

  useEffect(() => {
    async function fetchCurrntBuild() {
      const buildStatus = await send('build-status');
      console.log('Build Status:', buildStatus);
      if (buildStatus === Status.BUILDING || buildStatus === Status.PREPARING) {
        setBlockBuildButton(true);
        setLogDrawerVisible(true);
      } else {
        setLogText(EMPTY_STRING);
      }
      unlisten('build-log');
      listen('build-log', (payload) => {
        buildLogReceiver(payload);
      });
      console.log('Listening build log...');
    }
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
    fetchCurrntBuild();
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
          <Form.Item label='Image Name' name='image_name' required>
            <Input disabled={blockBuildButton}/>
          </Form.Item>
          <Form.Item label='Base Image' name='base_image_url' required>
            <AutoComplete
              dropdownClassName='certain-category-search-dropdown'
              dropdownMatchSelectWidth={500}
              style={{ width: '100%' }}
              options={options}
              disabled={blockBuildButton}
            >
              <Input.Search size='large' placeholder='' disabled={blockBuildButton} />
            </AutoComplete>
          </Form.Item>
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item label='apt' name='apt'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                  disabled={blockBuildButton}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='conda' name='conda'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                  disabled={blockBuildButton}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='pip' name='pip'>
                <TextArea
                  allowClear={true}
                  autoSize={{ minRows: 5, maxRows: 5 }}
                  placeholder={placeholder}
                  disabled={blockBuildButton}
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
          <ScrollFollow
            startFollowing={true}
            render={({ follow, onScroll }) => (
              <LazyLog
                text={logText}
                stream
                follow={follow}
                onScroll={onScroll}
              />
            )}
          />
        </Drawer>
      </div>
    </Content>
  );
}
