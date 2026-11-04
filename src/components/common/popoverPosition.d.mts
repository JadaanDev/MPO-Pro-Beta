export interface PopoverAnchor {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PopoverSize {
  width: number;
  height: number;
}

export interface PopoverViewport extends PopoverSize {
  left: number;
  top: number;
}

export interface PopoverPosition {
  left: number;
  top: number;
  maxWidth: number;
  maxHeight: number;
  placement: "top" | "bottom";
}

export function getPopoverPosition(
  anchor: PopoverAnchor,
  popup: PopoverSize,
  viewport: PopoverViewport,
  gap?: number,
  margin?: number,
): PopoverPosition;
