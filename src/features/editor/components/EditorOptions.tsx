type EditorOptionsProps = {
  color: string;
  width: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
};

const EditorOptions = ({
  color,
  width,
  onColorChange,
  onWidthChange,
}: EditorOptionsProps) => {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Color</span>
        <input
          type="color"
          aria-label="Pen color"
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
          className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Thickness</span>
        <input
          type="range"
          aria-label="Pen thickness"
          min={1}
          max={20}
          step={1}
          value={width}
          onChange={(event) => onWidthChange(Number(event.target.value))}
          className="w-24 accent-primary"
        />
        <span className="w-5 text-right tabular-nums">{width}</span>
      </label>
    </div>
  );
};

export default EditorOptions;
