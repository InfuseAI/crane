import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Table, Tag, notification } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { get } from 'lodash';
import { send } from './utils/ipcClient';
import { format } from 'timeago.js';
import { useHistory } from 'react-router-dom';
import filesize from 'filesize.js';
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

interface Tag {
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
        width: '50%',
        render: (name, tag) => `${record.namespace}/${record.name}:${name}`,
      },
      {
        title: 'STATUS',
        dataIndex: 'tag_status',
        key: 'tag_status',
        align: 'center',
        width: '10%',
        render: (status) => <Tag color='cyan'>{status}</Tag>
      },
      {
        title: 'SIZE',
        dataIndex: 'full_size',
        key: 'full_size',
        align: 'right',
        render: (value) => filesize(value),
        width: '10%',
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
        title: 'Action',
        dataIndex: 'name',
        key: 'action',
        align: 'center',
        width: '10%',
        render: (name, tag) => (
          <Button
            size='small'
            type='primary'
            shape='round'
            icon={<ExportOutlined />}
            onClick={() => {
              const tag = `${record.namespace}/${record.name}:${name}`;
              history.push(`/createPrimeHubImage?tag=${tag}`);
            }}
          ></Button>
        ),
      },
    ];
    const data: Tag[] = nestedData[record.name];
    return (
      <Table
        showHeader={false}
        loading={tagsLoading[record.name] || !data}
        columns={columns}
        dataSource={data}
        pagination={false}
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
      console.log('Tags: ', results);
      setTagsLoading({
        [record.name]: false,
      });
      setNestedData({
        [record.name]: results,
      });
    })();
  };

  useEffect(() => {
    fetchCredential();
  }, []);

  useEffect(() => {
    console.log('DockerHub Credential: ', dockerhub);
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
        console.log('Repos: ', result);
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
      title: 'TAG NAME',
      dataIndex: 'name',
      key: 'name',
      width: '50%',
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
          return <Tag color='orange'>Private</Tag>;
        } else {
          return <Tag color='green'>Public</Tag>;
        }
      },
    },
    {
      title: 'SIZE',
      key: 'full_size',
      align: 'right',
      width: '10%',
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
      title: 'ACTION',
      key: 'action',
      align: 'center',
      width: '10%',
    },
  ];
  return (
    <React.Fragment>
      <Table
        columns={columns}
        dataSource={repos}
        pagination={false}
        loading={loading}
        expandable={{
          expandedRowRender,
          expandRowByClick: true,
          onExpand,
        }}
      />
    </React.Fragment>
  );
}
