import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tooltip, Button, Table, Tag, notification } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { get } from 'lodash';
import { send } from './utils/ipcClient';
import { format } from 'timeago.js';
import { useHistory } from 'react-router-dom';
import filesize from 'filesize';
const API_BASE_URL = 'https://hub.docker.com';
const API_VERSION = 'v2';
const API_URL = `${API_BASE_URL}/${API_VERSION}`;

interface Credential {
  account: string;
  password: string;
}

interface Repository {
  key: any;
  user: string;
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  description: string;
  is_private: boolean;
  last_updated: string;
}

interface Image {
  architecture: string;
  os: string;
  size: number;
  last_pushed: string;
  status: string;
}

interface ImageTag {
  key: any;
  name: string;
  tag_active: string;
  full_size: number;
  images: Image[];
}

export default function ListRemoteImages() {
  const history = useHistory();
  const [dockerhub, setDockerhub] = useState<Partial<Credential>>({});
  const [client, setClient] = useState<any>(null);
  const [nestedData, setNestedData] = useState({});
  const [tagsLoading, setTagsLoading] = useState({});
  const [repos, setRepos] = useState<Partial<Repository>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchCredential = async () => {
    // @ts-ignore
    const credential: any = await send('get-dockerhub-credential');
    setDockerhub(credential);
  };

  const genClient = async (username, password) => {
    const loginURL = `${API_URL}/users/login`;
    const resp = await axios.post(loginURL, { username, password });
    const token = get(resp, 'data.token', null);
    const AUTH_TOKEN = `JWT ${token}`;
    const instance: any = axios.create({
      baseURL: API_URL,
    });
    instance.defaults.headers.common['Authorization'] = AUTH_TOKEN;
    return instance;
  };

  const expandedRowRender = (record: Repository, index, indent, expanded) => {
    const columns = [
      {
        title: 'NAME',
        dataIndex: 'name',
        key: 'name',
        width: '40%',
        render: (name, tag: ImageTag) =>
          `${record.namespace}/${record.name}:${name}`,
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
        align: 'right',
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
              onClick={() => {
                const tag = `${record.namespace}/${record.name}:${name}`;
                history.push(`/createPrimeHubImage?tag=${tag}`);
              }}
            >
              ADD
            </Button>
          </Tooltip>
        ),
      },
    ];
    const data: ImageTag[] = nestedData[record.name];
    return (
      <Table
        size='small'
        showHeader={false}
        loading={tagsLoading[record.name] || !data}
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
      const { api } = client;
      const results = get(
        await api.get(`repositories/${record.namespace}/${record.name}/tags`),
        'data.results',
        []
      ).map((tag) => {
        tag.key = tag.id;
        return tag;
      });
      setTagsLoading({
        ...tagsLoading,
        [record.name]: false,
      });
      setNestedData({
        ...nestedData,
        [record.name]: results,
      });
    })();
  };

  useEffect(() => {
    fetchCredential();
  }, []);

  useEffect(() => {
    if (dockerhub.account && dockerhub.password) {
      genClient(dockerhub.account, dockerhub.password).then((api) => {
        setClient({ api });
      });
    }
  }, [dockerhub]);

  // @ts-ignore
  useEffect(async () => {
    if (dockerhub.account && client) {
      const { api } = client;
      try {
        const result = get(
          await api.get(`/repositories/${dockerhub.account}`),
          'data.results',
          []
        ).map((repository: Repository, index: number) => {
          repository.key = index;
          return repository;
        });
        setLoading(false);
        setRepos(result);
      } catch (error) {
        notification.error({
          message: 'Something wrong when fetch remote repositories :(..',
          description: `${error}`,
        });
        console.log(error);
      }
    }
  }, [client]);

  const columns = [
    {
      title: 'TAG',
      dataIndex: 'name',
      key: 'name',
      width: '40%',
      render: (value, record) => `${record.namespace}/${value}`,
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
      align: 'right',
      width: '20%',
      render: (value) => format(value),
    },
    {
      key: 'action',
      align: 'center',
      width: '15%',
    },
  ];
  return (
    <React.Fragment>
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
