import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type EditorToolButtonProps = {
  label: string;
  icon: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  dropdown?: {
    label: string;
    expanded: boolean;
    onClick: () => void;
  };
};

const EditorToolButton = ({
  label,
  icon,
  isActive,
  disabled,
  onClick,
  dropdown,
}: EditorToolButtonProps) => {
  return (
    <div className="flex shrink-0 flex-col items-center">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={isActive}
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md
        transition-colors disabled:cursor-not-allowed disabled:opacity-40
        ${
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        {icon}
      </button>
      {isActive && dropdown && (
        <button
          type="button"
          title={dropdown.label}
          aria-label={dropdown.label}
          aria-expanded={dropdown.expanded}
          onClick={dropdown.onClick}
          className="flex h-4 w-7 items-center justify-center rounded-b-md
            text-primary transition-colors hover:bg-muted"
        >
          <ChevronDown
            size={13}
            className={`transition-transform ${
              dropdown.expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
};

export default EditorToolButton;
