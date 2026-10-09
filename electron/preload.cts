import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  appName: "Screenshot App",
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  getScreenSources: () => ipcRenderer.invoke("get-screen-sources"),
  getDesktopSourceId: () => ipcRenderer.invoke("get-desktop-source-id"),
  saveScreenshot: (dataUrl: string) =>
    ipcRenderer.invoke("save-screenshot", dataUrl),
  hideWindow: () => ipcRenderer.invoke("hide-window"),
  showWindow: () => ipcRenderer.invoke("show-window"),
});
