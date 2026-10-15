import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export default function Button({
  variant = "primary",
  icon,
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary" ? "primary-button" : "secondary-button";

  return (
    <button
      type={type}
      className={`${variantClass} ${className}`.trim()}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
