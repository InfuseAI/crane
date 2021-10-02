import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as ipcClient from './utils/ipcClient';

ipcClient.init();

ReactDOM.render(
  <App />,
  document.getElementById('root')
);

