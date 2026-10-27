import {
  ArrowUpRight,
  ChevronDown,
  Circle,
  Copy,
  Crop,
  Download,
  Eraser,
  Highlighter,
  MousePointer2,
  Pencil,
  Plus,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { useState } from "react";

import type { EditorTool } from "../types/editor.types";
import EditorToolButton from "./EditorToolButton";
import EditorOptions from "./EditorOptions";

type ConfigurableTool =
  | "pen"
  | "highlighter"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text";

type EditorToolbarProps = {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onNewCapture: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onUndo: () => void;
  isCopying: boolean;
  canUndo: boolean;

  // Existing editor option values and callbacks
  color: string;
  width: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  fillEnabled?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  onFillEnabledChange?: (enabled: boolean) => void;
  onFillColorChange?: (color: string) => void;
  onFillOpacityChange?: (opacity: number) => void;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  onFontSizeChange?: (size: number) => void;
  onFontWeightChange?: (weight: "normal" | "bold") => void;

  penColor: string;
  penWidth: number;
  onPenColorChange: (color: string) => void;
  onPenWidthChange: (width: number) => void;

  highlighterColor: string;
  highlighterWidth: number;
  onHighlighterColorChange: (color: string) => void;
  onHighlighterWidthChange: (width: number) => void;

  arrowColor: string;
  arrowWidth: number;
  onArrowColorChange: (color: string) => void;
  onArrowWidthChange: (width: number) => void;

  rectangleColor: string;
  rectangleWidth: number;
  rectangleFillEnabled: boolean;
  rectangleFillColor: string;
  rectangleFillOpacity: number;
  onRectangleColorChange: (color: string) => void;
  onRectangleWidthChange: (width: number) => void;
  onRectangleFillEnabledChange: (enabled: boolean) => void;
  onRectangleFillColorChange: (color: string) => void;
  onRectangleFillOpacityChange: (opacity: number) => void;

  circleColor: string;
  circleWidth: number;
  circleFillEnabled: boolean;
  circleFillColor: string;
  circleFillOpacity: number;
  onCircleColorChange: (color: string) => void;
  onCircleWidthChange: (width: number) => void;
  onCircleFillEnabledChange: (enabled: boolean) => void;
  onCircleFillColorChange: (color: string) => void;
  onCircleFillOpacityChange: (opacity: number) => void;

  textColor: string;
  textFontSize: number;
  textFontWeight: "normal" | "bold";
  onTextColorChange: (color: string) => void;
  onTextFontSizeChange: (size: number) => void;
  onTextFontWeightChange: (weight: "normal" | "bold") => void;
};

const CONFIGURABLE_TOOLS: ConfigurableTool[] = [
  "pen",
  "highlighter",
  "arrow",
  "rectangle",
  "circle",
  "text",
];

const EditorToolbar = ({
  activeTool,
  onToolChange,
  onNewCapture,
  onCopy,
  onDownload,
  onUndo,
  isCopying,
  canUndo,
  color,
  width,
  onColorChange,
  onWidthChange,
  fillEnabled,
  fillColor,
  fillOpacity,
  onFillEnabledChange,
  onFillColorChange,
  onFillOpacityChange,
  fontSize,
  fontWeight,
  onFontSizeChange,
  onFontWeightChange,
  penColor,
  penWidth,
  onPenColorChange,
  onPenWidthChange,

  highlighterColor,
  highlighterWidth,
  onHighlighterColorChange,
  onHighlighterWidthChange,

  arrowColor,
  arrowWidth,
  onArrowColorChange,
  onArrowWidthChange,

  rectangleColor,
  rectangleWidth,
  rectangleFillEnabled,
  rectangleFillColor,
  rectangleFillOpacity,
  onRectangleColorChange,
  onRectangleWidthChange,
  onRectangleFillEnabledChange,
  onRectangleFillColorChange,
  onRectangleFillOpacityChange,

  circleColor,
  circleWidth,
  circleFillEnabled,
  circleFillColor,
  circleFillOpacity,
  onCircleColorChange,
  onCircleWidthChange,
  onCircleFillEnabledChange,
  onCircleFillColorChange,
  onCircleFillOpacityChange,

  textColor,
  textFontSize,
  textFontWeight,
  onTextColorChange,
  onTextFontSizeChange,
  onTextFontWeightChange,
}: EditorToolbarProps) => {
  const [openOptionsTool, setOpenOptionsTool] =
    useState<ConfigurableTool | null>(null);

  const tools = [
    { id: "select", label: "Select", icon: MousePointer2 },
    { id: "crop", label: "Crop", icon: Crop },
    { id: "pen", label: "Pen", icon: Pencil },
    { id: "highlighter", label: "Highlighter", icon: Highlighter },
    { id: "arrow", label: "Arrow", icon: ArrowUpRight },
    { id: "rectangle", label: "Rectangle", icon: Square },
    { id: "circle", label: "Circle", icon: Circle },
    { id: "text", label: "Text", icon: Type },
    { id: "eraser", label: "Eraser", icon: Eraser },
  ] as const satisfies ReadonlyArray<{
    id: EditorTool;
    label: string;
    icon: typeof MousePointer2;
  }>;

  const handleToolSelect = (tool: EditorTool) => {
    if (activeTool === tool) {
      if (CONFIGURABLE_TOOLS.includes(tool as ConfigurableTool)) {
        setOpenOptionsTool((current) =>
          current === tool ? null : (tool as ConfigurableTool),
        );
      }
      return;
    }

    onToolChange(tool);
    setOpenOptionsTool(null);
  };

  const handleOptionsToggle = (tool: ConfigurableTool) => {
    // The arrow also selects the tool if it isn't active yet.
    if (activeTool !== tool) {
      onToolChange(tool);
    }

    setOpenOptionsTool((current) => (current === tool ? null : tool));
  };

  const showOptions =
    openOptionsTool !== null && activeTool === openOptionsTool;

  return (
    <header className="relative z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 py-2">
      {/* Left: New capture */}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onNewCapture}
          title="New capture"
          aria-label="New capture"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:opacity-80"
        >
          <Plus size={17} />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>

      {/* Middle: Editing tools */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto">
        {tools.map(({ id, label, icon: Icon }) => {
          const hasOptions = CONFIGURABLE_TOOLS.includes(
            id as ConfigurableTool,
          );

          return (
            <div key={id} className="flex shrink-0 items-center">
              <EditorToolButton
                label={label}
                icon={<Icon size={17} />}
                isActive={activeTool === id}
                onClick={() => handleToolSelect(id)}
              />

              {hasOptions && (
                <button
                  type="button"
                  title={`${label} options`}
                  aria-label={`${label} options`}
                  aria-expanded={openOptionsTool === id}
                  onClick={() => handleOptionsToggle(id as ConfigurableTool)}
                  className={`-ml-1 flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted ${
                    activeTool === id ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${
                      openOptionsTool === id ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          );
        })}

        <div className="mx-1 h-6 w-px shrink-0 bg-border" />

        <EditorToolButton
          label="Undo"
          icon={<Undo2 size={17} />}
          disabled={!canUndo}
          onClick={onUndo}
        />
      </div>

      {/* Right: Copy and download */}
      <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
        <EditorToolButton
          label={isCopying ? "Copying screenshot" : "Copy screenshot"}
          icon={<Copy size={17} />}
          disabled={isCopying}
          onClick={onCopy}
        />

        <EditorToolButton
          label="Download screenshot"
          icon={<Download size={17} />}
          onClick={onDownload}
        />
      </div>

      {/* Floating options panel */}
      {showOptions && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          {activeTool === "pen" && (
            <EditorOptions
              tool="pen"
              color={penColor}
              width={penWidth}
              onColorChange={onPenColorChange}
              onWidthChange={onPenWidthChange}
            />
          )}

          {activeTool === "highlighter" && (
            <EditorOptions
              tool="highlighter"
              color={highlighterColor}
              width={highlighterWidth}
              onColorChange={onHighlighterColorChange}
              onWidthChange={onHighlighterWidthChange}
            />
          )}

          {activeTool === "arrow" && (
            <EditorOptions
              tool="pen"
              color={arrowColor}
              width={arrowWidth}
              onColorChange={onArrowColorChange}
              onWidthChange={onArrowWidthChange}
            />
          )}

          {activeTool === "rectangle" && (
            <EditorOptions
              tool="rectangle"
              color={rectangleColor}
              width={rectangleWidth}
              onColorChange={onRectangleColorChange}
              onWidthChange={onRectangleWidthChange}
              fillEnabled={rectangleFillEnabled}
              fillColor={rectangleFillColor}
              fillOpacity={rectangleFillOpacity}
              onFillEnabledChange={onRectangleFillEnabledChange}
              onFillColorChange={onRectangleFillColorChange}
              onFillOpacityChange={onRectangleFillOpacityChange}
            />
          )}

          {activeTool === "circle" && (
            <EditorOptions
              tool="circle"
              color={circleColor}
              width={circleWidth}
              onColorChange={onCircleColorChange}
              onWidthChange={onCircleWidthChange}
              fillEnabled={circleFillEnabled}
              fillColor={circleFillColor}
              fillOpacity={circleFillOpacity}
              onFillEnabledChange={onCircleFillEnabledChange}
              onFillColorChange={onCircleFillColorChange}
              onFillOpacityChange={onCircleFillOpacityChange}
            />
          )}

          {activeTool === "text" && (
            <EditorOptions
              tool="text"
              color={textColor}
              width={textFontSize}
              onColorChange={onTextColorChange}
              onWidthChange={onTextFontSizeChange}
              fontSize={textFontSize}
              fontWeight={textFontWeight}
              onFontSizeChange={onTextFontSizeChange}
              onFontWeightChange={onTextFontWeightChange}
            />
          )}
        </div>
      )}
    </header>
  );
};

export default EditorToolbar;
