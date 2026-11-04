import assert from "node:assert/strict";
import { getPopoverPosition } from "../src/components/common/popoverPosition.mjs";

const viewport = { left: 0, top: 0, width: 1024, height: 768 };
const popup = { width: 272, height: 360 };
const anchor = { left: 100, right: 140, top: 100, bottom: 120 };

function assertInside(position, size, bounds, margin = 8) {
  const xMargin = Math.min(Math.max(0, margin), bounds.width / 2);
  const yMargin = Math.min(Math.max(0, margin), bounds.height / 2);
  assert.ok(position.left >= bounds.left + xMargin);
  assert.ok(position.top >= bounds.top + yMargin);
  assert.ok(position.left + Math.min(size.width, position.maxWidth) <= bounds.left + bounds.width - xMargin);
  assert.ok(position.top + Math.min(size.height, position.maxHeight) <= bounds.top + bounds.height - yMargin);
  assert.equal(position.maxWidth, Math.max(0, bounds.width - 2 * xMargin));
  assert.equal(position.maxHeight, Math.max(0, bounds.height - 2 * yMargin));
}

const below = getPopoverPosition(anchor, popup, viewport);
assert.deepEqual(below, { left: 100, top: 126, maxWidth: 1008, maxHeight: 752, placement: "bottom" });

const above = getPopoverPosition({ left: 100, right: 140, top: 730, bottom: 750 }, popup, viewport);
assert.equal(above.placement, "top");
assert.equal(above.top, 364);

const right = getPopoverPosition({ left: 980, right: 1020, top: 100, bottom: 120 }, popup, viewport);
assert.equal(right.left, 744);
assertInside(right, popup, viewport);

for (const edgeAnchor of [
  { left: -30, right: 10, top: 100, bottom: 120 },
  { left: 100, right: 140, top: -30, bottom: -10 },
  { left: 100, right: 140, top: 800, bottom: 820 },
  { left: 1100, right: 1140, top: 100, bottom: 120 },
  { left: -500, right: -460, top: -500, bottom: -480 },
  { left: 1400, right: 1440, top: 1400, bottom: 1420 },
]) assertInside(getPopoverPosition(edgeAnchor, popup, viewport), popup, viewport);

const topEdge = getPopoverPosition({ left: 0, right: 40, top: 0, bottom: 20 }, popup, viewport);
assert.equal(topEdge.left, 8);
assert.equal(topEdge.placement, "bottom");
assert.equal(topEdge.top, 26);

const narrowViewport = { ...viewport, width: 120 };
const narrow = getPopoverPosition(anchor, popup, narrowViewport);
assert.equal(narrow.left, 8);
assert.equal(narrow.maxWidth, 104);
assertInside(narrow, popup, narrowViewport);

const shortViewport = { ...viewport, height: 200 };
const short = getPopoverPosition(anchor, popup, shortViewport);
assert.equal(short.top, 8);
assert.equal(short.maxHeight, 184, "Use the full viewport for scrolling when neither side fits");
assertInside(short, popup, shortViewport);

const neitherSideFits = getPopoverPosition(
  { left: 100, right: 140, top: 200, bottom: 220 },
  popup,
  { ...viewport, height: 500 },
);
assert.equal(neitherSideFits.placement, "bottom", "Prefer the larger side when neither side fits");
assert.equal(neitherSideFits.top, 132, "Shift the whole popup inside the viewport");
assert.equal(neitherSideFits.maxHeight, 484);

const shiftedViewport = { left: 50, top: 90, width: 400, height: 550 };
const shifted = getPopoverPosition({ left: 400, right: 440, top: 520, bottom: 540 }, popup, shiftedViewport);
assert.equal(shifted.left, 170);
assert.equal(shifted.top, 154);
assert.equal(shifted.placement, "top");
assertInside(shifted, popup, shiftedViewport);

const oversized = { width: 1500, height: 2000 };
const constrained = getPopoverPosition(anchor, oversized, viewport);
assert.equal(constrained.left, 8);
assert.equal(constrained.top, 8);
assertInside(constrained, oversized, viewport);

for (const tinyViewport of [
  { left: 0, top: 0, width: 10, height: 12 },
  { left: 25, top: 30, width: 0, height: 0 },
]) assertInside(getPopoverPosition(anchor, popup, tinyViewport), popup, tinyViewport);

const resizeAnchor = { left: 700, right: 740, top: 500, bottom: 520 };
const original = getPopoverPosition(resizeAnchor, popup, viewport);
const resizedViewport = { left: 20, top: 40, width: 640, height: 420 };
const resized = getPopoverPosition(resizeAnchor, popup, resizedViewport);
assert.notEqual(resized.left, original.left);
assert.notEqual(resized.top, original.top);
assertInside(resized, popup, resizedViewport);

const customSpacing = getPopoverPosition(anchor, popup, viewport, 10, 20);
assert.equal(customSpacing.top, 130);
assert.equal(customSpacing.maxWidth, 984);
assertInside(customSpacing, popup, viewport, 20);

console.log("Popover geometry: edges, flipping, constrained viewports, viewport offsets, oversized content and resize OK");
