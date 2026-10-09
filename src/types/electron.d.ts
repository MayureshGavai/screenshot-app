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
        }[]
      >;
      getDesktopSourceId: () => Promise<string>;
    };
  }
}
