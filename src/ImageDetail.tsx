import React, { useEffect, useState } from 'react';
import {
  Layout,
  Breadcrumb,
  Col,
  Row,
  Table,
  //Button,
  //Select,
  //Tabs,
  Typography,
  //Tooltip,
  //Drawer,
  //notification,
} from 'antd';
import filesize from 'filesize';
import { send } from './utils/ipcClient';
import { Sunburst } from '@ant-design/charts';
import { useLocation, Link } from 'react-router-dom';
import { groupBy, map } from 'lodash';

const { Title } = Typography;
const { Content } = Layout;

const mapLayers = (layers) => {
  const rawData = groupBy(layers.map((layer) => {
    const CreatedBy = layer.CreatedBy.split('#(nop) ').pop().trim();
    layer.CreatedBy = CreatedBy.replace('/bin/sh -c', 'RUN');
    const cmd = layer.CreatedBy.split(' ')[0];
    return {
      cmd,
      ...layer
    };
  }), 'cmd');
  const mappedData = map(rawData, (data, key) => {
    const name = key;
    return {
      name,
      label: name,
      children: data.map((child) => {
        return {
          label: child.CreatedBy.slice(0, 80) + '...',
          size: child.Size
        };
      })
    }
  });
  return mappedData;
}

const LayerSunburst = (props) => {
  const { layers, name } = props
  const children = mapLayers(layers);
  const data = {
    name,
    label: name,
    children,
  }
  console.log(data, 111);
  const config = {
    data,
    meta: {
      size: {
        formatter: (value) => {
          return filesize(value, {round: 3});
        }
      },
    },
    innerRadius: 0.2,
    radius: 1,
    width: 700,
    height: 700,
    interactions: [
      {
        type: 'element-active',
      },
    ],
    hierarchyConfig: {
      field: 'size',
    },
    color: ['#C56895', '#E59D23', '#008ED0', '#DCF3EF'],
    label: {
      // label layout: limit label in shape, which means the labels out of shape will be hide
      layout: [
        {
          type: 'limit-in-shape',
        }
      ],
      formatter: (value) => {
        const result = value.data.label?.slice(0, 20) || '';
        return (result.length >= 20) ? `${result}...` : result;
      },
    },
  };

  return <Sunburst {...config} />;
};

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}


export default function ImageDetail() {
  const [layers, setLayers] = useState<any>([]);
  const query = useQuery();
  const name = query.get('name');
  const fetchImage = async (image_name) => {
    const detail = await send('get-image-detail', {image_name});
    setLayers(detail);
  };
  useEffect(() => {
    fetchImage(name);
  }, []);

  const columns = [
    {
      title: 'NO',
      key: 'id',
      dataIndex: 'no',
      width: '5%',
      render: (value, record, index) => index + 1
    },
    {
      title: 'LAYER',
      key: 'CreatedBy',
      ellipsis: true,
      width: '75%',
      align: 'left',
      dataIndex: 'CreatedBy',
    },
    {
      title: 'SIZE',
      key: 'Size',
      width: '20%',
      dataIndex: 'Size',
      render: (val) => filesize(val, {round: 3})
    }
  ];

  return (
    <Content style={{ margin: '0 16px' }}>
      <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Crane</Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to='/images'>
            List image
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Image: {name}</Breadcrumb.Item>
      </Breadcrumb>
      <div
        className='site-layout-background'
        style={{ padding: 24, minHeight: 360 }}
      >
        <Row>
          <Col span={12}>
            <LayerSunburst name={name} layers={layers}/>
          </Col>
          <Col span={12} className='layers-col'>
            <Table
              title={(currentPageData) => {return <Title level={4}>IMAGE LAYERS</Title>}}
              columns={columns}
              className='layer-table'
              dataSource={layers}
              showHeader={false}
              size='middle'
              pagination={false}
            />
          </Col>
        </Row>
      </div>
    </Content>
  );
}
