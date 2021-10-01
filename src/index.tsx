import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as ipcClient from './utils/ipcClient';

ipcClient.init();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

