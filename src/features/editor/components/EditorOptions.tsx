import { useState } from "react";
import { ANNOTATION_COLORS } from "../../../constants/colors";

type EditorOptionsProps = {
  tool: "pen" | "highlighter" | "rectangle" | "circle" | "text";
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
};

const ColorPalette = ({
  selectedColor,
  onChange,
}: {
  selectedColor: string;
  onChange: (color: string) => void;
}) => (
  <div className="grid grid-cols-4 gap-2">
    {ANNOTATION_COLORS.map((item) => (
      <button
        key={item}
        type="button"
        title={item}
        aria-label={`Select color ${item}`}
        aria-pressed={selectedColor.toLowerCase() === item.toLowerCase()}
        onClick={() => onChange(item)}
        className={`size-7 rounded-full border border-border transition hover:scale-110 ${
          selectedColor.toLowerCase() === item.toLowerCase()
            ? "ring-2 ring-primary ring-offset-2"
            : ""
        }`}
        style={{ backgroundColor: item }}
      />
    ))}
  </div>
);

const EditorOptions = ({
  tool,
  color,
  width,
  onColorChange,
  onWidthChange,
  fillEnabled = false,
  fillColor = "#ff0000",
  fillOpacity = 0.25,
  onFillEnabledChange,
  onFillColorChange,
  onFillOpacityChange,
  fontSize = 24,
  fontWeight = "normal",
  onFontSizeChange,
  onFontWeightChange,
}: EditorOptionsProps) => {
  const [shapeColorTarget, setShapeColorTarget] = useState<"outline" | "fill">(
    "outline",
  );

  const isHighlighter = tool === "highlighter";
  const isShape = tool === "rectangle" || tool === "circle";
  const isText = tool === "text";

  const selectedShapeColor = shapeColorTarget === "outline" ? color : fillColor;

  const handleShapeColorChange = (selected: string) => {
    if (shapeColorTarget === "outline") {
      onColorChange(selected);
      return;
    }

    onFillColorChange?.(selected);

    if (!fillEnabled) {
      onFillEnabledChange?.(true);
    }
  };

  const toolLabel =
    tool === "text"
      ? "Text"
      : tool === "rectangle"
        ? "Rectangle"
        : tool === "circle"
          ? "Circle"
          : isHighlighter
            ? "Highlighter"
            : "Pen";

  return (
    <div
      className={`${
        isShape ? "w-72 sm:w-80" : "w-56"
      } rounded-lg border border-border bg-app-bg p-3 shadow-xl`}
    >
      {/* Shape outline and fill controls */}
      {isShape && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Shape style
            </span>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={fillEnabled}
                onChange={(event) =>
                  onFillEnabledChange?.(event.target.checked)
                }
                className="size-3.5 accent-primary"
              />
              Fill enabled
            </label>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShapeColorTarget("outline")}
              className={`rounded-md border p-2 text-xs transition-colors ${
                shapeColorTarget === "outline"
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span className="mb-2 block">Outline</span>
              <span
                className="mx-auto block size-5 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
            </button>

            <button
              type="button"
              onClick={() => setShapeColorTarget("fill")}
              className={`rounded-md border p-2 text-xs transition-colors ${
                shapeColorTarget === "fill"
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span className="mb-2 block">Fill color</span>
              <span
                className="mx-auto block size-5 rounded-full border border-border"
                style={{ backgroundColor: fillColor }}
              />
            </button>
          </div>

          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {shapeColorTarget === "outline" ? "Outline color" : "Fill color"}
          </div>

          <ColorPalette
            selectedColor={selectedShapeColor}
            onChange={handleShapeColorChange}
          />
        </>
      )}

      {/* Main color palette for pen, highlighter and text */}
      {!isShape && (
        <>
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {toolLabel} color
          </div>

          <ColorPalette selectedColor={color} onChange={onColorChange} />
        </>
      )}

      {/* Width / font size */}
      <div className="my-3 border-t border-border" />

      {!isText && (
        <label className="block">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              {isShape ? "Border width" : "Thickness"}
            </span>
            <span className="tabular-nums">{width}px</span>
          </div>

          <input
            type="range"
            aria-label={`${toolLabel} thickness`}
            min={isHighlighter ? 8 : 1}
            max={isHighlighter ? 40 : 20}
            step={1}
            value={width}
            onChange={(event) => onWidthChange(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-primary"
          />
        </label>
      )}

      {isText && (
        <>
          <label className="block">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                Font size
              </span>
              <span className="tabular-nums">{fontSize}px</span>
            </div>

            <input
              type="range"
              aria-label="Text font size"
              min={12}
              max={72}
              step={1}
              value={fontSize}
              onChange={(event) =>
                onFontSizeChange?.(Number(event.target.value))
              }
              className="h-1.5 w-full cursor-pointer accent-primary"
            />
          </label>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={fontWeight === "bold"}
              onChange={(event) =>
                onFontWeightChange?.(event.target.checked ? "bold" : "normal")
              }
              className="size-3.5 accent-primary"
            />
            Bold text
          </label>
        </>
      )}

      {/* Shape fill opacity */}
      {isShape && fillEnabled && (
        <>
          <div className="my-3 border-t border-border" />

          <label className="block">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                Fill opacity
              </span>
              <span className="tabular-nums">
                {Math.round(fillOpacity * 100)}%
              </span>
            </div>

            <input
              type="range"
              aria-label={`${toolLabel} fill opacity`}
              min={0}
              max={1}
              step={0.05}
              value={fillOpacity}
              onChange={(event) =>
                onFillOpacityChange?.(Number(event.target.value))
              }
              className="h-1.5 w-full cursor-pointer accent-primary"
            />
          </label>
        </>
      )}
    </div>
  );
};

export default EditorOptions;
