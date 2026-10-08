import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
    appName: "Screenshot App",
    platform: "win-32",
});
