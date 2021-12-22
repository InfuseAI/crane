import { Menu } from 'electron';
import DarwinMenu from '../menu/darwinMenu';

const menu = null;
const platform = process.platform;

function MenuFactoryService(menu) {
  this.menu = menu;
  this.buildMenu = buildMenu;
}

function buildMenu(app, mainWindow) {
  if (platform === 'darwin') {
    // @ts-ignore
    this.menu = Menu.buildFromTemplate(DarwinMenu(app, mainWindow));
    Menu.setApplicationMenu(this.menu);
  }
}

export default new MenuFactoryService(menu)
