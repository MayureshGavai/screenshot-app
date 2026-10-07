import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
    appName: "Screenshot App",
});
