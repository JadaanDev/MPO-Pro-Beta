import React, { useState, useRef, useEffect } from "react";

interface EditableValueBadgeProps {
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  displayMultiplier?: number; // e.g. 100 for percentage
  onChange: (newVal: number) => void;
  tooltip?: string;
  color?: string;
}

export const EditableValueBadge: React.FC<EditableValueBadgeProps> = ({
  value,
  unit = "",
  min,
  max,
  step = 1,
  displayMultiplier = 1,
  onChange,
  tooltip = "Click to enter exact value",
  color,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const displayVal = Math.round(value * displayMultiplier * 100) / 100;
  const [editVal, setEditVal] = useState<string>(String(displayVal));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditVal(String(Math.round(value * displayMultiplier * 100) / 100));
    }
  }, [value, displayMultiplier, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitValue = () => {
    const parsed = parseFloat(editVal);
    if (!isNaN(parsed)) {
      let finalVal = parsed / displayMultiplier;
      if (min !== undefined && finalVal < min) finalVal = min;
      if (max !== undefined && finalVal > max) finalVal = max;
      onChange(finalVal);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitValue();
    } else if (e.key === "Escape") {
      setEditVal(String(displayVal));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={min !== undefined ? min * displayMultiplier : undefined}
        max={max !== undefined ? max * displayMultiplier : undefined}
        step={step * displayMultiplier}
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        className="val-badge-input"
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`${tooltip}: ${displayVal}${unit}`}
      onClick={() => setIsEditing(true)}
      className="val-badge editable"
      title={tooltip}
      style={{ color: color || undefined, font: "inherit" }}
    >
      {displayVal}
      {unit}
      <span className="edit-hint-icon">✎</span>
    </button>
  );
};
