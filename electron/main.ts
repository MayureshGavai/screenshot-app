import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { platform } from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 600,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:5173");
};

ipcMain.handle("get-platform", () => {
  return platform;
});

app.whenReady().then(() => {
  createWindow();
});
