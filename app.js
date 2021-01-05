const electron      = require('electron');
const path          = require('path');
const url           = require('url');

const app           = electron.app;
const browserWindow = electron.BrowserWindow;

let win;

const createWindow = () => {
  win = new browserWindow({
      webPreferences: {
          nodeIntegration: true
      }
  });

  win.loadURL(url.format({
    pathname: path.join(__dirname, `./view/index.html`),
    protocol: 'file',
    slashes: true
  }));

  win.webContents.openDevTools();

  win.on('closed', () => {
    win = null;
  })
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if(process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if(win === null) createWindow();
});
