const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Place a fixed popover in layout-viewport coordinates. The returned size limits
 * let the caller scroll oversized content without trapping controls offscreen.
 */
export function getPopoverPosition(anchor, popup, viewport, gap = 6, margin = 8) {
  const viewportWidth = Math.max(0, viewport.width);
  const viewportHeight = Math.max(0, viewport.height);
  const horizontalMargin = Math.min(Math.max(0, margin), viewportWidth / 2);
  const verticalMargin = Math.min(Math.max(0, margin), viewportHeight / 2);
  const minLeft = viewport.left + horizontalMargin;
  const minTop = viewport.top + verticalMargin;
  const maxRight = viewport.left + viewportWidth - horizontalMargin;
  const maxBottom = viewport.top + viewportHeight - verticalMargin;
  const maxWidth = Math.max(0, maxRight - minLeft);
  const maxHeight = Math.max(0, maxBottom - minTop);
  const measuredWidth = Math.max(0, popup.width);
  const measuredHeight = Math.max(0, popup.height);
  const fittedWidth = Math.min(measuredWidth, maxWidth);
  const fittedHeight = Math.min(measuredHeight, maxHeight);
  const spacing = Math.max(0, gap);
  const below = Math.max(0, maxBottom - anchor.bottom - spacing);
  const above = Math.max(0, anchor.top - spacing - minTop);

  const placement = measuredHeight <= below
    ? "bottom"
    : measuredHeight <= above
      ? "top"
      : below >= above ? "bottom" : "top";
  const preferredTop = placement === "bottom"
    ? anchor.bottom + spacing
    : anchor.top - spacing - fittedHeight;

  return {
    left: clamp(anchor.left, minLeft, maxRight - fittedWidth),
    top: clamp(preferredTop, minTop, maxBottom - fittedHeight),
    maxWidth,
    maxHeight,
    placement,
  };
}
