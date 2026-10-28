export {};

declare global {
  interface Window {
    electronAPI: {
      appName: string;
      getPlatform: () => Promise<string>;
      getScreenSources: () => Promise<
        {
          id: string;
          name: string;
          thumbnail: string;
        }[]
      >;
      saveScreenshot: (
        dataUrl: string,
      ) => Promise<{ canceled: true } | { canceled: false; filePath: string }>;
      hideWindow: () => Promise<void>;
      showWindow: () => Promise<void>;
      closeCaptureToolbar: () => Promise<void>;
      getCaptureSnapshot: () => Promise<string>;
      openScreenshotEditor: (dataUrl: string) => Promise<{
        success: boolean;
      }>;
      onScreenshotReady: (callback: (dataUrl: string) => void) => () => void;
      startNewCapture: () => Promise<{ success: boolean }>;
    };
  }
}
