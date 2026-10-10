import React, { useEffect, useState } from "react";
import { captureScreen } from "./services/ScreenshotService";

const App = () => {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCatpuring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  // const [platform, setPlatform] = useState<string>("");
  // const [sources, setSources] = useState<{ id: string; name: string }[]>([]);

  // useEffect(() => {
  //   window.electronAPI.getPlatform().then(setPlatform);
  //   window.electronAPI.getScreenSources().then(setSources);
  // }, []);

  const handleCapture = async () => {
    setIsCatpuring(true);
    setError(null);
    try {
      const image = await captureScreen();
      setScreenshot(image);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to capture the screen",
      );
    } finally {
      setIsCatpuring(false);
    }
  };

  const handleSave = async () => {
    if (!screenshot) return;
    setSaveMessage("");

    try {
      const result = await window.electronAPI.saveScreenshot(screenshot);
      if (result.canceled) {
        setSaveMessage("Save cancelled");
        return;
      }
      setSaveMessage(`Screenshot saved to: ${result.filePath}`);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save screenshot",
      );
    }
  };

  return (
    <main className="p-6">
      <h1>Screenshot app</h1>
      <p>Capture your windows desktop and preview it here</p>
      <button
        onClick={handleCapture}
        disabled={isCapturing}
        className="rounded-lg p-2 bg-green-500 text-white"
      >
        {isCapturing ? "Capturing" : "Capture screenshot"}
      </button>
      {error && <span className="text-red-500">{error}</span>}

      {screenshot && (
        <section className="mt-4 flex flex-col">
          <h2>Screenshot preview</h2>
          <img
            src={screenshot}
            alt="captured screenshot"
            className="block w-full max-w-250 h-auto rounded-lg border"
          />
          <button
            className="mt-4 mx-auto rounded-lg p-2 bg-green-500 text-white"
            onClick={handleSave}
          >
            Save screenshot
          </button>
          {saveMessage && <p>{saveMessage}</p>}
        </section>
      )}
    </main>
  );
};

export default App;
