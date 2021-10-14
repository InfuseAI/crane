import React, { Suspense } from 'react';
import {
  HashRouter as Router,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom';
import './App.less';
import { Layout, Skeleton } from 'antd';
import Sidebar from './Sidebar';
import BuildImage from './BuildImage';
import ListImage from './ListImage';
import Settings from './Settings';
import CreatePrimeHubImage from './CreatePrimeHubImage';
const { Footer } = Layout;

const Crane = () => {
  const siderWidth = {
    collapsed: 80,
    unCollapsed: 190,
  };

  return (
    <Layout
      style={{
        minHeight: '100vh',
      }}
    >
      <Router>
        <Sidebar collapsed={true} width={siderWidth.unCollapsed} />
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
              <Route
                path='/createPrimeHubImage'
                component={CreatePrimeHubImage}
              />
              <Redirect to='/' />
            </Switch>
          </Suspense>
          <Footer style={{ textAlign: 'center' }}>
            <div>
              Crane, an{' '}
              <a href='https://infuseai.io' target='_blank' rel='noreferrer'>
                InfuseAI
              </a>{' '}
              product.
            </div>
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
