import React, { Suspense, lazy, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Link,
  useLocation,
} from 'react-router-dom';
import './App.less';
import { Layout, Menu, Skeleton } from 'antd';
import {
  OrderedListOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const BuildImage = lazy(() => import('./BuildImage'));
const ListImage = lazy(() => import('./ListImage'));
const Settings = lazy(() => import('./Settings'));
const { Sider, Footer } = Layout;

const CraneMenu = () => {
  const location = useLocation();
  return (
    <Menu
      theme='dark'
      defaultSelectedKeys={[location.pathname]}
      mode='inline'
      style={{ position: 'relative' }}
    >
      <Menu.Item key='/' icon={<PlusOutlined />}>
        <Link to='/' style={{ color: 'white' }}>
          Build a new Image
        </Link>
      </Menu.Item>
      <Menu.Item key='/images/' icon={<OrderedListOutlined />}>
        <Link to='/images' style={{ color: 'white' }}>
          Images
        </Link>
      </Menu.Item>
      <Menu.Item
        style={{ position: 'relative', top: 'max(0px, 100vh - 252px)' }}
        key='/settings/'
        icon={<SettingOutlined />}
      >
        <Link to='/settings' style={{ color: 'white' }}>
          Settings
        </Link>
      </Menu.Item>
    </Menu>
  );
};

const Crane = () => {
  const [collapsed, setCollapsed] = useState(true);
  const siderWidth = {
    collapsed: 80,
    unCollapsed: 190,
  };
  const [marginLeft, updateMarginLeft] = useState(siderWidth.collapsed);

  const onCollapse = (collapsed) => {
    setCollapsed(collapsed);
    // Make the collapse animation smoother
    setTimeout(
      () => {
        updateMarginLeft(
          collapsed ? siderWidth.collapsed : siderWidth.unCollapsed
        );
      },
      collapsed ? 100 : 0
    );
  };
  return (
    <Layout
      style={{
        minHeight: '100vh',
        marginLeft: marginLeft,
      }}
    >
      <Router>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={onCollapse}
          width={siderWidth.unCollapsed}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
          }}
        >
          <div className='logo' />
          <CraneMenu />
        </Sider>
        <Layout className='site-layout'>
          <Suspense
            fallback={
              <div className='site-layout-background'>
                <Skeleton active />
              </div>
            }
          >
            <Switch>
              <Route exact path='/' component={BuildImage} />
              <Route path='/settings' component={Settings} />
              <Route path='/images' component={ListImage} />
            </Switch>
          </Suspense>
          <Footer style={{ textAlign: 'center' }}>
            <div>Crane, an <a href='https://infuseai.io' target='_blank'>InfuseAI</a> product.</div>
            <div>Made with Love. ❤️ </div>
          </Footer>
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
