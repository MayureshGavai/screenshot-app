import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
} from "electron";
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
let toolbarWindow: BrowserWindow | null = null;
let isCaptureStarting = false;
let captureSnapshot: string | null = null;

// Menu.setApplicationMenu(null);

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
  const senderWindow = BrowserWindow.fromWebContents(event.sender);

  const isManagedWindow =
    !!senderWindow &&
    !senderWindow.isDestroyed() &&
    (senderWindow === mainWindow || senderWindow === toolbarWindow);

  if (
    !isManagedWindow ||
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
    minWidth: 900,
    minHeight: 600,
    maxWidth: 1200,
    maxHeight: 900,

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

const createToolbarWindow = async (): Promise<void> => {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.show();
    toolbarWindow.focus();
    return;
  }

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;

  const window = new BrowserWindow({
    x,
    y,
    width,
    height,

    frame: false,
    transparent: true,
    backgroundColor: "#0000000",
    resizable: false,
    movable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    fullscreen: false,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  toolbarWindow = window;

  window.on("closed", () => {
    if (toolbarWindow === window) {
      toolbarWindow = null;
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
      await window.loadFile(getRendererPath(), {
        query: { window: "capture-toolbar" },
      });
    } else {
      await window.loadURL(`${DEV_SERVER_URL}/?window=capture-toolbar`);
    }

    if (!app.isPackaged) {
      toolbarWindow.webContents.openDevTools({
        mode: "detach",
      });
    }

    if (!window.isDestroyed()) {
      window.show();
      window.focus();
    }
  } catch (error) {
    console.error("Failed to load capture toolbar:", error);
    window.destroy();
    throw error;
  }
};

const startCaptureSession = async (): Promise<boolean> => {
  if (isCaptureStarting || (toolbarWindow && !toolbarWindow.isDestroyed())) {
    return false;
  }

  isCaptureStarting = true;

  try {
    captureSnapshot = await captureDesktopSnapshot();
    await createToolbarWindow();

    return true;
  } catch (error) {
    console.error("Could not start capture session:", error);

    captureSnapshot = null;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }

    return false;
  } finally {
    isCaptureStarting = false;
  }
};

const captureDesktopSnapshot = async (): Promise<string> => {
  const display = screen.getPrimaryDisplay();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }

  await new Promise<void>((resolve) => setTimeout(resolve, 150));

  const scaleFactor = display.scaleFactor;
  const { width, height } = display.bounds;

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: Math.round(width * scaleFactor),
      height: Math.round(height * scaleFactor),
    },
  });

  const source =
    sources.find((item) => item.display_id === String(display.id)) ??
    sources.find((item) => /^entire screen$/i.test(item.name.trim())) ??
    sources[0];

  if (!source || source.thumbnail.isEmpty()) {
    throw new Error("Could not capture the desktop");
  }

  return source.thumbnail.toDataURL();
};

const validatePngDataUrl = (dataUrl: unknown): Buffer => {
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

  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (
    imageBuffer.length < pngSignature.length ||
    !imageBuffer.subarray(0, 8).equals(pngSignature)
  ) {
    throw new Error("The supplied data is not a valid PNG file");
  }

  return imageBuffer;
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

ipcMain.handle("save-screenshot", async (event, dataUrl: unknown) => {
  assertTrustedIpcSender(event);

  const imageBuffer = validatePngDataUrl(dataUrl);

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

ipcMain.handle("get-capture-snapshot", (event) => {
  assertTrustedIpcSender(event);

  if (BrowserWindow.fromWebContents(event.sender) !== toolbarWindow) {
    throw new Error("Only the capture toolbar can request the snapshot");
  }

  if (!captureSnapshot) {
    throw new Error("No desktop snapshot is available");
  }

  return captureSnapshot;
});

ipcMain.handle("open-screenshot-editor", (event, dataUrl: unknown) => {
  assertTrustedIpcSender(event);

  const senderWindow = BrowserWindow.fromWebContents(event.sender);

  if (!senderWindow || senderWindow !== toolbarWindow) {
    throw new Error("Only the capture toolbar can submit a screenshot");
  }

  validatePngDataUrl(dataUrl);

  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error("Application window is unavailable");
  }

  const editorWindow = mainWindow;

  captureSnapshot = null;
  senderWindow.close();

  editorWindow.show();
  editorWindow.focus();

  editorWindow.webContents.send("screenshot-ready", dataUrl);

  return { success: true };
});

ipcMain.handle("close-capture-toolbar", (event) => {
  assertTrustedIpcSender(event);

  const senderWindow = BrowserWindow.fromWebContents(event.sender);

  if (
    !senderWindow ||
    senderWindow.isDestroyed() ||
    senderWindow !== toolbarWindow
  ) {
    throw new Error("Capture toolbar unavailable");
  }
  captureSnapshot = null;
  senderWindow.close();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.handle("start-new-capture", async (event) => {
  assertTrustedIpcSender(event);
  const senderWindow = BrowserWindow.fromWebContents(event.sender);

  if (!senderWindow || senderWindow !== mainWindow) {
    throw new Error("Only the main window can start a new capture");
  }

  const success = await startCaptureSession();
  return { success };
});

app.whenReady().then(async () => {
  app.setAppUserModelId(APP_ID);
  await createWindow();

  const registered = globalShortcut.register("CommandOrControl+Shift+S", () => {
    void startCaptureSession();
  });

  if (!registered) {
    console.error(
      "Could not register Ctrl+Shift+S. The shortcut may already be in use.",
    );
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
