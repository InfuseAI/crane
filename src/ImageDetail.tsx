import React, { useEffect, useState, useCallback } from 'react';
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
import SyntaxHighlighter from 'react-syntax-highlighter';
import { solarizedDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import filesize from 'filesize';
import { send } from './utils/ipcClient';
import { Sunburst } from '@ant-design/charts';
import { useLocation, Link } from 'react-router-dom';
import { groupBy, map, get, filter, pick } from 'lodash';

const { Title } = Typography;
const { Content } = Layout;

const mapLayers = (layers) => {
  const rawData = groupBy(
    layers.map((layer) => {
      const CreatedBy = layer.CreatedBy.split('#(nop) ').pop().trim();
      layer.CreatedBy = CreatedBy.replace('/bin/sh -c', 'RUN').replace(
        '/bin/bash -o pipefail -c',
        'RUN'
      );
      const cmd = layer.CreatedBy.split(' ')[0];
      return {
        cmd,
        ...layer,
      };
    }),
    'cmd'
  );
  const mappedData = map(rawData, (data, key) => {
    const name = key;
    return {
      name,
      label: name,
      filterKey: key,
      children: data.map((child) => {
        return {
          label: child.CreatedBy.slice(0, 80) + '...',
          ...pick(child, [
            'cmd',
            'name',
            'key',
            'Size',
            'CreatedBy',
            'Created',
          ]),
        };
      }),
    };
  });
  return mappedData;
};

const LayerSunburst = (props) => {
  const { layers, name, onClick, onMouseOver, onMouseLeave } = props;
  const children = mapLayers(layers);
  const data = {
    name,
    label: name,
    children,
  };
  const config = {
    data,
    meta: {
      Size: {
        formatter: (value) => {
          return filesize(value, { round: 3 });
        },
      },
    },
    innerRadius: 0.2,
    radius: 1,
    autoFit: true,
    interactions: [
      {
        type: 'element-active',
      },
    ],
    hierarchyConfig: {
      field: 'Size',
    },
    drilldown: {
      enabled: true,
      breadCrumb: {
        position: 'bottom-left',
        dividerText: '>',
      },
    },
    annotations: [],
    interactiions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
    label: {
      layout: [
        {
          type: 'limit-in-shape',
        },
      ],
      formatter: (value) => {
        const result = value.data.label?.slice(0, 20) || '';
        return result.length >= 20 ? `${result}...` : result;
      },
    },
    onReady: (plot) => {
      plot.off('plot:mouseleave').on('plot:mouseleave', (evt) => {
        onMouseLeave();
      });
      plot.off('click').on('click', (evt) => {
        const { data } = get(evt, 'data.data', {});
        if (data?.filterKey) {
          onClick({ cmd: data.filterKey });
        } else if (data?.key.includes('layer-')) {
          onClick({ key: data.key });
        } else {
          onClick({});
        }
      });
      plot.on('element:mouseover', (evt) => {
        const { data } = get(evt, 'data.data', {});
        if (data.Created) {
          onMouseOver(data.CreatedBy);
        } else {
          onMouseOver();
        }
      });
    },
  };

  // @ts-ignore
  return <Sunburst style={{ height: '100%', width: '100%' }} {...config} />;
};

const MemorizeLayerSunburst = React.memo(LayerSunburst);

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function LayerTable(props) {
  const { columns, layers, expandedRowKeys, onExpand, activeRow } = props;
  const expandedRowRender = (record) => {
    return (
      <SyntaxHighlighter wrapLongLines={true} language='dockerfile' style={solarizedDark}>
        {record.CreatedBy}
      </SyntaxHighlighter>
    );
  };
  return (
    <Table
      title={(currentPageData) => {
        return <Title level={4}>IMAGE LAYERS</Title>;
      }}
      rowClassName={(record, index) => {
        if (record.CreatedBy === activeRow) {
          return 'active';
        }
        return '';
      }}
      columns={columns}
      className='layer-table'
      dataSource={layers}
      showHeader={false}
      expandedRowKeys={expandedRowKeys}
      size='middle'
      pagination={false}
      expandable={{
        expandedRowRender,
        expandRowByClick: true,
      }}
      onExpand={onExpand}
    />
  );
}

export default function ImageDetail() {
  const [source, setSource] = useState<any>([]);
  const [layers, setLayers] = useState<any>([]);
  const [expandRowKeys, setExpandRowKeys] = useState<any>([]);
  const [activeRow, setActiveRow] = useState<string>();
  const [command, setCommand] = useState<string | boolean>();
  const query = useQuery();
  const name = query.get('name');
  const fetchImage = async (image_name) => {
    const detail: any = await send('get-image-detail', { image_name });
    const layers: any = detail.map((d, index) => {
      const CreatedBy = d.CreatedBy.split('#(nop) ').pop().trim();
      d.CreatedBy = CreatedBy.replace('/bin/sh -c', 'RUN').replace(
        '/bin/bash -o pipefail -c',
        'RUN'
      );
      const filterKey = d.CreatedBy.split(' ')[0];
      return {
        key: `layer-${index}`,
        filterKey: filterKey,
        ...d,
      };
    });
    setLayers(layers);
    setSource(layers);
  };

  useEffect(() => {
    fetchImage(name);
  }, []);

  useEffect(() => {
    if (command) {
      const newSource = filter(layers, (l) => l.filterKey === command);
      setSource(newSource);
    } else {
      setSource(layers);
    }
  }, [command]);

  const onMouseLeave = useCallback(() => {
    setActiveRow('');
  }, []);

  const onMouseOver = useCallback((row) => {
    setActiveRow(row);
  }, []);

  const onClick = useCallback(({ cmd, key }) => {
    if (cmd) {
      setCommand(cmd);
    } else if (key) {
      setExpandRowKeys([key]);
    } else {
      setCommand(false);
      setExpandRowKeys([]);
    }
  }, []);

  const onExpand = useCallback((expanded, record) => {
    setExpandRowKeys([]);
    if (expanded) {
      setExpandRowKeys([record.key]);
    }
  }, []);

  const columns = [
    {
      title: 'NO',
      key: 'id',
      width: '10%',
      render: (value, record, index) => index + 1,
    },
    {
      title: 'LAYER',
      key: 'CreatedBy',
      ellipsis: true,
      width: '70%',
      align: 'left',
      dataIndex: 'CreatedBy',
    },
    {
      title: 'SIZE',
      key: 'Size',
      width: '20%',
      dataIndex: 'Size',
      render: (val) => filesize(val, { round: 3 }),
    },
  ];

  return (
    <Content style={{ margin: '0 16px' }}>
      <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Crane</Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to='/images'>List image</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Image: {name}</Breadcrumb.Item>
      </Breadcrumb>
      <div
        className='site-layout-background'
        style={{ padding: 24, minHeight: 360 }}
      >
        <Row>
          <Col
            span={12}
            style={{
              maxHeight: 'calc(100vh - 200px)',
              minHeight: 'calc(100vh - 200px)',
            }}
          >
            <MemorizeLayerSunburst
              name={name}
              layers={layers}
              onClick={onClick}
              onMouseLeave={onMouseLeave}
              onMouseOver={onMouseOver}
            />
          </Col>
          <Col span={12} className='layers-col'>
            <LayerTable
              layers={source}
              onExpand={onExpand}
              expandedRowKeys={expandRowKeys}
              activeRow={activeRow}
              columns={columns}
            />
          </Col>
        </Row>
      </div>
    </Content>
  );
}
