import React, { useState, useEffect, Suspense } from 'react';
import {
  HashRouter as Router,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom';
import './App.less';
import { Alert, Button, Space, Layout, Skeleton, Modal, Divider } from 'antd';
import Sidebar from './Sidebar';
import BuildImage from './BuildImage';
import ListImage from './ListImage';
import ImageDetail from './ImageDetail';
import Settings from './Settings';
import { send } from './utils/ipcClient';
import CreatePrimeHubImage from './CreatePrimeHubImage';
import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';
import compareVersions from 'compare-versions';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import useLocalStorage from './hooks/useLocalStorage';

Sentry.init({
  dsn: 'https://6ad1a0b7db2247719c690f7d373b4bfc@o1081482.ingest.sentry.io/6088888',
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});

const { Footer } = Layout;

const OK = 'ok';

const Crane = () => {
  const [missingDocker, setMissingDocker] = useState(false);
  const [isNewVersionReleased, setIsNewVersionReleased] = useState(false);
  const [releasedData, setReleasedData] = useState({
    name: '',
    version: '',
    url: '',
    changelog: '',
  });
  const [skipVersion, setSkipVersion] = useLocalStorage('skip_version', '');
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
      const crane = await send('get-crane-version');
      if (
        crane.latest &&
        compareVersions(crane.latest.version, crane.version) > 0 &&
        crane.latest.version !== skipVersion
      ) {
        // Show New version released
        setIsNewVersionReleased(true);
        setReleasedData(crane.latest);
        console.log(crane.latest);
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
              description='Cannot detect system docker, please check your docker environment.'
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
          <Modal
            title={`New Version Released: ${releasedData.name}`}
            width={'50%'}
            mask={true}
            className='modal-version-update'
            visible={isNewVersionReleased}
            onOk={() => {
              setIsNewVersionReleased(false);
              console.log('OK');
            }}
            onCancel={() => {
              setIsNewVersionReleased(false);
              console.log('Cancel');
            }}
            footer={[
              <Button
                key='download'
                type='primary'
                href={releasedData.url}
                target='_blank'
                onClick={() => {
                  setIsNewVersionReleased(false);
                  console.log('Download');
                }}
              >
                Download on GitHub
              </Button>,
              <Button
                key='skip'
                onClick={() => {
                  setIsNewVersionReleased(false);
                  setSkipVersion(releasedData.version);
                  console.log('Skip');
                }}
              >
                Skip this Version
              </Button>,
            ]}
          >
            <div className='release-note'>
              <ReactMarkdown
                children={releasedData.changelog}
                rehypePlugins={[rehypeRaw]}
                components={{
                  img: ({ children, ...props }) => {
                    console.log(props);
                    return <img src={props.src} alt={props.alt} width='100%' />;
                  },
                }}
              />
              <div className='read-more'>
              </div>
            </div>
            <Divider>
              <a href={releasedData.url} target='_blank' rel='noreferrer'>
                Read More
              </a>
            </Divider>
          </Modal>
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
              <Route path='/image/:id' component={ImageDetail} />
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
