import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import { Layout } from 'antd';
import {
  OrderedListOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
const { Sider } = Layout;
export default function Sidebar(prop) {
  const [collapsed, setCollapsed] = useState(prop.collapsed);
  const { onCollapse, width } = prop;
  const handleCollapse = (collapsed) => {
    setCollapsed(collapsed);
    if (onCollapse) {
      onCollapse(collapsed);
    }
  };
  const location = useLocation();
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={handleCollapse}
      width={width}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'sticky',
        left: 0,
        top: 0,
      }}
    >
      <div className='logo' />
      <Menu
        theme='dark'
        defaultSelectedKeys={[location.pathname.replaceAll('/', '')]}
        selectedKeys={[location.pathname.replaceAll('/', '')]}
        mode='inline'
        style={{ position: 'relative' }}
      >
        <Menu.Item key='' icon={<PlusOutlined />}>
          <Link to='/' style={{ color: 'white' }}>
            Build
          </Link>
        </Menu.Item>
        <Menu.Item key={(() => {
          const path = location.pathname.replaceAll('/', '');
          if (path === 'createPrimeHubImage') {
            return 'createPrimeHubImage';
          }
          return 'images'
        })()} icon={<OrderedListOutlined />}>
          <Link to='/images' style={{ color: 'white' }}>
            Images
          </Link>
        </Menu.Item>
        <Menu.Item
          style={{ position: 'relative', top: 'max(0px, 100vh - 252px)' }}
          key='settings'
          icon={<SettingOutlined />}
        >
          <Link to='/settings' style={{ color: 'white' }}>
            Settings
          </Link>
        </Menu.Item>
      </Menu>
    </Sider>
  );
}
