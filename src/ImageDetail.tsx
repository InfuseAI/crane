import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, Spin, Breadcrumb, Col, Row, Table, Typography, Card } from 'antd';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import filesize from 'filesize';
import { send } from './utils/ipcClient';
import { Sunburst } from '@ant-design/charts';
import { useLocation, Link } from 'react-router-dom';
import { groupBy, map, get, filter, pick, throttle } from 'lodash';

const { Title, Text } = Typography;
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
          label: child.CreatedBy.slice(0, 100) + '...',
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
  const { layers, name, onClick, onMouseEnter, onMouseLeave, chartRef } = props;
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
    state: {
      active: {
        style: {
          fill: '#DC477D',
          stroke: '#EFEFEF',
          lineWidth: 1,
          cursor: 'pointer',
        },
      },
      selected: {
        style: {
          fill: '#DC477D',
          stroke: '#EFEFEF',
          lineWidth: 5,
        },
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
      {
        type: 'tooltip',
        enable: true
      },

    ],
    hierarchyConfig: {
      field: 'Size',
    },
    tooltip: {
      domStyles: {
        'g2-tooltip': {
          margin: 0,
          padding: 0,
          opacity: 1,
        }
      },
      customContent: (item, data) => {
        const {name, value} = get(data, '0', {})
        if (value) {
          return (
            <Card
              style={{width: 300, margin: 0, backgroundColor: '#fafafa'}}
              actions={[
                <></>,
                <span style={{fontWeight: 300, fontSize: '24px'}}>{value}</span>
              ]}
            >
              <SyntaxHighlighter
                wrapLines={true}
                wrapLongLines={true}
                customStyle={{overflow: 'hidden'}}
                language='dockerfile'
                style={atomOneLight}
              >
                {name}
              </SyntaxHighlighter>
            </Card>
          );
        }
      }
    },
    drilldown: {
      enabled: true,
      breadCrumb: {
        position: 'bottom-left',
        dividerText: '>',
      },
    },
    color: [
      '#007991',
      '#0093a0',
      '#0daca8',
      '#45c6ab',
      '#76dea8',
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
      plot.off('plot:mouseenter').on('element:mouseenter', (evt) => {
        try {
          const { data } = get(evt, 'data.data', {});
          if (data.Created) {
            onMouseEnter(data.CreatedBy);
          } else {
            onMouseEnter();
          }
        } catch(e) {
          console.log('Unexpected error: ', e);
        }
      });
    },
  };

  // @ts-ignore
  return <Sunburst style={{ height: '100%', width: '100%' }} {...config} ref={chartRef} />;
};

const MemorizeLayerSunburst = React.memo(LayerSunburst);

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function LayerTable(props) {
  const { columns, layers, loading, expandedRowKeys, onExpand, activeRow, chartRef } = props;
  const expandedRowRender = (record) => {
    return (
      <SyntaxHighlighter
        wrapLines={true}
        wrapLongLines={true}
        language='dockerfile'
        style={atomOneLight}
      >
        {record.CreatedBy}
      </SyntaxHighlighter>
    );
  };
  return (
    <Table
      title={(currentPageData) => {
        return <Title level={3}>IMAGE LAYERS</Title>;
      }}
      rowClassName={(record, index) => {
        if (record.CreatedBy === activeRow) {
          return 'active';
        }
        return '';
      }}
      loading={loading}
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
      onRow={
        (record, rowIndex) => {
          const { CreatedBy } = record;
          const chart = chartRef.current.getChart();
          return {
            onMouseEnter: (event) => {
              chart?.setState('active', (item) => item.data.CreatedBy === CreatedBy, true)
            },
            onMouseLeave: (event) => {
              chart?.setState('active', () => true, false);
            }
          }
        }
      }
    />
  );
}

export default function ImageDetail() {
  const [source, setSource] = useState<any>([]);
  const [layers, setLayers] = useState<any>([]);
  const [loading, setLoading] = useState<any>(true);
  const [expandRowKeys, setExpandRowKeys] = useState<any>([]);
  const [activeRow, setActiveRow] = useState<string>();
  const [command, setCommand] = useState<string | boolean>();
  const chartRef = useRef();
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
    setLoading(false);
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

  const onMouseLeave = useCallback(throttle(() => {
    setActiveRow('');
  }, 16), []);

  const onMouseEnter = useCallback(throttle((row) => {
    setActiveRow('');
    setActiveRow(row);
  }, 16), []);

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
      className: 'line-number-col',
      width: '10%',
      align: 'right',
      render: (value, record, index) => index + 1,
    },
    {
      title: 'LAYER',
      className: 'layer-col',
      key: 'CreatedBy',
      ellipsis: true,
      width: '70%',
      align: 'left',
      dataIndex: 'CreatedBy',
      render: (value) => (
        <SyntaxHighlighter
          wrapLines={true}
          wrapLongLines={false}
          customStyle={{overflow: 'hidden'}}
          language='dockerfile'
          style={atomOneLight}
        >
          {value}
        </SyntaxHighlighter>
      ),
    },
    {
      title: 'SIZE',
      key: 'Size',
      width: '20%',
      className: 'size-col',
      dataIndex: 'Size',
      render: (val) => val > 0 ? filesize(val, { round: 1 }) : (<Text type='secondary'>{ val } B</Text>),
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
      <Spin spinning={loading} size='large'>
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
                onMouseEnter={onMouseEnter}
                chartRef={chartRef}
              />
            </Col>
            <Col span={12} className='layers-col'>
              <LayerTable
                loading={loading}
                layers={source}
                onExpand={onExpand}
                expandedRowKeys={expandRowKeys}
                activeRow={activeRow}
                chartRef={chartRef}
                columns={columns}
              />
            </Col>
          </Row>
        </div>
      </Spin>
    </Content>
  );
}
