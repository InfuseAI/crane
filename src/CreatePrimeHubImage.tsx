import React, { useEffect, useState } from 'react';
import { send } from './utils/ipcClient';
import {
  Layout,
  Breadcrumb,
  Form,
  Input,
  Select,
  notification,
  Button,
} from 'antd';
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  gql,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { get } from 'lodash';
;
const { Content } = Layout;
const { Option } = Select;

export default function CreatePrimeHubImage() {
  const [form] = Form.useForm();
  const [groupList, setGroupList] = useState([]); 
  const [client, setClient] = useState(null);
  useEffect(() => {
    const createClient = async () => {
      const credential = await send('get-primehub-credential');
      const uri = credential.account;
      const token = credential.password;
      const httpLink = createHttpLink({
        uri,
      });
      const authLink = setContext((_, { headers }) => {
        return {
          headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
          },
        };
      });
      const client = new ApolloClient({
        link: authLink.concat(httpLink),
        cache: new InMemoryCache(),
      });
      setClient(client);
    };
    createClient();
  }, []);
  useEffect(() => {
    if (!client) {
      return;
    }
    async function fetchGroup(){
      try {
        const result = await client.query({
          query: gql`
            query {
              me {
                id
                username
                groups {
                  id
                  name
                  admins
                }
              }
            }
          `,
        });
        const username = get(result, 'data.me.username', '');
        const groups = get(result, 'data.me.groups', []);
        const adminGroups = groups.filter((group) => { return group.admins.split(',').includes(username) });
        console.log(adminGroups);
        setGroupList(adminGroups);
      } catch (error) {
        console.log(error);
        notification.error({
          message: 'PrimeHub Connection Failed',
          description: `Unable to fetch PrimeHub user group info.`,
        });
      }
    };
    fetchGroup();
  }, [client]);
  const onFinish = async (values) => {
    try {
      const payload = {
        ...values,
        groups: {
          connect: [ { id: groupList.filter((group)=>{return group.name === values.groupName})[0].id } ],
        },
        url: 'testurl',
      };
      console.log(payload);
      const result = await client.mutate({
        mutation: gql`
          mutation createImage($data: ImageCreateInput!) {
            createImage(data: $data) {
              id
              name
            }
          }
        `,
        variables: { data: payload },
      });
      notification.success({
        message: 'PrimeHub Image Created',
        description: ``,
      });
    } catch (error) {
      console.log(error);
      notification.error({
        message: 'Create PrimeHub Image Failed',
        description: ``,
      });
    }
    
  };
  return (
    <Content style={{ margin: '0 16px' }}>
      <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Crane</Breadcrumb.Item>
        <Breadcrumb.Item>Create PrimeHub Image</Breadcrumb.Item>
      </Breadcrumb>
      <div
        className='site-layout-background'
        style={{ padding: 24, minHeight: 360 }}
      >
        <Form
          layout='vertical'
          form={form}
          name='create_primehub_image'
          onFinish={onFinish}
        >
          <Form.Item label='Group' name='groupName' rules={[{ required: true }]}>
            <Select style={{ width: 120 }}>
              {groupList.map((group)=>{
                return <Option key={group.id} value={group.name}>{group.name}</Option>
              })}
            </Select>
          </Form.Item>
          <Form.Item
            label='Image Name'
            name='name'
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label='Display Name'
            name='displayName'
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label='Description' name='description'>
            <Input />
          </Form.Item>
          <Form.Item label='Type' name='type' rules={[{ required: true }]}>
            <Select style={{ width: 120 }}>            
              <Option value='cpu'>CPU</Option>
              <Option value='gpu'>GPU</Option>
              <Option value='both'>Universal</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }}>
            <Button type='primary' htmlType='submit'>
              Create
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Content>
  );
}
