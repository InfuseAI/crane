import React, { useEffect, useState } from 'react';
import { Tooltip, Button, Table, Tag } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { send } from './utils/ipcClient';
import { format } from 'timeago.js';
import { useHistory } from 'react-router-dom';
import filesize from 'filesize';
import { ECR } from 'aws-sdk';
interface Repository {
  key: any;
  id: string;
  name: string;
  arn: string;
  uri: string;
  is_private: boolean;
  created_at: Date;
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

export default function ListAwsImages() {
  const history = useHistory();
  const [nestedData, setNestedData] = useState({});
  const [tagsLoading, setTagsLoading] = useState({});
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const expandedRowRender = (record: Repository, index, indent, expanded) => {
    const columns: any[] = [
      {
        title: 'NAME',
        dataIndex: 'name',
        key: 'name',
        width: '40%',
        render: (name, tag: ImageTag) => `${name}`,
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
        title: 'CREATED AT',
        dataIndex: 'created_at',
        key: 'created_at',
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
                const uri = `${record.uri}/${record.name}:${name}`;
                history.push(`/createPrimeHubImage?tag=${uri}`);
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
      const imageDetailList = (await send(
        'list-aws-ecr-images',
        record.name
      )) as ECR.ImageDetailList;
      console.log(imageDetailList);

      const images = imageDetailList.map((image, idx) => {
        const tag = image.imageTags ? image.imageTags[0] : '';
        return {
          key: idx,
          name: tag,
          full_size: image.imageSizeInBytes,
          tag_status: 'active',
          created_at: image.imagePushedAt,
        };
      });

      setTagsLoading({
        ...tagsLoading,
        [record.name]: false,
      });
      setNestedData({
        ...nestedData,
        [record.name]: images,
      });
    })();
  };

  useEffect(() => {
    console.log('Fetching AWS ECR repositories...');
    async function fetchRepositories() {
      const repositories = (await send(
        'list-aws-ecr-repositories'
      )) as ECR.RepositoryList;
      setRepos(
        repositories.map((repo, idx) => {
          return {
            key: idx,
            id: repo.registryId,
            name: repo.repositoryName,
            arn: repo.repositoryArn,
            uri: repo.repositoryUri,
            is_private: true,
            created_at: repo.createdAt,
          } as Repository;
        })
      );
      setLoading(false);
      console.log(repositories);
    }
    fetchRepositories();
  }, []);

  const columns: any[] = [
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      width: '40%',
      render: (value, record) => `${value}`,
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
      title: 'CREATED AT',
      dataIndex: 'created_at',
      key: 'created_at',
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
