import type { ReactNode } from "react";

type EditorToolButtonProps = {
  label: string;
  icon: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const EditorToolButton = ({
  label,
  icon,
  isActive,
  disabled,
  onClick,
}: EditorToolButtonProps) => {
  return (
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
  );
};

export default EditorToolButton;
