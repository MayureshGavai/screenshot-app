import { useEffect, useState } from "react";
import LandingPage from "./features/landing/LandingPage";
import ScreenshotEditor from "./features/editor/ScreenshotEditor";
import { useSystemTheme } from "./hooks/useSystemTheme";
import CaptureToolbar from "./features/capture/components/CaptureToolbar";
import { Toaster } from "sonner";

const App = () => {
  useSystemTheme();

  const [screenshot, setScreenshot] = useState<string | null>(null);

  const isCaptureToolbar =
    new URLSearchParams(window.location.search).get("window") ===
    "capture-toolbar";

  useEffect(() => {
    if (isCaptureToolbar) {
      return;
    }

    return window.electronAPI.onScreenshotReady((dataUrl) => {
      setScreenshot(dataUrl);
    });
  }, [isCaptureToolbar]);

  const handleNewCapture = async () => {
    try {
      await window.electronAPI.startNewCapture();
      setScreenshot(null);
    } catch (error) {
      console.error("Failed to start a new capture:", error);
    }
  };

  if (isCaptureToolbar) {
    return <CaptureToolbar />;
  }

  return (
    <>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={2500}
        theme="system"
      />
      {screenshot ? (
        <ScreenshotEditor
          screenshot={screenshot}
          onNewCapture={handleNewCapture}
        />
      ) : (
        <LandingPage />
      )}
    </>
  );
};

export default App;
