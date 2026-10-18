import {
  Check,
  Clipboard,
  Copy,
  MousePointer2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useState } from "react";

type ScreenshotEditorProps = {
  screenshot: string;
  onClose: () => void;
};

const ScreenshotEditor = ({ screenshot, onClose }: ScreenshotEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [message, setMessage] = useState("");

  const handleCopy = async () => {
    setIsCopying(true);
    setMessage("");

    try {
      const response = await fetch(screenshot);
      const blob = await response.blob();

      if (blob.type !== "image/png") {
        throw new Error("Expected a PNG screenshot.");
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      setMessage("Screenshot copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy screenshot:", error);
      setMessage("Could not copy the screenshot.");
    } finally {
      setIsCopying(false);
    }
  };

  const handleSave = async () => {
    setMessage("");

    try {
      const result = await window.electronAPI.saveScreenshot(screenshot);

      if (result.canceled) {
        return;
      }

      setMessage("Screenshot saved successfully.");
      console.log("Screenshot saved:", result.filePath);
    } catch (error) {
      console.error("Failed to save screenshot:", error);
      setMessage("Could not save the screenshot.");
    }
  };

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            aria-pressed={!isEditing}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              !isEditing
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <MousePointer2 size={16} />
            Select
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-pressed={isEditing}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              isEditing
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Pencil size={16} />
            Edit
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy size={16} />
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:opacity-90"
          >
            <Save size={16} />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close screenshot"
            title="Close screenshot"
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-accent"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {message && (
        <div
          role="status"
          className="shrink-0 border-b border-border px-4 py-2 text-sm text-muted-foreground"
        >
          {message}
        </div>
      )}

      <section className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/50 p-4 sm:p-6">
        <img
          src={screenshot}
          alt="Captured screenshot"
          draggable={false}
          className="block h-auto max-h-full w-auto max-w-full select-none object-contain shadow-lg"
        />
      </section>

      {isEditing && (
        <footer className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          <Pencil size={15} />
          Editing mode is active. Drawing and annotation tools will be added in
          the next phase.
          <span className="sr-only">
            <Check />
          </span>
        </footer>
      )}
    </main>
  );
};

export default ScreenshotEditor;
