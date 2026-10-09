"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    appName: "Screenshot App",
    getPlatform: () => electron_1.ipcRenderer.invoke("get-platform"),
    getScreenSources: () => electron_1.ipcRenderer.invoke("get-screen-sources"),
    getDesktopSourceId: () => electron_1.ipcRenderer.invoke("get-desktop-source-id"),
});
