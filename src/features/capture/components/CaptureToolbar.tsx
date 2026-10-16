import { Aperture, Check, ChevronDown, Crop, Monitor, X } from "lucide-react";
import React, { useEffect, useState } from "react";

type CaptureMode = "rectangle" | "screen";

const CaptureToolbar = () => {
  const [mode, setMode] = useState<CaptureMode>("rectangle");
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState("");

  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      .getCaptureSnapshot()
      .then((dataurl) => {
        if (!cancelled) {
          setSnapshot(dataurl);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load desktop snapshot:", error);

        if (!cancelled) {
          setCaptureError("Could not load the desktop snapshot.");
        }
      });

    return () => {
      cancelled = true;
    };
  });

  const handleClose = () => {
    void window.electronAPI.closeCaptureToolbar();
  };

  const handleModeChange = (nextCode: CaptureMode) => {
    setMode(nextCode);
    setIsOpen(false);
  };

  return (
    <main className="capture-overlay">
      {snapshot && (
        <div
          className="capture-overlay__snapshot"
          style={{ backgroundImage: `url("${snapshot}")` }}
        ></div>
      )}
      <div className="capture-overlay__backdrop" />

      {captureError && (
        <div className="capture-overlay__error" role="alert">
          {captureError}
        </div>
      )}

      <section
        className="capture-toolbar"
        aria-label="Screenshot capture toolbar"
      >
        <div className="capture-toolbar__logo" aria-label="Screenshot App">
          <Aperture size={21} />
        </div>

        <div className="capture-toolbar__mode-wrapper">
          <button
            type="button"
            className="capture-toolbar__mode"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            onClick={() => setIsOpen((open) => !open)}
          >
            {mode === "rectangle" ? <Crop size={17} /> : <Monitor size={17} />}

            <span>{mode === "rectangle" ? "Rectangle" : "Screen"}</span>
            <ChevronDown size={15} className={isOpen ? "is-rotated" : ""} />
          </button>

          {isOpen && (
            <div className="capture-toolbar__dropdown" role="listbox">
              <button
                type="button"
                role="option"
                aria-selected={mode === "rectangle"}
                onClick={() => handleModeChange("rectangle")}
              >
                <Crop size={17} />
                <span>Rectangle</span>
                {mode === "rectangle" && <Check size={15} />}
              </button>

              <button
                type="button"
                role="option"
                aria-selected={mode === "screen"}
                onClick={() => handleModeChange("screen")}
              >
                <Monitor size={17} />
                <span>Screen</span>
                {mode === "screen" && <Check size={15} />}
              </button>
            </div>
          )}
        </div>

        <div className="capture-toolbar__divider" />

        <button
          type="button"
          className="capture-toolbar__close"
          aria-label="Cancel capture"
          title="Cancel capture"
          onClick={handleClose}
        >
          <X size={19} />
        </button>
      </section>
    </main>
  );
};

export default CaptureToolbar;
