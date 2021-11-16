import React, { useState, useEffect, Suspense } from 'react';
import {
  HashRouter as Router,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom';
import './App.less';
import { Alert, Button, Space, Layout, Skeleton } from 'antd';
import Sidebar from './Sidebar';
import BuildImage from './BuildImage';
import ListImage from './ListImage';
import Settings from './Settings';
import { send } from './utils/ipcClient';
import CreatePrimeHubImage from './CreatePrimeHubImage';
const { Footer } = Layout;

const OK = 'ok';

const Crane = () => {
  const [missingDocker, setMissingDocker] = useState(false);
  const siderWidth = {
    collapsed: 80,
    unCollapsed: 160,
  };

  useEffect(() => {
    (async () => {
      // @ts-ignore
      const pong = await send('ping_docker');
      console.log('Ping docker:', pong);
      if (pong !== OK) {
        setMissingDocker(true);
      }
    })();
  }, []);

  return (
    <Layout
      style={{
        minHeight: '100vh',
      }}
    >
      <Router>
        <Sidebar collapsed={true} width={siderWidth.unCollapsed} />
        <Layout className='site-layout'>
          {missingDocker ? (
            <Alert
              message='Error: Missing Docker runtime.'
              description='Can not detect system docker, please check your docker enviroment.'
              type='error'
              showIcon
              action={
                <Space>
                  <Button
                    size='small'
                    type='primary'
                    href='https://docs.docker.com/get-docker/'
                    target='_blank'
                  >
                    Get Docker
                  </Button>
                </Space>
              }
            />
          ) : (
            <></>
          )}
          <Suspense
            fallback={
              <div className='site-layout-background'>
                <Skeleton active />
              </div>
            }
          >
            <Switch>
              <Route exact path='/' component={BuildImage} />
              <Route path='/settings/:tabName' component={Settings} />
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
