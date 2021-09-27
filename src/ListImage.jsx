import React, { useEffect, useState } from 'react';
import { Layout, Breadcrumb, List, Button} from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import { send, listen , unlisten } from './utils/ipcClient';

const { Content } = Layout;

export default function ListImage() {
  const [imageList, udpateImageList] = useState([]);

  useEffect(() => {
    async function fetchImageList() {
      const results = await send('list-image');
      const images = results.map(x => (x.RepoTags) ? x.RepoTags[0] : x.Id);
      console.log(images);
      udpateImageList(images);
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
      </div>
    </Content>
  );
}
