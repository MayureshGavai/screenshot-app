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
import type { EditorTool } from "./types/editor.types";
import EditorToolbar from "./components/EditorToolbar";
import { toast } from "sonner";
import { useAnnotations } from "./hooks/useAnnotations";
import EditorOptions from "./components/EditorOptions";
import ScreenshotCanvas from "./components/ScreenshotCanvas";

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
  const [penColor, setPenColor] = useState("#ff0000");
  const [penWidth, setPenWidth] = useState(4);
  const [arrowColor, setArrowColor] = useState("#ff0000");
  const [arrowWidth, setArrowWidth] = useState(3);

  const [highlighterColor, setHighlighterColor] = useState("#ff0000");
  const [highlighterWidth, setHighlighterWidth] = useState(20);

  const {
    strokes,
    arrows,
    activeStroke,
    activeArrow,
    startStroke,
    continueStroke,
    finishStroke,
    cancelStroke,
    startArrow,
    continueArrow,
    finishArrow,
    cancelArrow,
    updateArrow,
    undo,
    canUndo,
  } = useAnnotations();

  const handleCopy = async () => {
    setIsCopying(true);

    try {
      const response = await fetch(screenshot);
      const blob = await response.blob();

      if (blob.type !== "image/png") {
        throw new Error("Expected a PNG screenshot.");
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      toast.success("Screenshot copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy screenshot:", error);
      toast.error("Could not copy the screenshot.");
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownload = async () => {
    // setMessage("");

    try {
      const result = await window.electronAPI.saveScreenshot(screenshot);

      if (result.canceled) return;

      toast.success("Screenshot saved successfully.");
      console.log("Screenshot saved:", result.filePath);
    } catch (error) {
      console.error("Failed to save screenshot:", error);
      toast.error("Could not save the screenshot.");
    }
  };

  const handleUndo = () => {
    if (!canUndo) return;
    undo();
  };

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onNewCapture={onNewCapture}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onUndo={handleUndo}
        isCopying={isCopying}
        canUndo={canUndo}
      />

      {(activeTool === "pen" || activeTool === "highlighter") && (
        <EditorOptions
          tool={activeTool}
          color={activeTool === "highlighter" ? highlighterColor : penColor}
          width={activeTool === "highlighter" ? highlighterWidth : penWidth}
          onColorChange={
            activeTool === "highlighter" ? setHighlighterColor : setPenColor
          }
          onWidthChange={
            activeTool === "highlighter" ? setHighlighterWidth : setPenWidth
          }
        />
      )}

      {activeTool === "arrow" && (
        <EditorOptions
          tool="pen"
          color={arrowColor}
          width={arrowWidth}
          onColorChange={setArrowColor}
          onWidthChange={setArrowWidth}
        />
      )}

      <ScreenshotCanvas
        screenshot={screenshot}
        activeTool={activeTool}
        strokes={strokes}
        activeStroke={activeStroke}
        arrows={arrows}
        activeArrow={activeArrow}
        penColor={activeTool === "highlighter" ? highlighterColor : penColor}
        penWidth={activeTool === "highlighter" ? highlighterWidth : penWidth}
        arrowColor={arrowColor}
        arrowWidth={arrowWidth}
        onStartStroke={startStroke}
        onContinueStroke={continueStroke}
        onFinishStroke={finishStroke}
        onCancelStroke={cancelStroke}
        onStartArrow={startArrow}
        onContinueArrow={continueArrow}
        onFinishArrow={finishArrow}
        onCancelArrow={cancelArrow}
        onUpdateArrow={updateArrow}
      />
    </main>
  );
};

export default ScreenshotEditor;
