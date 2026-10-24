import {
  ArrowUpRight,
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
import type { EditorTool } from "../types/editor.types";
import EditorToolButton from "./EditorToolButton";

type EditorToolbarProps = {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onNewCapture: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onUndo: () => void;
  isCopying: boolean;
  canUndo: boolean;
};

const EditorToolbar = ({
  activeTool,
  onToolChange,
  onNewCapture,
  onCopy,
  onDownload,
  onUndo,
  isCopying,
  canUndo,
}: EditorToolbarProps) => {
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

  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 py-2">
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
        {tools.map(({ id, label, icon: Icon }) => (
          <EditorToolButton
            key={id}
            label={label}
            icon={<Icon size={17} />}
            isActive={activeTool === id}
            onClick={() => onToolChange(id)}
          />
        ))}

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
    </header>
  );
};

export default EditorToolbar;
