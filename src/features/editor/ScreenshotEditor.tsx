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
import { type EditorTool } from "./types/editor.types";
import EditorToolbar from "./components/EditorToolbar";

type ScreenshotEditorProps = {
  screenshot: string;
  onNewCapture: () => void;
};

const ScreenshotEditor = ({
  screenshot,
  onNewCapture,
}: ScreenshotEditorProps) => {
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
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

  const handleDownload = async () => {
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
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={(tool) => {
          setActiveTool(tool);
          setMessage("");
        }}
        onNewCapture={onNewCapture}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onUndo={() => {}}
        isCopying={isCopying}
        canUndo={false}
      />

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
    </main>
  );
};

export default ScreenshotEditor;
