import { app, BrowserWindow, desktopCapturer, dialog, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { platform } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ID = "com.screenshotapp.desktop";
const DEV_SERVER_URL = "http://localhost:5173";
const MAX_PNG_BYTES = 100 * 1024 * 1024;

let mainWindow: BrowserWindow | null = null;

const getRendererPath = () => path.join(app.getAppPath(), "dist", "index.html");

const isTrustedRendererUrl = (rawUrl: string): boolean => {
  try {
    const url = new URL(rawUrl);
    if (!app.isPackaged) {
      return url.origin === new URL(DEV_SERVER_URL).origin;
    }

    const expectedUrl = new URL(pathToFileURL(getRendererPath()).href);
    return url.protocol === "file:" && url.pathname === expectedUrl.pathname;
  } catch {
    return false;
  }
};

const assertTrustedIpcSender = (event: Electron.IpcMainInvokeEvent): void => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== event.sender.mainFrame ||
    !isTrustedRendererUrl(event.senderFrame.url)
  ) {
    throw new Error("Untrusted IPC request rejected");
  }
};

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    width: 1200,
    height: 900,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  mainWindow = window;

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  window.webContents.setWindowOpenHandler(() => ({
    action: "deny",
  }));

  window.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isTrustedRendererUrl(navigationUrl)) {
      event.preventDefault();
    }
  });

  try {
    if (app.isPackaged) {
      await window.loadFile(getRendererPath());
    } else {
      await window.loadURL(DEV_SERVER_URL);
    }
  } catch (error) {
    console.error("Failed to load the application window:", error);
  }
};

ipcMain.handle("get-platform", (event) => {
  assertTrustedIpcSender(event);
  return platform;
});

ipcMain.handle("get-screen-sources", async (event) => {
  assertTrustedIpcSender(event);
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

ipcMain.handle("get-desktop-source-id", async (event) => {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
  });

  const primaryScreenSource = sources.find(
    (source) => /^entire screen$/i.test(source.name.trim()) ?? sources[0],
  );

  if (!primaryScreenSource) {
    throw new Error("No screen source was found");
  }

  return primaryScreenSource.id;
});

ipcMain.handle("save-screenshot", async (event, dataUrl: unknown) => {
  assertTrustedIpcSender(event);

  if (typeof dataUrl !== "string") {
    throw new Error("Invalid screenshot data");
  }

  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);

  if (!match) {
    throw new Error("The screenshot must be a valid PNG data URL");
  }

  const base64Data = match[1];

  if (!base64Data || base64Data.length > Math.ceil((MAX_PNG_BYTES * 4) / 3)) {
    throw new Error("Screenshot data is empty or exceeds the size limit");
  }

  const imageBuffer = Buffer.from(base64Data, "base64");

  if (
    imageBuffer.length === 0 ||
    imageBuffer.length > MAX_PNG_BYTES ||
    imageBuffer.toString("base64").replace(/=+$/, "") !==
      base64Data.replace(/=+$/, "")
  ) {
    throw new Error("Invalid or oversized PNG data");
  }

  // PNG files begin with these eight signature bytes.
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (
    imageBuffer.length < pngSignature.length ||
    !imageBuffer.subarray(0, 8).equals(pngSignature)
  ) {
    throw new Error("The supplied data is not a valid PNG file");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save screenshot",
    buttonLabel: "Save Screenshot",
    defaultPath: path.join(
      app.getPath("pictures"),
      `screenshot-${timestamp}.png`,
    ),
    filters: [{ name: "PNG Image", extensions: ["png"] }],
  });

  if (canceled || !filePath) {
    return { canceled: true as const };
  }

  try {
    await writeFile(filePath, imageBuffer);

    return {
      canceled: false,
      filePath,
    };
  } catch (error) {
    console.error("Failed to save screenshot", error);
    throw new Error(
      "Could not save the screenshot. Check the file location and permissions.",
    );
  }
});

ipcMain.handle("hide-window", (event) => {
  assertTrustedIpcSender(event);

  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window || window.isDestroyed()) {
    throw new Error("Application window unavailable");
  }

  window.hide();
});

ipcMain.handle("show-window", (event) => {
  assertTrustedIpcSender(event);

  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window || window.isDestroyed()) {
    return;
  }

  window.show();
});

app.whenReady().then(async () => {
  app.setAppUserModelId(APP_ID);
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
