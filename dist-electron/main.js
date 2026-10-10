import { app, BrowserWindow, desktopCapturer, dialog, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { platform } from "node:process";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
        },
    });
    mainWindow.loadURL("http://localhost:5173");
};
ipcMain.handle("get-platform", () => {
    return platform;
});
ipcMain.handle("get-screen-sources", async () => {
    const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: {
            width: 150,
            height: 150,
        },
    });
    return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
    }));
});
ipcMain.handle("get-desktop-source-id", async () => {
    const sources = await desktopCapturer.getSources({
        types: ["screen"],
    });
    const primaryScreenSource = sources.find((source) => source.name === "Entire screen");
    if (!primaryScreenSource) {
        throw new Error("No screen source was found");
    }
    return primaryScreenSource.id;
});
ipcMain.handle("save-screenshot", async (_event, dataUrl) => {
    if (typeof dataUrl !== "string") {
        throw new Error("Invalid screenshot data");
    }
    const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match) {
        throw new Error("The screenshot must be valid PNG data url");
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Save screenshot",
        buttonLabel: "Save Screenshot",
        defaultPath: path.join(app.getPath("pictures"), `screenshot-${timestamp}.png`),
        filters: [{ name: "PNG Image", extensions: ["png"] }],
    });
    if (canceled || !filePath) {
        return { canceled: true };
    }
    const imageBuffer = Buffer.from(match[1], "base64");
    await writeFile(filePath, imageBuffer);
    return {
        canceled: false,
        filePath,
    };
});
ipcMain.handle("hide-window", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) {
        throw new Error("Application window unavailable");
    }
    window.hide();
});
ipcMain.handle("show-window", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    console.log("show-window IPC received");
    if (!window || window.isDestroyed()) {
        return;
    }
    window.show();
    console.log("Window restored");
});
app.whenReady().then(() => {
    createWindow();
});
