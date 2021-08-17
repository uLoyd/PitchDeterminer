const electron = require('electron');
const path = require('path');
const url = require('url');

const app = electron.app;
const browserWindow = electron.BrowserWindow;

let win;

const createWindow = async () => {
  win = new browserWindow({
      webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInWorker: true
      }
  });

  await win.loadURL(path.join(__dirname, `./view/index.html`));

  win.webContents.openDevTools();

  win.on('closed', () => {
    win = null;
  })
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if(process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
  if(win === null) await createWindow();
});
