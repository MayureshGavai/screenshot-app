import React, { useEffect, useState } from "react";
import LandingPage from "./features/landing/LandingPage";
import { useSystemTheme } from "./hooks/useSystemTheme";
import CaptureToolbar from "./features/capture/components/CaptureToolbar";

const App = () => {
  useSystemTheme();
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const isCaptureToolbar =
    new URLSearchParams(window.location.search).get("window") ===
    "capture-toolbar";

  useEffect(() => {
    if (isCaptureToolbar) return;

    return window.electronAPI.onScreenshotReady((dataUrl) => {
      setScreenshot(dataUrl);
    });
  }, [isCaptureToolbar]);

  if (isCaptureToolbar) {
    return <CaptureToolbar />;
  }

  if (screenshot) {
    return (
      <main className="screenshot-editor">
        <header className="screenshot-editor__toolbar">
          <h1>Screenshot Editor</h1>

          <div className="screenshot-editor__actions">
            <button
              type="button"
              onClick={async () => {
                try {
                  const result =
                    await window.electronAPI.saveScreenshot(screenshot);

                  if (!result.canceled) {
                    console.log("Screenshot saved:", result.filePath);
                  }
                } catch (error) {
                  console.error("Failed to save screenshot:", error);
                }
              }}
            >
              Save As
            </button>

            <button
              type="button"
              onClick={() => {
                setScreenshot(null);
              }}
            >
              Back to Home
            </button>
          </div>
        </header>

        <section className="screenshot-editor__canvas">
          <img
            src={screenshot}
            alt="Captured screenshot"
            className="screenshot-editor__image"
          />
        </section>
      </main>
    );
  }

  return <LandingPage />;
};

export default App;
