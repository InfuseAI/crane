import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ImageInfo } from 'dockerode';
import {
  Layout,
  Breadcrumb,
  Button,
  Select,
  Tabs,
  Typography,
  Table,
  Tooltip,
  Drawer,
  notification,
} from 'antd';
import useLocalStorage from './hooks/useLocalStorage';
import { LazyLog, ScrollFollow } from 'react-lazylog';
import { CloudUploadOutlined } from '@ant-design/icons';
import { send, listen, unlisten } from './utils/ipcClient';
import ListRemoteImages from './ListRemoteImage';
import ListAwsImages from './ListAwsImages';
import { format } from 'timeago.js';
import filesize from 'filesize';

const DOCKERHUB = 'DockerHub';
const AWS = 'AWS';

const { Option } = Select;
const { Text } = Typography;
const Status = {
  PREPARING: 'preparing',
  FINISHED: 'finished',
  BUILDING: 'building',
  PROGRESSING: 'progressing',
};

const { Content } = Layout;
const { TabPane } = Tabs;

interface ImageDataSource {
  name: string;
  tag: string;
  imageId: string;
  key: string;
  created: string;
  createdTime: any;
  size: string;
  alias: {
    name: string;
    tag: string;
    imageId: string;
  }[];
}

export default function ListImage() {
  const history = useHistory();
  const [imageList, updateImageList] = useState([] as ImageDataSource[]);
  const [logDrawerVisible, setLogDrawerVisible] = useState(false);
  const [remote, setRemote] = useLocalStorage('remote', DOCKERHUB);
  const [logText, setLogText] = useLocalStorage('push_log', '');
  const [hasCredentials, setHasCredentials] = useState({
    dockerhub: false,
    aws: false,
  });
  const buildNotification = (name, isSuccess, payload) => {
    if (isSuccess) {
      notification.success({
        message: 'Push Success',
        description: `Image ${name || ''} pushed`,
      });
    } else {
      const err = payload.output.find((x) => x.error);
      notification.error({
        message: 'Push Failed',
        description: (
          <div>
            Image ${name || ''} push failed
            <br />
            {err.error.split('\n').map((line) => (
              <span>
                {line}
                <br />
              </span>
            ))}
          </div>
        ),
      });
    }
  };
  const pushLogReceiver = (ipc_name) => {
    console.log('Start receive push log stream', ipc_name);
    listen(ipc_name, (payload) => {
      if (payload.stage === Status.FINISHED) {
        const name = ipc_name.replace('push-log-', '');
        buildNotification(name, !payload.output.find((x) => x.error), payload);
        setLogDrawerVisible(false);
        unlisten(ipc_name);
      } else if (payload.stage === Status.PROGRESSING) {
        if (payload.output.stream) {
          setLogText((prevData) => prevData + payload.output.stream);
        } else if (payload.output.status) {
          // Handle the pulling image output
          if (payload.output.id) {
            const output = `${payload.output.id}: ${payload.output.status} ${
              payload.output.progress || ''
            }`;
            setLogText((prevData) => {
              if (prevData.search(payload.output.id) === -1) {
                prevData = prevData + output + '\n';
              } else {
                prevData = prevData.replace(
                  new RegExp(`${payload.output.id}:.*\n`),
                  output + '\n'
                );
              }
              return prevData;
            });
          } else {
            setLogText((prevData) => prevData + payload.output.status + '\n');
          }
        } else if (payload.output.progress) {
          // If has progress replace last line make progress bar like animation
          setLogText(
            (prevData) =>
              prevData.replace(/\n.*$/, '\n') + payload.output.progress
          );
        }
      }
    });
  };
  const pushImage = async (image_name) => {
    console.log('Push Image: ', image_name);
    const ipc_name = await send('push-image-dockerhub', { image_name });
    if (ipc_name) {
      setLogDrawerVisible(true);
      setLogText(`Start receive push log stream: ${image_name}`);
      pushLogReceiver(ipc_name);
    }
  };

  const pushImageToAWS = async (image_name) => {
    console.log('Push Image to AWS: ', image_name);
    const ipc_name = await send('push-image-aws', { image_name });
    if (ipc_name) {
      setLogDrawerVisible(true);
      setLogText(`Start receive push log stream: ${image_name}`);
      pushLogReceiver(ipc_name);
    }
  };

  useEffect(() => {
    async function fetchCredentials() {
      const dockerHubCredential: any = await send('get-dockerhub-credential');
      const awsCredential: any = await send('get-aws-credential');
      const credentialsExist = {
        dockerhub: !!(
          dockerHubCredential.account && dockerHubCredential.password
        ),
        aws: !!(awsCredential.accessKey && awsCredential.secretKey),
      };
      setHasCredentials(credentialsExist);
    }

    async function fetchImageList() {
      const results = (await send('list-image')) as ImageInfo[];
      const images = results
        .filter((x) => x.RepoTags)
        .map((x) => {
          const repoTags = x.RepoTags.sort(
            (a, b) => a.length - b.length || a.localeCompare(b)
          );
          const [name, tag] = (repoTags.shift() || 'none').split(':');
          const alias = repoTags.map((r) => {
            const [name, tag] = r.split(':');
            const imageId = x.Id.split(':')[1].substring(0, 12);
            return { name, tag, imageId };
          });

          return {
            name: name,
            tag: tag,
            imageId: x.Id.split(':')[1].substring(0, 12),
            key: x.Id.split(':')[1].substring(0, 12),
            created: format(x.Created * 1000),
            createdTime: x.Created,
            size: filesize(x.Size, { round: 1 }),
            alias: alias,
          } as ImageDataSource;
        });
      updateImageList(images);
    }
    fetchCredentials();
    fetchImageList();
  }, []);

  const expandedRowRender = (record: ImageDataSource) => {
    const columns: any[] = [
      {
        dataIndex: 'name',
        key: 'alias_name',
        width: '35%',
        render: (val) => <Text disabled>{val}</Text>,
      },
      {
        title: 'TAG',
        dataIndex: 'tag',
        key: 'alias_tag',
        width: '10%',
        render: (val) => <Text disabled>{val}</Text>,
      },
      {
        title: 'IMAGE ID',
        dataIndex: 'imageId',
        key: 'alias_imageId',
        width: '15%',
        render: (val) => <Text disabled>{val}</Text>,
      },
      {
        title: 'CREATED',
        key: 'alias_created',
        dataIndex: 'created',
        width: '15%',
        render: (val) => <Text type='secondary'> - </Text>,
      },
      {
        title: 'SIZE',
        key: 'alias_size',
        dataIndex: 'size',
        width: '15%',
        render: (val) => <Text type='secondary'> - </Text>,
      },
      {
        key: 'action',
        align: 'center',
        width: '10%',
        render: (text, record) => {
          if (record.name !== '<none>') {
            return (
              <Tooltip title={`Push Image to ${remote}`}>
                <Button
                  className='actionBtn'
                  size='small'
                  icon={<CloudUploadOutlined />}
                  onClick={() => {
                    const imageName = `${record.name}:${record.tag}`;
                    switch (remote) {
                      case DOCKERHUB:
                        pushImage(imageName);
                        break;
                      case AWS:
                        pushImageToAWS(imageName);
                        break;
                      default:
                        notification.error({
                          message: 'Push Failed',
                          description: 'Unknown Remote',
                        });
                    }
                  }}
                >
                  PUSH
                </Button>
              </Tooltip>
            );
          }
        },
      },
    ];
    const data = record.alias.map((x) => {
      const { name, tag, imageId } = x;
      return {
        key: `${name}:${tag}`,
        name,
        tag,
        imageId,
      };
    });
    return (
      <Table
        size='small'
        showHeader={false}
        columns={columns}
        dataSource={data}
        pagination={false}
        className='alias-table'
        rowClassName='alias-row'
      />
    );
  };
  const columns = [
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      width: '35%',
      sortDirections: ['ascend', 'descend'],
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'TAG',
      dataIndex: 'tag',
      key: 'tag',
      width: '10%',
    },
    {
      title: 'IMAGE ID',
      dataIndex: 'imageId',
      key: 'imageId',
      width: '15%',
    },
    {
      title: 'CREATED',
      key: 'created',
      dataIndex: 'created',
      width: '15%',
      defaultSortOrder: 'descend',
      sorter: (a, b) => {
        return a.createdTime - b.createdTime;
      },
    },
    {
      title: 'SIZE',
      key: 'size',
      dataIndex: 'size',
      width: '15%',
    },
    {
      key: 'action',
      align: 'center',
      width: '10%',
      render: (text, record) => {
        if (record.name !== '<none>') {
          return (
            <Tooltip title={`Push Image to ${remote}`}>
              <Button
                className='actionBtn'
                size='small'
                icon={<CloudUploadOutlined />}
                onClick={() => {
                  const imageName = `${record.name}:${record.tag}`;
                  switch (remote) {
                    case DOCKERHUB:
                      pushImage(imageName);
                      break;
                    case AWS:
                      pushImageToAWS(imageName);
                      break;
                    default:
                      notification.error({
                        message: 'Push Failed',
                        description: 'Unknown Remote',
                      });
                  }
                }}
              >
                PUSH
              </Button>
            </Tooltip>
          );
        }
      },
    },
  ];

  const onWarehouseChange = (value) => {
    console.log(`Switch warehouse to ${value}`);
    setRemote(value);
  };

  const tabBarExtraContent = {
    right: (
      <React.Fragment>
        <Text type='secondary'>Choose a remote warehouse: </Text>
        <Select
          defaultValue={remote}
          onChange={onWarehouseChange}
          style={{ width: 130 }}
        >
          <Option disabled={!hasCredentials.dockerhub} value={DOCKERHUB}>
            DockerHub
          </Option>
          <Option disabled={!hasCredentials.aws} value={AWS}>
            {!hasCredentials.aws ? (
              <Tooltip
                placement='left'
                title={
                  <div>
                    Please {/* eslint-disable-next-line */}
                    <a onClick={() => history.push('/settings/aws')}>
                      Setup AWS Credential
                    </a>{' '}
                    first.
                  </div>
                }
              >
                <div>AWS</div>
              </Tooltip>
            ) : (
              'AWS'
            )}
          </Option>
        </Select>
      </React.Fragment>
    ),
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
        <Tabs
          defaultActiveKey='1'
          size='large'
          style={{ marginBottom: 32 }}
          tabBarExtraContent={tabBarExtraContent}
        >
          <TabPane tab='LOCAL' key='1'>
            <Table
              className='images-table'
              rowClassName='images-row'
              size='small'
              sticky={true}
              columns={columns}
              dataSource={imageList}
              pagination={false}
              expandable={{
                expandedRowRender,
                expandRowByClick: true,
                rowExpandable: (record) => record.alias.length > 0,
              }}
            />
          </TabPane>
          <TabPane tab='REMOTE' key='2'>
            {remote === DOCKERHUB ? <ListRemoteImages /> : <></>}
            {remote === AWS ? <ListAwsImages /> : <></>}
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
