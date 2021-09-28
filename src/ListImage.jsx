import React, { useEffect, useState } from 'react';
import { Layout, Breadcrumb, List, Button, Tabs, Table, Tag, Space } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import { send, listen , unlisten } from './utils/ipcClient';

const { Content } = Layout;
const { TabPane } = Tabs;

const columns = [
  {
    title: 'NAME',
    dataIndex: 'name',
    key: 'name',
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
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
];

const data = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['loser'],
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sidney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
  },
];

export default function ListImage() {
  const [imageList, updateImageList] = useState([]);

  useEffect(() => {
    async function fetchImageList() {
      const results = await send('list-image');
      console.log(results);
      const images = results.map(x => (x.RepoTags) ? x.RepoTags[0] : x.Id);
      console.log(images);
      updateImageList(images);
    }
    fetchImageList();
  }, []);
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
  }
  const pushImage = async (image_name) => {
    console.log('Push Image: ', image_name);
    const ipc_name = await send('push-image-dockerhub', {image_name});
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
        <Tabs defaultActiveKey="1" size="large" style={{ marginBottom: 32 }}>
          <TabPane tab="LOCAL" key="1">
            <List
            header={<h2>Docker Images</h2>}
            bordered
            dataSource={imageList}
            renderItem={item => (
              <List.Item actions={[
                  <Button 
                    type="primary" 
                    icon={<CloudUploadOutlined />}
                    onClick={() => pushImage(item)}
                  >
                    Push
                  </Button>
                ]}>
                {item}
              </List.Item>
            )}
            />
          </TabPane>
          <TabPane tab="REMOTE REPOSITORIES" key="2">
            <Table columns={columns} dataSource={data} />
          </TabPane>
        </Tabs>

      </div>
    </Content>
  );
}
