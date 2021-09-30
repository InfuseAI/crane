import React, { useEffect, useState } from 'react';
import { Layout, Breadcrumb, Button, Tabs, Table, Empty } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import { send, listen, unlisten } from './utils/ipcClient';
import { format } from 'timeago.js';
import filesize from 'filesize.js';

const { Content } = Layout;
const { TabPane } = Tabs;

export default function ListImage() {
  const [imageList, updateImageList] = useState([]);

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
          type='primary'
          shape='round'
          icon={<CloudUploadOutlined />}
          onClick={() => pushImage(record.name + ':' + record.tag)}
        ></Button>
      ),
    },
  ];

  const pushLogReceiver = (ipc_name) => {
    console.log('Start receive push log stream', ipc_name);
    listen(ipc_name, (payload) => {
      if (payload.stage === 'finished') {
        console.log('output:', payload.output);
        console.log('error:', payload.error);
        unlisten(ipc_name);
        console.log('Stop receive push log stream', ipc_name);
      } else if (payload.stage === 'progressing') {
        console.log(payload.output);
      }
    });
  };
  const pushImage = async (image_name) => {
    console.log('Push Image: ', image_name);
    const ipc_name = await send('push-image-dockerhub', { image_name });
    console.log(ipc_name);
    if (ipc_name) {
      pushLogReceiver(ipc_name);
    }
  };
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
            <Empty />
          </TabPane>
        </Tabs>
      </div>
    </Content>
  );
}
