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
  const isHighlighter = tool === "highlighter";

  const isShape = tool === "rectangle" || tool === "circle";

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
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {isShape ? "Border color" : "Color"}
        </span>
        <input
          type="color"
          aria-label={`${toolLabel} color`}
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
          className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {isShape ? "Border width" : "Thickness"}
        </span>
        <input
          type="range"
          aria-label={`${toolLabel} thickness`}
          min={isHighlighter ? 8 : 1}
          max={isHighlighter ? 40 : 20}
          step={1}
          value={width}
          onChange={(event) => onWidthChange(Number(event.target.value))}
          className="w-24 h-1 accent-primary"
        />
        <span className="w-5 text-right tabular-nums">{width}</span>
      </label>
      {isShape && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fillEnabled}
              onChange={(event) => onFillEnabledChange?.(event.target.checked)}
              className="size-4 accent-primary"
            />
            <span className="text-muted-foreground">Fill</span>
          </label>

          {fillEnabled && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Fill color</span>

                <input
                  type="color"
                  aria-label={`${toolLabel} fill color`}
                  value={fillColor}
                  onChange={(event) => onFillColorChange?.(event.target.value)}
                  className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Opacity</span>

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
                  className="h-1 w-24 accent-primary"
                />

                <span className="w-10 text-right tabular-nums">
                  {Math.round(fillOpacity * 100)}%
                </span>
              </label>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EditorOptions;
