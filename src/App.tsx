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
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isRefreshingSources, setIsRefreshingSources] = useState(false);

  const loadSources = async (isRefesh = false) => {
    if (isRefesh) {
      setIsRefreshingSources(true);
    } else {
      setIsLoadingSources(true);
    }

    try {
      const availableSources = await window.electronAPI.getScreenSources();
      const filteredSources = availableSources.filter(
        (source) => source.name.toLowerCase() !== "screenshot-app",
      );

      setSources(filteredSources);
      setSelectedSourceId((currentId) => {
        if (filteredSources.some((source) => source.id === currentId)) {
          return currentId;
        }

        const defaultScreen = filteredSources.find((source) =>
          source.name.toLowerCase().includes("entire screen"),
        );

        return defaultScreen?.id ?? filteredSources[0]?.id ?? "";
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load available screens and windows",
      );
    } finally {
      setIsLoadingSources(false);
      setIsRefreshingSources(false);
    }
  };

  useEffect(() => {
    void loadSources();
  }, []);

  const handleCapture = async () => {
    if (!selectedSourceId) {
      setError("Please select a screen or window first");
      return;
    }

    setIsCapturing(true);
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
      setIsCapturing(false);
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
      <button
        type="button"
        onClick={() => void loadSources(true)}
        disabled={isLoadingSources || isRefreshingSources || isCapturing}
        className="mb-3 disabled:opacity-50  hover:underline cursor-pointer"
      >
        {isRefreshingSources ? "Refreshing..." : "Refresh sources"}
      </button>
      <label htmlFor="source" className="mb-2 block font-medium">
        Select screen or window
      </label>
      <div className="flex flex-wrap gap-4">
        {isLoadingSources && <p>Loading available sources...</p>}
        {sources.map((source) => {
          const isSelected = selectedSourceId === source.id;

          return (
            <button
              key={source.id}
              type="button"
              onClick={() => {
                if (isCapturing) return;

                setSelectedSourceId(source.id);
                setError(null);
              }}
              disabled={isCapturing}
              aria-pressed={isSelected}
              className={`mt-3 flex w-56 cursor-pointer flex-col gap-2
        rounded-lg p-2 text-left
        disabled:cursor-not-allowed disabled:opacity-60
        ${
          isSelected
            ? "ring-4 ring-green-500 ring-offset-2"
            : "ring-1 ring-transparent hover:ring-green-500"
        }`}
            >
              <img
                src={source.thumbnail}
                alt=""
                className="h-32 w-full rounded-md border border-gray-300 object-contain"
              />

              <span className="truncate text-sm font-medium">
                {source.name}
              </span>
            </button>
          );
        })}
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
