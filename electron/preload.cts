import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  appName: "Snapmark",
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  getScreenSources: () => ipcRenderer.invoke("get-screen-sources"),
  saveScreenshot: (dataUrl: string) =>
    ipcRenderer.invoke("save-screenshot", dataUrl),
  hideWindow: () => ipcRenderer.invoke("hide-window"),
  showWindow: () => ipcRenderer.invoke("show-window"),
  closeCaptureToolbar: () => ipcRenderer.invoke("close-capture-toolbar"),
  startNewCapture: () => ipcRenderer.invoke("start-new-capture"),
  getCaptureSnapshot: () => ipcRenderer.invoke("get-capture-snapshot"),
  openScreenshotEditor: (dataUrl: string) =>
    ipcRenderer.invoke("open-screenshot-editor", dataUrl),
  onScreenshotReady: (callback: (dataUrl: string) => void) => {
    const listner = (_event: Electron.IpcRendererEvent, dataUrl: string) => {
      callback(dataUrl);
    };

    ipcRenderer.on("screenshot-ready", listner);
    return () => {
      ipcRenderer.removeListener("screenshot-ready", listner);
    };
  },
});
