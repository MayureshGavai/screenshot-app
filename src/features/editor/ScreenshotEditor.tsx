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

  // Rectangle styling
  const [rectangleColor, setRectangleColor] = useState("#ff0000");
  const [rectangleWidth, setRectangleWidth] = useState(3);
  const [rectangleFillEnabled, setRectangleFillEnabled] = useState(false);
  const [rectangleFillColor, setRectangleFillColor] = useState("#ff0000");
  const [rectangleFillOpacity, setRectangleFillOpacity] = useState(0.25);

  // Circle styling
  const [circleColor, setCircleColor] = useState("#ff0000");
  const [circleWidth, setCircleWidth] = useState(3);
  const [circleFillEnabled, setCircleFillEnabled] = useState(false);
  const [circleFillColor, setCircleFillColor] = useState("#ff0000");
  const [circleFillOpacity, setCircleFillOpacity] = useState(0.25);

  const [textColor, setTextColor] = useState("#ff0000");
  const [textFontSize, setTextFontSize] = useState(24);
  const [textFontWeight, setTextFontWeight] = useState<"normal" | "bold">(
    "normal",
  );

  const {
    strokes,
    arrows,
    rectangles,
    circles,
    activeStroke,
    activeArrow,
    activeRectangle,
    activeCircle,
    startStroke,
    continueStroke,
    finishStroke,
    cancelStroke,
    startArrow,
    continueArrow,
    finishArrow,
    cancelArrow,
    updateArrow,
    beginEdit,
    finishEdit,
    startShape,
    continueShape,
    updateShape,
    finishShape,
    cancelShape,
    texts,
    activeText,
    startText,
    updateActiveText,
    updateText,
    finishText,
    cancelText,
    beginErase,
    eraseAnnotations,
    finishErase,
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

  const handleFinishText = () => {
    finishText();
    setActiveTool("select");
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

      {/* Rectangle options */}
      {activeTool === "rectangle" && (
        <EditorOptions
          tool="rectangle"
          color={rectangleColor}
          width={rectangleWidth}
          onColorChange={setRectangleColor}
          onWidthChange={setRectangleWidth}
          fillEnabled={rectangleFillEnabled}
          fillColor={rectangleFillColor}
          fillOpacity={rectangleFillOpacity}
          onFillEnabledChange={setRectangleFillEnabled}
          onFillColorChange={setRectangleFillColor}
          onFillOpacityChange={setRectangleFillOpacity}
        />
      )}

      {/* Circle options */}
      {activeTool === "circle" && (
        <EditorOptions
          tool="circle"
          color={circleColor}
          width={circleWidth}
          onColorChange={setCircleColor}
          onWidthChange={setCircleWidth}
          fillEnabled={circleFillEnabled}
          fillColor={circleFillColor}
          fillOpacity={circleFillOpacity}
          onFillEnabledChange={setCircleFillEnabled}
          onFillColorChange={setCircleFillColor}
          onFillOpacityChange={setCircleFillOpacity}
        />
      )}

      {activeTool === "text" && (
        <EditorOptions
          tool="text"
          color={textColor}
          width={textFontSize}
          onColorChange={setTextColor}
          onWidthChange={setTextFontSize}
          fontSize={textFontSize}
          fontWeight={textFontWeight}
          onFontSizeChange={setTextFontSize}
          onFontWeightChange={setTextFontWeight}
        />
      )}

      <ScreenshotCanvas
        screenshot={screenshot}
        activeTool={activeTool}
        strokes={strokes}
        activeStroke={activeStroke}
        arrows={arrows}
        activeArrow={activeArrow}
        rectangles={rectangles}
        circles={circles}
        activeRectangle={activeRectangle}
        activeCircle={activeCircle}
        penColor={activeTool === "highlighter" ? highlighterColor : penColor}
        penWidth={activeTool === "highlighter" ? highlighterWidth : penWidth}
        arrowColor={arrowColor}
        arrowWidth={arrowWidth}
        shapeColor={activeTool === "rectangle" ? rectangleColor : circleColor}
        shapeWidth={activeTool === "rectangle" ? rectangleWidth : circleWidth}
        shapeFill={
          activeTool === "rectangle"
            ? rectangleFillEnabled
              ? {
                  color: rectangleFillColor,
                  opacity: rectangleFillOpacity,
                }
              : null
            : circleFillEnabled
              ? {
                  color: circleFillColor,
                  opacity: circleFillOpacity,
                }
              : null
        }
        onStartStroke={startStroke}
        onContinueStroke={continueStroke}
        onFinishStroke={finishStroke}
        onCancelStroke={cancelStroke}
        onStartArrow={startArrow}
        onContinueArrow={continueArrow}
        onFinishArrow={finishArrow}
        onCancelArrow={cancelArrow}
        onUpdateArrow={updateArrow}
        onBeginEdit={beginEdit}
        onFinishEdit={finishEdit}
        onStartShape={startShape}
        onContinueShape={continueShape}
        onUpdateShape={updateShape}
        onFinishShape={finishShape}
        onCancelShape={cancelShape}
        texts={texts}
        activeText={activeText}
        textColor={textColor}
        textFontSize={textFontSize}
        textFontWeight={textFontWeight}
        onStartText={startText}
        onUpdateActiveText={updateActiveText}
        onFinishText={handleFinishText}
        onCancelText={cancelText}
        onUpdateText={updateText}
        onBeginErase={beginErase}
        onEraseAnnotations={eraseAnnotations}
        onFinishErase={finishErase}
      />
    </main>
  );
};

export default ScreenshotEditor;
