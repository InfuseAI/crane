import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Layout,
  Breadcrumb,
  Form,
  Tag,
  Input,
  Button,
  Row,
  Col,
  AutoComplete,
  Drawer,
  notification,
  Typography,
} from 'antd';
import useLocalStorage from './hooks/useLocalStorage';
import { SiPython } from 'react-icons/si';
import { send, listen, unlisten } from './utils/ipcClient';
import { LazyLog, ScrollFollow } from 'react-lazylog';
import { useHistory } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import ImageSuggestions from './data/ImageSuggestions.json';
import { debounce, uniqBy } from 'lodash';

const { Text } = Typography;

const PKG_PILOT_URL =
  'https://4pgoedjmk5.execute-api.ap-northeast-1.amazonaws.com/Prod/recommend/';
const { Content } = Layout;
const { TextArea } = Input;

const EMPTY_STRING = '\r\n';

const Status = {
  PREPARING: 'preparing',
  FINISHED: 'finished',
  BUILDING: 'building',
  PROGRESSING: 'progressing',
};

const LabelGroup = ({ value = {}, onChange }) => {
  const [labels, setLabels] = useState([]);

  const inputRef = useRef(null);
  const [inputVisible, setInputVisible] = useState(false);

  const onLabelsChange = (newLabels) => {
    setLabels(newLabels);
    onChange?.(newLabels);
    console.log(labels);
  };

  const onLabelClose = (closedLabel) => {
    onLabelsChange(labels.filter((label) => label !== closedLabel));
  };

  const onInputEnter = (e) => {
    const { value } = e.target;
    setInputVisible(false);
    if (value) {
      onLabelsChange([...labels, value]);
    }
  };

  const showInput = () => {
    setInputVisible(true);
  };

  useEffect(() => {
    if (inputVisible) {
      inputRef.current.focus();
    }
  }, [inputVisible]);

  return (
    <>
      {labels.map((label) => {
        return (
          <Tag
            className='edit-label'
            key={label}
            closable
            onClose={() => onLabelClose(label)}
          >
            {label}
          </Tag>
        );
      })}
      {inputVisible && (
        <Input
          ref={inputRef}
          type='text'
          size='small'
          className='label-input'
          onPressEnter={onInputEnter}
          onBlur={onInputEnter}
        />
      )}
      {!inputVisible && (
        <Tag className='add-label' onClick={showInput}>
          <PlusOutlined /> New Label
        </Tag>
      )}
    </>
  );
};

