import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import './App.css';
import { Layout, Menu, Skeleton, Breadcrumb } from 'antd';
import {
  OrderedListOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const BuildImage = lazy(() => import('./BuildImage'));
const Settings = lazy(() => import('./Settings'));
const { Content, Sider } = Layout;

const Crane = () => {
  const [collapsed, setCollapsed] = useState(true);
  const onCollapse = (collapsed) => {
    setCollapsed(collapsed);
  };
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Router>
        <Sider collapsible collapsed={collapsed} onCollapse={onCollapse}>
          <div className='logo' />
          <Menu
            theme='dark'
            defaultSelectedKeys={['1']}
            mode='inline'
            style={{ position: 'relative', height: 'calc(100% - 32px)' }}
          >
            <Menu.Item key='1' icon={<PlusOutlined />}>
              <Link to='/' style={{ color: 'white' }}>
                Build a new Image
              </Link>
            </Menu.Item>
            <Menu.Item key='2' icon={<OrderedListOutlined />}>
              <Link to='/images' style={{ color: 'white' }}>
                Images
              </Link>
            </Menu.Item>
            <Menu.Item
              style={{ position: 'relative', top: 'calc(100% - 172px)' }}
              key='3'
              icon={<SettingOutlined />}
            >
              <Link to='/settings' style={{ color: 'white' }}>
                Settings
              </Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className='site-layout'>
          <Suspense fallback={<Skeleton active />}>
            <Switch>
              <Route exact path='/' component={BuildImage} />
              <Route path='/settings' component={Settings} />
              <Route path='/images'>
                <Content style={{ margin: '0 16px' }}>
                  <Breadcrumb style={{ margin: '16px 0' }}>
                    <Breadcrumb.Item>Crane</Breadcrumb.Item>
                    <Breadcrumb.Item>Images</Breadcrumb.Item>
                  </Breadcrumb>
                  <div
                    className='site-layout-background'
                    style={{ padding: 24, minHeight: 360 }}
                  >
                    Image List
                  </div>
                </Content>
              </Route>
            </Switch>
          </Suspense>
        </Layout>
      </Router>
    </Layout>
  );
};

const App = () => (
  <div id='crane' className='App'>
    <Crane />
  </div>
);

export default App;
