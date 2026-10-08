import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  appName: "Screenshot App",
  getPlatform: () => ipcRenderer.invoke("get-platform"),
});
