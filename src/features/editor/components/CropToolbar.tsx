import { Check, X } from "lucide-react";
import EditorToolButton from "./EditorToolButton";

type CropToolbarProps = {
  canApply: boolean;
  onApply: () => void;
  onCancel: () => void;
};

const CropToolbar = ({ canApply, onApply, onCancel }: CropToolbarProps) => {
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-center gap-3 border-b border-border bg-card px-3 py-2">
      <div className="flex shrink-0 items-center gap-1">
        <EditorToolButton
          label="Cancel crop"
          icon={<X size={17} />}
          onClick={onCancel}
        />

        <EditorToolButton
          label="Apply crop"
          icon={<Check size={17} />}
          disabled={!canApply}
          onClick={onApply}
        />
      </div>
    </header>
  );
};

export default CropToolbar;
