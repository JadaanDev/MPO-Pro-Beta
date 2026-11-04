import React from "react";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  id?: string;
  title?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  sublabel,
  size = "md",
  disabled = false,
  className = "",
  id,
  title,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div 
      className={`unt-toggle-wrapper ${size} ${disabled ? "disabled" : ""} ${className}`}
      onClick={handleClick}
      title={title}
    >
      <div
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={title || (typeof label === "string" ? label : undefined)}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`unt-toggle-switch ${size} ${checked ? "checked" : ""}`}
      >
        <span className="unt-toggle-thumb" />
      </div>

      {(label || sublabel) && (
        <div className="unt-toggle-labels">
          {label && <span className="unt-toggle-label">{label}</span>}
          {sublabel && <span className="unt-toggle-sublabel">{sublabel}</span>}
        </div>
      )}
    </div>
  );
};

export default Toggle;
