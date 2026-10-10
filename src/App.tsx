import React, { useEffect, useState } from "react";
import { captureScreen } from "./services/ScreenshotService";

type ScreenSource = {
  id: string;
  name: string;
  thumbnail: string;
};

const App = () => {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCatpuring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoadingSources, setIsLoadingSources] = useState(true);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const availableSources = await window.electronAPI.getScreenSources();
        setSources(availableSources);
        const defaultScreen = availableSources.find((source) =>
          source.name.toLowerCase().includes("entire screen"),
        );
        setSelectedSourceId(defaultScreen?.id ?? availableSources[0]?.id ?? "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load available screens and windows",
        );
      } finally {
        setIsLoadingSources(false);
      }
    };
    void loadSources();
  }, []);

  const handleCapture = async () => {
    if (!selectedSourceId) {
      setError("Please select a screen or window first");
      return;
    }

    setIsCatpuring(true);
    setError(null);
    setSaveMessage("");

    try {
      const image = await captureScreen(selectedSourceId);
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
      <h1 className="text-center text-2xl font-bold">Screenshot app</h1>
      <p className="mt-1">Capture entire screen or an individual window</p>
      {/* <section className="mt-5"> */}
      <label htmlFor="source" className="mb-2 block font-medium">
        Select screen or window
      </label>
      <div className="flex flex-wrap gap-4">
        {isLoadingSources && <p>Loading available sources...</p>}

        {sources.length > 0 &&
          sources.map((source) => (
            <div
              key={source.id}
              onClick={() => setSelectedSourceId(source.id)}
              className={`mt-3 flex w-56 cursor-pointer flex-col gap-2 rounded-lg p-2
                ${
                  selectedSourceId === source.id
                    ? "ring-4 ring-green-500 ring-offset-2"
                    : "ring-1 ring-transparent hover:ring-green-500"
                }`}
            >
              <img
                src={source.thumbnail}
                alt={source.name}
                className="h-32 w-full rounded-md border border-gray-300 object-contain"
              />

              <span className="truncate text-sm font-medium">
                {source.name}
              </span>
            </div>
          ))}
      </div>
      {/* <select
          id="source"
          value={selectedSourceId}
          onChange={(event) => setSelectedSourceId(event.target.value)}
          disabled={isLoadingSources || isCapturing || sources.length === 0}
          className="w-full rounded-lg border p-2"
        >
          {sources.length === 0 && (
            <option value="">No source available</option>
          )}
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
        {isLoadingSources && <p>Loading available sources...</p>}

        {sources.length > 0 && selectedSourceId && (
          <div className="mt-3">
            <p className="mb-2 text-sm text-gray-600">
              Selected source preview
            </p>
            <img
              src={
                sources.find((source) => source.id === selectedSourceId)
                  ?.thumbnail
              }
              alt="Selected screen or window"
              className="w-full max-w-sm rounded-lg border"
            />
          </div>
        )}
      </section> */}
      <button
        onClick={handleCapture}
        disabled={isCapturing || isLoadingSources || !selectedSourceId}
        className="mt-4 rounded-lg p-2 bg-green-500 text-white"
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
