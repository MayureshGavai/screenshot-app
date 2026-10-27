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
  isActive = false,
  disabled = false,
  onClick,
  dropdown,
}: EditorToolButtonProps) => {
  return (
    <div className="relative flex h-13 w-9 shrink-0 items-start justify-center">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={isActive}
        disabled={disabled}
        onClick={onClick}
        className={`flex size-9 shrink-0 items-center justify-center rounded-md
          transition-colors disabled:cursor-not-allowed disabled:opacity-40
          ${
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
      >
        {icon}
      </button>

      {dropdown && (
        <button
          type="button"
          title={dropdown.label}
          aria-label={dropdown.label}
          aria-expanded={dropdown.expanded}
          disabled={!isActive}
          tabIndex={isActive ? 0 : -1}
          onClick={dropdown.onClick}
          className={`absolute left-1/2 top-9 z-20
            flex h-4 w-7 -translate-x-1/2 items-center justify-center
            rounded-b-md transition-colors
            ${
              isActive
                ? "visible opacity-100 text-primary hover:bg-muted"
                : "invisible pointer-events-none opacity-0"
            }`}
        >
          <ChevronDown
            size={13}
            className={`transition-transform duration-150 ${
              dropdown.expanded ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
      )}
    </div>
  );
};

export default EditorToolButton;
