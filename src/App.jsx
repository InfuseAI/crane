import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import './App.css';
import { Layout, Menu, Breadcrumb } from 'antd';
import {
  OrderedListOutlined,
  PlusOutlined,
  SettingOutlined
} from '@ant-design/icons';
const BuildImage = lazy(() => import('./BuildImage'));
const { Content, Footer, Sider } = Layout;

class Crane extends React.Component {
  state = {
    collapsed: false,
  };

  onCollapse = collapsed => {
    console.log(collapsed);
    this.setState({ collapsed });
  };

  render() {
    const { collapsed } = this.state;
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Router>
          <Sider collapsible collapsed={collapsed} onCollapse={this.onCollapse}>
            <div className="logo" />
            <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" style={{position: 'relative', height: 'calc(100% - 32px)'}}>
              <Menu.Item key="1" icon={<PlusOutlined />}>
                <Link to='/'>Build a new Image</Link>
              </Menu.Item>
              <Menu.Item key="2" icon={<OrderedListOutlined />}>
                <Link to='/images'>Images</Link>
              </Menu.Item>
              <Menu.Item style={{position: 'relative', top: "calc(100% - 172px)"}} key="3" icon={<SettingOutlined />}>
                Settings
              </Menu.Item>
            </Menu>
          </Sider>
          <Layout className="site-layout">
            <Suspense fallback={<div>Loading...</div>}>
              <Switch>
                <Route exact path='/' component={BuildImage}>
                </Route>
                <Route path='/images'>
                  <Content style={{ margin: '0 16px' }}>
                    <Breadcrumb style={{ margin: '16px 0' }}>
                      <Breadcrumb.Item>Crane</Breadcrumb.Item>
                      <Breadcrumb.Item>Images</Breadcrumb.Item>
                    </Breadcrumb>
                    <div className="site-layout-background" style={{ padding: 24, minHeight: 360 }}>
                      Image List
                    </div>
                  </Content>
                </Route>
              </Switch>
            </Suspense>
            <Footer style={{ textAlign: 'center' }}>Crane ©2021 Created by InfuseAI</Footer>
          </Layout>
        </Router>
      </Layout>
    );
  }
}

const App = () => (
  <div id="crane" className="App">
    <Crane />
  </div>
);

export default App;
