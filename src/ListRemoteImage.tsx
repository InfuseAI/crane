import React, { useEffect, useState } from 'react';
import { Tooltip, Button, Table, Tag, notification } from 'antd';
import {
  ExportOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { send } from './utils/ipcClient';
import { format } from 'timeago.js';
import { useHistory } from 'react-router-dom';
import filesize from 'filesize';
import { ImageInfo } from 'dockerode';
import {
  DockerHubRepository,
  DockerHubImage,
} from './electron/DockerHubAdapter';

interface ImageTag {
  key: any;
  name: string;
  tag_active: string;
  full_size: number;
  images: DockerHubImage[];
}

export default function ListRemoteImages() {
  const history = useHistory();
  const [nestedData, setNestedData] = useState({});
  const [tagsLoading, setTagsLoading] = useState({});
  const [repos, setRepos] = useState<Partial<DockerHubRepository>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const expandedRowRender = (
    record: Partial<DockerHubRepository>,
    index,
    indent,
    expanded
  ) => {
    const repoName = record.name || '';
    const columns: any = [
      {
        title: 'NAME',
        dataIndex: 'name',
        key: 'name',
        width: '40%',
        render: (name, tag: ImageTag) =>
          `${record.namespace}/${repoName}:${name}`,
      },
      {
        title: 'STATUS',
        dataIndex: 'tag_status',
        key: 'tag_status',
        align: 'center',
        width: '10%',
        render: (status) => (
          <Tag className='tag-status' color='cyan'>
            {status.toUpperCase()}
          </Tag>
        ),
      },
      {
        title: 'SIZE',
        dataIndex: 'full_size',
        key: 'full_size',
        align: 'right',
        render: (value) => filesize(value, { round: 1 }),
        width: '15%',
      },
      {
        title: 'LAST UPDATED',
        dataIndex: 'last_updated',
        key: 'last_updated',
        align: 'left',
        width: '20%',
        render: (value) => format(value),
      },
      {
        dataIndex: 'name',
        key: 'action',
        align: 'center',
        width: '15%',
        render: (name, tag) => (
          <Tooltip placement='top' title='Add to PrimeHub'>
            <Button
              className='actionBtn'
              size='small'
              icon={<ExportOutlined />}
              onClick={async () => {
                const tag = `${record.namespace}/${repoName}:${name}`;
                const results = (await send('list-image')) as ImageInfo[];
                const image = results.find(
                  (x) => x.RepoTags && x.RepoTags.includes(tag)
                );
                const description =
                  ((image || {}).Labels || {})['crane.description'] || '';
                const uri = encodeURI(
                  `/createPrimeHubImage?tag=${tag}&&description=${description}`
                );
                history.push(uri);
              }}
            >
              ADD
            </Button>
          </Tooltip>
        ),
      },
    ];
    const data: ImageTag[] = nestedData[repoName];
    return (
      <Table
        size='small'
        showHeader={false}
        loading={tagsLoading[repoName] || !data}
        columns={columns}
        dataSource={data}
        pagination={false}
        className='tags-table'
        rowClassName='tags-row'
      />
    );
  };

  const onExpand = (expanded, record) => {
    setTagsLoading({
      [record.name]: true,
    });
    (async () => {
      const { images, errorMsg } = (await send(
        'list-dockerhub-images',
        record.name
      )) as { images: DockerHubImage[]; errorMsg: string };
      if (errorMsg) {
        errorNotificationHandler(errorMsg);
      } else {
        setNestedData({
          ...nestedData,
          [record.name]: images,
        });
      }
      setTagsLoading({
        ...tagsLoading,
        [record.name]: false,
      });
    })();
  };

  const errorNotificationHandler = (error: string) => {
    let message;
    let description;
    switch (error) {
      case 'Missing DockerHub Credential':
        message = error;
        description = 'Please add your DockerHub credential';
        break;
      default:
        message = 'Something wrong when fetch remote repositories :(..';
        description = error;
        break;
    }
    notification.error({
      message,
      description,
    });
  };

  const genFetchRepo = () => {
    return async () => {
      setLoading(true);
      const { repositories, errorMsg } = (await send(
        'list-dockerhub-repositories'
      )) as { repositories: DockerHubRepository[]; errorMsg: string };
      if (errorMsg) {
        errorNotificationHandler(errorMsg);
      } else {
        setRepos(repositories);
      }
      setLoading(false);
    };
  };

  useEffect(() => {
    genFetchRepo()();
  }, []);

  const columns: any = [
    {
      title: 'TAG',
      dataIndex: 'name',
      key: 'name',
      width: '40%',
      render: (value, record) => `${record.namespace}/${value}`,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'STATUS',
      dataIndex: 'is_private',
      key: 'tag_status',
      align: 'center',
      width: '10%',
      render: (is_private) => {
        if (is_private) {
          return <Tag color='orange'>PRIVATE</Tag>;
        } else {
          return <Tag className='tag-public'>PUBLIC</Tag>;
        }
      },
    },
    {
      title: 'SIZE',
      key: 'full_size',
      align: 'right',
      width: '15%',
      render: () => '-',
    },
    {
      title: 'LAST UPDATED',
      dataIndex: 'last_updated',
      key: 'last_updated',
      align: 'left',
      width: '20%',
      render: (value) => format(value),
      defaultSortOrder: 'descend',
      sorter: (a, b) => {
        return (
          new Date(a.last_updated).getTime() -
          new Date(b.last_updated).getTime()
        );
      },
    },
    {
      key: 'action',
      align: 'center',
      width: '15%',
    },
  ];
  return (
    <React.Fragment>
      <div
        style={{
          marginBottom: 0,
          position: 'relative',
          textAlign: 'right',
        }}
      >
        <Button
          style={{
            position: 'absolute',
            top: -60,
            right: 0,
          }}
          type='primary'
          onClick={genFetchRepo()}
          disabled={loading}
        >
          {loading ? <LoadingOutlined /> : <ReloadOutlined />}
          REFRESH
        </Button>
      </div>

      <Table
        size='small'
        className='repo-table'
        columns={columns}
        dataSource={repos}
        pagination={false}
        loading={loading}
        expandable={{
          expandedRowRender,
          expandRowByClick: true,
          onExpand,
        }}
        sticky={true}
      />
    </React.Fragment>
  );
}
