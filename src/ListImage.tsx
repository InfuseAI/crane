import React, { useEffect, useState } from 'react';
import {
  Layout,
  Breadcrumb,
  Button,
  Tabs,
  Table,
  Empty,
  Drawer,
  notification,
} from 'antd';
import useLocalStorage from './hooks/useLocalStorage';
import { LazyLog, ScrollFollow } from 'react-lazylog';
import { CloudUploadOutlined } from '@ant-design/icons';
import { send, listen, unlisten } from './utils/ipcClient';
import ListRemoteImages from './ListRemoteImage';
import { format } from 'timeago.js';
import filesize from 'filesize.js';
const Status = {
  PREPARING: 'preparing',
  FINISHED: 'finished',
  BUILDING: 'building',
  PROGRESSING: 'progressing',
};

const { Content } = Layout;
const { TabPane } = Tabs;

export default function ListImage() {
  const [imageList, updateImageList] = useState([]);
  const [logDrawerVisible, setLogDrawerVisible] = useState(false);
  const [logText, setLogText] = useLocalStorage('push_log');
  const buildNotification = (name, isSuccess) => {
    if (isSuccess) {
      notification['success']({
        message: 'Push Success',
        description: `Image ${name || ''} pushed`,
      });
    } else {
      notification['error']({
        message: 'Push Failed',
        description: `Image ${name || ''} push failed`,
      });
    }
  };
  const pushLogReceiver = (ipc_name) => {
    console.log('Start receive push log stream', ipc_name);
    listen(ipc_name, (payload) => {
      if (payload.stage === Status.FINISHED) {
        const name = ipc_name.replace('push-log-', '');
        buildNotification(name, !payload.output.find((x) => x.error));
        setLogDrawerVisible(false);
        unlisten(ipc_name);
      } else if (payload.stage === Status.PROGRESSING) {
        if (payload.output.stream) {
          setLogText((prevData) => prevData + payload.output.stream);
        } else if (payload.output.progress) {
          // If has progress replace last line make progress bar like animation
          setLogText(
            (prevData) =>
              prevData.replace(/\n.*$/, '\n') + payload.output.progress
          );
        } else if (payload.output.status) {
          const output = `\n${
            payload.output.id ? `${payload.output.id}: ` : ''
          }${payload.output.status}`;
          setLogText((prevData) => prevData + output);
        }
      }
    });
  };
  const pushImage = async (image_name) => {
    console.log('Push Image: ', image_name);
    const ipc_name = await send('push-image-dockerhub', { image_name });
    console.log(ipc_name);
    if (ipc_name) {
      setLogDrawerVisible(true);
      setLogText(`Start receive push log stream: ${image_name}`);
      pushLogReceiver(ipc_name);
    }
  };

  useEffect(() => {
    async function fetchImageList() {
      const results = await send('list-image');
      console.log(results);
      const images = results
        .filter((x) => x.RepoTags)
        .map((x) => {
          let i = {};
          i.name = x.RepoTags[0].split(':')[0];
          i.tag = x.RepoTags[0].split(':')[1];
          i.imageId = x.Id.split(':')[1].substring(0, 12);
          i.key = i.imageId;
          i.created = format(x.Created * 1000);
          i.size = filesize(x.Size);
          return i;
        });
      console.log(images);
      updateImageList(images);
    }
    fetchImageList();
  }, []);

  const columns = [
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      sortDirections: ['ascend', 'descend'],
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'TAG',
      dataIndex: 'tag',
      key: 'tag',
    },
    {
      title: 'IMAGE ID',
      dataIndex: 'imageId',
      key: 'imageId',
    },
    {
      title: 'CREATED',
      key: 'created',
      dataIndex: 'created',
    },
    {
      title: 'SIZE',
      key: 'size',
      dataIndex: 'size',
    },
    {
      title: 'Action',
      key: 'action',
      render: (text, record) => (
        <Button
          size='small'
          type='primary'
          shape='round'
          icon={<CloudUploadOutlined />}
          onClick={() => pushImage(record.name + ':' + record.tag)}
        ></Button>
      ),
    },
  ];

  return (
    <Content style={{ margin: '0 16px' }}>
      <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Crane</Breadcrumb.Item>
        <Breadcrumb.Item>List Docker Image</Breadcrumb.Item>
      </Breadcrumb>
      <div
        className='site-layout-background'
        style={{ padding: 24, minHeight: 360 }}
      >
        <Tabs defaultActiveKey='1' size='large' style={{ marginBottom: 32 }}>
          <TabPane tab='LOCAL' key='1'>
            <Table
              columns={columns}
              dataSource={imageList}
              pagination={false}
            />
          </TabPane>
          <TabPane tab='REMOTE REPOSITORIES' key='2'>
            <ListRemoteImages />
          </TabPane>
        </Tabs>
      </div>
      <Drawer
        title='Push Log'
        placement='bottom'
        closable={true}
        height='60%'
        visible={logDrawerVisible}
        onClose={() => setLogDrawerVisible(false)}
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
    </Content>
  );
}