export default function BuildImage() {
  const history = useHistory();
  const [options, updateOptions] = useState<any[]>([]);
  const [aptOptions, setAptOptions] = useState<any[]>([]);
  const [pipOptions, setPipOptions] = useState<any[]>([]);
  const [condaOptions, setCondaOptions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [logDrawerVisible, setLogDrawerVisible] = useState(false);
  const [blockBuildButton, setBlockBuildButton] = useState(false);
  const [logText, setLogText] = useLocalStorage('build_log', '');
  const [form] = Form.useForm();
  const placeholder = `one package per line. e.g., \npackage1\npackage2\n`;
  const buildNotification = (name, isSuccess) => {
    if (isSuccess) {
      notification['success']({
        message: 'Build Success',
        description: `Image ${name || ''} is ready`,
      });
      history.push('/images/');
    } else {
      notification['error']({
        message: 'Build Failed',
        description: `Image ${name || ''} failed`,
      });
    }
  };

  const renderOfficialTitle = (title) => <span>{title}</span>;
  const renderOfficialItem = (imageName) => ({
    value: imageName,
    label: (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {imageName}
      </div>
    ),
  });

  const renderTitle = (title) => (
    <span>
      InfuseAI/{title}
      <a
        style={{ float: 'right' }}
        href='https://docs.primehub.io/docs/guide_manual/images-list'
        target='_blank'
        rel='noopener noreferrer'
      >
        details
      </a>
    </span>
  );

  const renderItem = (imageName, pythonVersion) => ({
    value: imageName,
    label: (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {imageName}
        <span>
          {<SiPython />} {pythonVersion}
        </span>
      </div>
    ),
  });

  const onFinish = async (values) => {
    setBlockBuildButton(true);
    setLogDrawerVisible(true);
    setLogText('');
    listen('build-log', (payload) => {
      buildLogReceiver(payload);
    });
    await send('build-image', values);
  };
  const onCloseLogDrawer = () => {
    setLogDrawerVisible(false);
  };
  const buildLogReceiver = useCallback(
    (payload) => {
      if (payload.stage === Status.FINISHED) {
        const name = payload.name;
        buildNotification(name, !payload.output.find((x) => x.error));
        setBlockBuildButton(false);
        unlisten('build-log');
      } else if (payload.stage === Status.PROGRESSING) {
        if (payload.output.stream) {
          setLogText((prevData) => prevData + payload.output.stream);
        } else if (payload.output.status) {
          // Handle the pulling image output
          if (payload.output.id) {
            const output = `${payload.output.id}: ${payload.output.status} ${
              payload.output.progress || ''
            }`;
            setLogText((prevData) => {
              if (prevData.search(payload.output.id) === -1) {
                prevData = prevData + output + '\n';
              } else {
                prevData = prevData.replace(
                  new RegExp(`${payload.output.id}:.*\n`),
                  output + '\n'
                );
              }
              return prevData;
            });
          } else {
            setLogText((prevData) => prevData + payload.output.status + '\n');
          }
        } else if (payload.output.progress) {
          // If has progress replace last line make progress bar like animation
          setLogText(
            (prevData) =>
              prevData.replace(/\n.*$/, '\n') + payload.output.progress
          );
        }
      }
    },
    [setLogText]
  );

  const initialValues = {
    base_image_url: 'jupyter/base-notebook:latest',
  };

  useEffect(() => {
    async function fetchCurrntBuild() {
      const buildStatus = await send('build-status');
      console.log('Build Status:', buildStatus);
      if (buildStatus === Status.BUILDING || buildStatus === Status.PREPARING) {
        setBlockBuildButton(true);
        setLogDrawerVisible(true);
        unlisten('build-log');
        listen('build-log', (payload) => {
          buildLogReceiver(payload);
        });
        console.log('Listening build log...');
      } else {
        unlisten('build-log');
        setLogText(EMPTY_STRING);
      }
    }
    async function fetchPrimeHubNotebooks() {
      const primehubNotebooks = await send('get-primehub-notebooks');
      if (primehubNotebooks) {
        const primehubNotebookOptions = primehubNotebooks.map((x) => {
          const row = {
            label: renderTitle(x.rows[0][0].replace(/ [0-9.]+$/, '')),
            options: x.rows.map((y) => {
              return renderItem(y[1], y[3]);
            }),
          };
          return row;
        });

        const officialOptions = ImageSuggestions.data.map((s) => {
          const row = {
            label: renderOfficialTitle(s.title),
            options: s.images.map((imageName) => {
              return renderOfficialItem(imageName);
            }),
          };
          return row;
        });

        updateOptions([...officialOptions, ...primehubNotebookOptions]);

        setResults([...primehubNotebookOptions, ...officialOptions]);
      } else {
        console.log('No primehub notebooks found');
      }
    }
    fetchPrimeHubNotebooks();
    fetchCurrntBuild();
  }, []);

  const onSearch = (data: string) => {
    const filteredOptions = options
      .map((row) => {
        return {
          label: row.label,
          options: row.options.filter((opt) => {
            return opt.value.indexOf(data) > -1;
          }),
        };
      })
      .filter((opt) => opt.options.length > 0);
    setResults(filteredOptions);
  };

  type PackageType = 'apt' | 'conda' | 'pip';
  type SearchHandler = (value: string) => void;

  const fetchPkgSuggestion = async (q: string, p: PackageType) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    const result = await fetch(PKG_PILOT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        q,
        p,
        n: 3,
      }),
    });
    return result;
  };

  const renderPkgOpt = (title: string, type: string, matched: string) => {
    let label: any = title;
    const index = title.indexOf(matched);
    if (index > -1) {
      const length = matched.length;
      const prefix = title.substring(0, index);
      const suffix = title.substring(index + length);
      const match = title.substring(index, index + length);
      label = (
        <span>
          {prefix}<Text mark>{match}</Text>{suffix}
        </span>
      );
    }
    return (
      <span>
        {label}
      </span>
    );
  };

  const searchHandlerBuilder: (type: PackageType, setOptions: React.Dispatch<React.SetStateAction<any[]>>) => SearchHandler = (type, setOptions) => {
    const result: SearchHandler = (value: string) => {
      const pkgs = value.split('\n');
      const lastValue = pkgs.pop() || '';
      if (lastValue.length < 1) {
        setOptions([]);
        return;
      }
      fetchPkgSuggestion(lastValue, type)
      .then((resp) => {
        return resp.json();
      })
      .then((result) => {
        const { matches, recommendations } = result;
        if (!matches) return;
        const matchItems = matches[type]
          ? matches[type]?.map((value) => {
              const vList = pkgs.slice(0, pkgs.length);
              vList.push(value);
              return {
                value: vList.join('\n'),
                key: `m_${value}`,
                label: renderPkgOpt(value, type, lastValue),
              };
            })
          : [];

        const recommendItems = recommendations[type]
          ? recommendations[type]?.map((value) => {
              const vList = pkgs.slice(0, pkgs.length);
              vList.push(value);
              return {
                value: vList.join('\n'),
                key: `r_${value}`,
                label: renderPkgOpt(value, type, lastValue),
              };
            })
          : [];

        const uniqItems = uniqBy(
          [...matchItems, ...recommendItems],
          (item) => item.value
        );
        const optionResult = uniqItems.length ? [
          ...uniqItems,
        ]: [];
        console.log(optionResult);
        setOptions([...optionResult]);
      });
    };
    return debounce(result, 300);
  }

  return (
    <Content style={{ margin: '0 16px' }}>
      <Breadcrumb style={{ margin: '16px 0' }}>
        <Breadcrumb.Item>Crane</Breadcrumb.Item>
        <Breadcrumb.Item>Build a new Image</Breadcrumb.Item>
      </Breadcrumb>
      <div
        className='site-layout-background'
        style={{ padding: 24, minHeight: 360 }}
      >
        <Form
          layout='vertical'
          form={form}
          name='build_image'
          initialValues={initialValues}
          onFinish={onFinish}
        >
          <Form.Item
            label='Image Name'
            name='image_name'
            rules={[
              {
                message:
                  'Image name needs to be unique in that namespace, can be two to 255 characters, and can only contain lowercase letters, numbers, hyphens (-), and underscores (_).',
                pattern:
                  /^(?:([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?::(\d+))?\/)?((?:[a-zA-Z0-9_-]*\/)*?)([a-zA-Z0-9_-]+)(?::([\w.-]+))?$/gm,
              },
              { required: true, message: 'Image Name is required' },
              {
                max: 255,
                message: 'Image Name cannot be longer than 255 characters',
              },
            ]}
          >
            <Input disabled={blockBuildButton} />
          </Form.Item>
          <Form.Item
            label='Base Image'
            name='base_image_url'
            rules={[{ required: true, message: 'Base Image is required' }]}
          >
            <AutoComplete
              dropdownClassName='certain-category-search-dropdown'
              dropdownMatchSelectWidth={500}
              style={{ width: '100%' }}
              options={results}
              onSearch={onSearch}
              disabled={blockBuildButton}
            >
              <Input.Search
                size='large'
                placeholder=''
                disabled={blockBuildButton}
              />
            </AutoComplete>
          </Form.Item>
          <Form.Item label='Description' name='image_description'>
            <Input disabled={blockBuildButton} />
          </Form.Item>
          <Form.Item label='Label' name='image_labels'>
            <LabelGroup />
          </Form.Item>
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item label='apt' name='apt'>
                <AutoComplete
                  options={aptOptions}
                  onSearch={searchHandlerBuilder('apt', setAptOptions)}
                  defaultOpen={!!aptOptions}
                  backfill={true}
                >
                  <TextArea
                    allowClear={true}
                    autoSize={{ minRows: 5, maxRows: 5 }}
                    placeholder={placeholder}
                    disabled={blockBuildButton}
                  />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='conda' name='conda'>
                <AutoComplete
                  options={condaOptions}
                  onSearch={searchHandlerBuilder('conda', setCondaOptions)}
                  defaultOpen={!!condaOptions}
                  backfill={true}
                >
                  <TextArea
                    allowClear={true}
                    autoSize={{ minRows: 5, maxRows: 5 }}
                    placeholder={placeholder}
                    disabled={blockBuildButton}
                  />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='pip' name='pip'>
                <AutoComplete
                  options={pipOptions}
                  onSearch={searchHandlerBuilder('pip', setPipOptions)}
                  defaultOpen={!!pipOptions}
                  backfill={true}
                >
                  <TextArea
                    allowClear={true}
                    autoSize={{ minRows: 5, maxRows: 5 }}
                    placeholder={placeholder}
                    disabled={blockBuildButton}
                  />
                </AutoComplete>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ textAlign: 'right' }}>
            <Button type='primary' htmlType='submit' loading={blockBuildButton}>
              Build
            </Button>
            <Button
              style={{ margin: '0 8px' }}
              onClick={() => setLogDrawerVisible(!logDrawerVisible)}
            >
              Console
            </Button>
          </Form.Item>
        </Form>
        <Drawer
          title='Build Log'
          placement='bottom'
          closable={true}
          height='60%'
          visible={logDrawerVisible}
          onClose={onCloseLogDrawer}
        >
          <ScrollFollow
            startFollowing={true}
            render={({ follow, onScroll }) => (
              <LazyLog
                text={logText}
                stream
                follow={follow}
                onScroll={onScroll}
              />
            )}
          />
        </Drawer>
      </div>
    </Content>
  );
}
