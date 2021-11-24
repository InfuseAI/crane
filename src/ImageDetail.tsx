import React, { useEffect } from 'react';
import {
  Layout,
  Breadcrumb,
  Col,
  Row,
  //Button,
  //Select,
  //Tabs,
  //Typography,
  //Table,
  //Tooltip,
  //Drawer,
  //notification,
} from 'antd';
import { useParams, Link } from 'react-router-dom'

const { Content } = Layout;

export default function ImageDetail() {
  const { id } = useParams<{id: string}>();
  useEffect(() => {}, []);

  return (
    <Content style={{ margin: '0 16px' }}>
      <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Crane</Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to='/images'>
            List image
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Image: {id}</Breadcrumb.Item>
      </Breadcrumb>
      <div
        className='site-layout-background'
        style={{ padding: 24, minHeight: 360 }}
      >
        <Row>
          <Col span={16}>Sunburst Chart</Col>
          <Col span={8}>Layer cmd</Col>
        </Row>
      </div>
    </Content>
  );
}
