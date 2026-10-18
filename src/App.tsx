import { useEffect, useState } from "react";
import LandingPage from "./features/landing/LandingPage";
import ScreenshotEditor from "./features/editor/components/ScreenshotEditor";
import { useSystemTheme } from "./hooks/useSystemTheme";
import CaptureToolbar from "./features/capture/components/CaptureToolbar";

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

  if (isCaptureToolbar) {
    return <CaptureToolbar />;
  }

  if (screenshot) {
    return (
      <ScreenshotEditor
        screenshot={screenshot}
        onClose={() => setScreenshot(null)}
      />
    );
  }

  return <LandingPage />;
};

export default App;
