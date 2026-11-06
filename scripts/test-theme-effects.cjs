const assert = require("node:assert/strict");
const path = require("node:path");
const esbuild = require("esbuild");

const listeners = () => {
  const handlers = new Map();
  return {
    addEventListener(name, callback) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(callback); },
    removeEventListener(name, callback) { handlers.get(name)?.delete(callback); },
    dispatch(name) { for (const callback of handlers.get(name) || []) callback(); },
    count(name) { return handlers.get(name)?.size || 0; },
  };
};
const root = (width, height, nominal = true) => ({
  offsetWidth: width, offsetHeight: height, scrollWidth: width * 2, scrollHeight: height * 2,
  hasAttribute(name) { return nominal && name === "data-theme-layout-root"; },
});

(async () => {
  const saved = new Map(["window", "document", "ResizeObserver", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"].map(name => [name, global[name]]));
  const effects = [], resizeObservers = [], mutations = [], frames = new Map();
  let frameId = 0, measured, queries = 0;
  let currentRoot = root(640, 180);
  const inner = { querySelector() { queries++; return currentRoot; } };
  global.window = listeners();
  global.document = listeners();
  global.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.observed = new Set(); resizeObservers.push(this); }
    observe(target) { this.observed.add(target); }
    unobserve(target) { this.observed.delete(target); }
    disconnect() { this.observed.clear(); }
  };
  global.MutationObserver = class {
    constructor(callback) { this.callback = callback; mutations.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  global.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  global.cancelAnimationFrame = id => frames.delete(id);
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); };

  try {
    const output = await esbuild.build({
      stdin: { contents: 'export { ThemeEffectBoundary } from "./src/components/common/ThemeEffectBoundary"; export { themeLayoutSize, themeEffectSize } from "./src/utils/themeEffects";', resolveDir: path.resolve(__dirname, ".."), loader: "tsx" },
      bundle: true, platform: "node", format: "cjs", write: false, packages: "external", loader: { ".css": "empty" },
    });
    const mod = { exports: {} };
    const testRequire = name => name === "react" ? {
      useEffect(callback) { effects.push(callback); },
      useLayoutEffect(callback) { effects.push(callback); },
      useRef() { return { current: inner }; },
      useState() { return [null, update => { measured = typeof update === "function" ? update(measured) : update; }]; },
    } : name === "react/jsx-runtime" ? { jsx() {}, jsxs() {} } : require(name);
    new Function("require", "module", "exports", output.outputFiles[0].text)(testRequire, mod, mod.exports);
    const { ThemeEffectBoundary, themeLayoutSize, themeEffectSize } = mod.exports;

    assert.deepEqual(themeLayoutSize(currentRoot), { width: 640, height: 180 }, "Percentage SDK canvas must ignore transformed descendant scroll overflow");
    assert.deepEqual(themeLayoutSize(root(480, 146, false)), { width: 960, height: 292 }, "Legacy unbounded roots retain their overflow dimensions");
    ThemeEffectBoundary({ children: null, configScale: 1.5 });
    const cleanup = effects[0]();
    assert.deepEqual(measured, { width: 960, height: 270 });
    assert.deepEqual(themeEffectSize(640, 180, 1.5), { width: 1056, height: 366 });

    const oldRoot = currentRoot;
    currentRoot = root(400, 220);
    mutations[0].callback();
    window.dispatch("resize");
    document.dispatch("visibilitychange");
    assert.equal(frames.size, 1, "Resize and root changes must share one measurement frame");
    const queriesBefore = queries;
    flush();
    assert.equal(queries, queriesBefore + 1);
    assert.deepEqual(measured, { width: 600, height: 330 }, "Replacing a theme without replacing the boundary must resize the native content surface");
    assert.ok(!resizeObservers[0].observed.has(oldRoot));
    assert.ok(resizeObservers[0].observed.has(currentRoot));

    window.dispatch("resize");
    cleanup();
    assert.equal(frames.size, 0);
    assert.equal(resizeObservers[0].observed.size, 0);
    assert.ok(mutations[0].disconnected);
    assert.equal(window.count("resize"), 0);
    assert.equal(document.count("visibilitychange"), 0);
    console.log("Theme effect bounds: nominal SDK canvases, scaled gutters, root replacement, resize coalescing and observer cleanup OK");
  } finally {
    for (const [name, value] of saved) { if (value === undefined) delete global[name]; else global[name] = value; }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
