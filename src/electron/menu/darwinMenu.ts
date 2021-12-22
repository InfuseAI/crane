export default function DarwinMenu (app, mainWindow) {
  const menu = [
    {
      label: 'Crane',
      submenu: [
        {
          label: 'About Crane',
          role: 'about',
        },
        {
          type: 'separator',
        },
        {
          label: 'Hide App',
          accelerator: 'Command+H',
          role: 'hide',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers',
        },
        {
          label: 'Show All',
          role: 'unhide',
        },
        {
          type: 'separator',
        },
        {
          label: 'Perferences...',
          accelerator: 'Command+,',
          click: (item, focusedWindow) => {
            focusedWindow.loadURL(`http://localhost:16888/#/settings/dockerhub`);
          }
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          },
        },
        {
          label: 'Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
          },
        },
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          role: 'minimize',
        },
        {
          type: 'separator',
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: (item, focusedWindow) => {
            focusedWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About App',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
            }
          },
        },
      ],
    },
  ];
  return menu;
}
