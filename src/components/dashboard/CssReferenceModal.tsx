import React, { useState } from "react";
import { 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  Code2, 
  Search
} from "lucide-react";

interface CssReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectorDoc {
  selector: string;
  category: "structure" | "typography" | "media" | "progress" | "state" | "variables";
  description: string;
  example: string;
}

const CSS_SELECTORS: SelectorDoc[] = [
  // Structure & Containers
  {
    selector: ".mpo-theme-container",
    category: "structure",
    description: "Root wrapper around the active theme. Responsive to scale and layout modes.",
    example: ".mpo-theme-container { margin: 12px; transition: all 0.3s ease; }",
  },
  {
    selector: ".mpo-card",
    category: "structure",
    description: "Primary frosted glass or solid container card enclosing all overlay elements.",
    example: ".mpo-card {\n  background: rgba(15, 23, 42, 0.75) !important;\n  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);\n  border: 1px solid rgba(255, 255, 255, 0.12);\n}",
  },
  {
    selector: ".horizontal-mode / .vertical-mode",
    category: "structure",
    description: "Applied to container for format-specific styling (16:9 OBS vs 9:16 TikTok).",
    example: ".vertical-mode .mpo-card {\n  flex-direction: column !important;\n  border-radius: 28px;\n}",
  },

  // Typography
  {
    selector: ".mpo-title",
    category: "typography",
    description: "Track title text container. Supports custom fonts, gradients, and animations.",
    example: ".mpo-title {\n  font-family: 'Outfit', sans-serif !important;\n  font-weight: 800 !important;\n  letter-spacing: -0.5px;\n  background: linear-gradient(90deg, #fff, #38bdf8);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}",
  },
  {
    selector: ".mpo-artist",
    category: "typography",
    description: "Artist name element displayed below the track title.",
    example: ".mpo-artist {\n  color: #94a3b8 !important;\n  font-size: 13px;\n  text-transform: uppercase;\n  letter-spacing: 1px;\n}",
  },
  {
    selector: ".mpo-album",
    category: "typography",
    description: "Album subtitle or release collection title.",
    example: ".mpo-album {\n  font-style: italic;\n  opacity: 0.75;\n}",
  },

  // Media & Visuals
  {
    selector: ".mpo-art",
    category: "media",
    description: "Album jacket thumbnail image wrapper. Supports spinning vinyl, 3D tilt, and borders.",
    example: ".mpo-art {\n  border-radius: 16px !important;\n  box-shadow: 0 10px 25px rgba(0, 240, 255, 0.3) !important;\n  border: 2px solid #00f0ff !important;\n}",
  },
  {
    selector: ".mpo-art-img",
    category: "media",
    description: "Actual HTML <img> element displaying the fetched album cover.",
    example: ".mpo-art-img {\n  object-fit: cover;\n  filter: saturate(1.2) contrast(1.05);\n}",
  },
  {
    selector: ".mpo-visualizer",
    category: "media",
    description: "Container for dynamic audio equalizer bars.",
    example: ".mpo-visualizer {\n  gap: 3px;\n  align-items: flex-end;\n}",
  },
  {
    selector: ".mpo-vis-bar",
    category: "media",
    description: "Individual equalizer animated bar reacting to playback state.",
    example: ".mpo-vis-bar {\n  background: linear-gradient(to top, #6366f1, #00f0ff) !important;\n  border-radius: 4px;\n}",
  },

  // Progress Bar
  {
    selector: ".mpo-progress",
    category: "progress",
    description: "Song playback duration and progress container.",
    example: ".mpo-progress { margin-top: 8px; }",
  },
  {
    selector: ".mpo-progress-track",
    category: "progress",
    description: "Background track for elapsed song timeline.",
    example: ".mpo-progress-track {\n  height: 4px !important;\n  background: rgba(255, 255, 255, 0.1) !important;\n  border-radius: 999px;\n}",
  },
  {
    selector: ".mpo-progress-fill",
    category: "progress",
    description: "Active animated fill indicator showing song playback position.",
    example: ".mpo-progress-fill {\n  background: linear-gradient(90deg, #6366f1, #00f0ff) !important;\n  box-shadow: 0 0 12px rgba(0, 240, 255, 0.6);\n}",
  },
  {
    selector: ".mpo-badge",
    category: "state",
    description: "Media source indicator pill (e.g. Spotify, Apple Music, YouTube).",
    example: ".mpo-badge {\n  background: rgba(16, 185, 129, 0.15) !important;\n  color: #10b981 !important;\n  font-weight: 700;\n}",
  },

  // CSS Custom Properties (Variables)
  {
    selector: "var(--accent-primary)",
    category: "variables",
    description: "Dynamic accent color (or auto-extracted album color when mimic is enabled).",
    example: "color: var(--accent-primary); border-color: var(--accent-primary);",
  },
  {
    selector: "var(--card-blur)",
    category: "variables",
    description: "Backdrop blur value configured by the user in pixels (e.g. 20px).",
    example: "backdrop-filter: blur(var(--card-blur));",
  },
  {
    selector: "var(--card-opacity)",
    category: "variables",
    description: "Active card background opacity ratio (0.0 to 1.0).",
    example: "opacity: var(--card-opacity);",
  },
  {
    selector: "var(--card-radius)",
    category: "variables",
    description: "Border radius configured for overlay cards (e.g. 18px).",
    example: "border-radius: var(--card-radius);",
  },
];

export const CssReferenceModal: React.FC<CssReferenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [copiedLlm, setCopiedLlm] = useState(false);

  if (!isOpen) return null;

  const filtered = CSS_SELECTORS.filter((item) => {
    const matchesSearch =
      item.selector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleCopy = (text: string, targetId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTarget(targetId);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  const handleCopyLlmPrompt = () => {
    const promptContent = `You are a CSS designer specialized in OBS, Twitch, and TikTok livestream overlays.
Here is the complete CSS Class Reference, Custom Properties, and DOM structure for MPO-pro (Media Player Overlay):

### Core CSS Classes & Selectors:
- \`.mpo-theme-container\`: Root overlay container element.
- \`.mpo-card\`: Main overlay card/frame box.
- \`.mpo-art\`: Album artwork container wrapper.
- \`.mpo-art-img\`: Album cover \`<img>\` element.
- \`.mpo-title\`: Song title text.
- \`.mpo-artist\`: Artist name text.
- \`.mpo-album\`: Album / collection subtitle.
- \`.mpo-progress\`: Playback timeline bar container.
- \`.mpo-progress-track\`: Background track.
- \`.mpo-progress-fill\`: Animated timeline fill bar.
- \`.mpo-times\`: Elapsed & total song duration timestamps.
- \`.mpo-badge\`: Media source status badge (Spotify, YouTube, etc.).
- \`.mpo-visualizer\`: Audio equalizer bars container.
- \`.mpo-vis-bar\`: Individual equalizer bars.

### Format & State Modifiers:
- \`.horizontal-mode\`: Applied during 16:9 OBS / Twitch landscape streaming.
- \`.vertical-mode\`: Applied during 9:16 TikTok Live Studio vertical streaming.
- \`.playing\` / \`.paused\`: Dynamic playback state.

### CSS Custom Properties:
- \`var(--accent-primary)\`: Active accent color or auto-extracted album color.
- \`var(--card-blur)\`: Backdrop blur amount (e.g. 20px).
- \`var(--card-opacity)\`: Card opacity ratio (0.0 to 1.0).
- \`var(--card-radius)\`: Card corner radius (e.g. 18px).

### Request:
Please write clean, modern, high-performance CSS styles targeting the above classes to achieve the following aesthetic:
[Describe your desired visual style here, e.g. Cyberpunk Neon Hologram, Minimal Japanese Glass, Retro Cyber Synthwave]`;

    navigator.clipboard.writeText(promptContent);
    setCopiedLlm(true);
    setTimeout(() => setCopiedLlm(false), 2500);
  };

  return (
    <div className="css-reference-backdrop" onClick={onClose}>
      <div className="css-reference-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="css-modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Code2 size={18} color="#00f0ff" />
            </div>
            <div>
              <h3 className="modal-title">CSS Class Target Reference</h3>
              <p className="modal-subtitle">
                Complete selector guide for crafting custom styles and animations in MPO-pro.
              </p>
            </div>
          </div>

          <div className="modal-header-actions">
            {/* Copy LLM Prompt Button */}
            <button
              onClick={handleCopyLlmPrompt}
              className={`css-action-pill llm-pill ${copiedLlm ? "copied" : ""}`}
              title="Copy complete CSS reference formatted as a prompt for ChatGPT / Claude"
            >
              {copiedLlm ? <Check size={13} color="#10b981" /> : <Sparkles size={13} />}
              <span>{copiedLlm ? "Copied Prompt for LLM!" : "Copy for LLM (ChatGPT/Claude)"}</span>
            </button>

            <button onClick={onClose} className="modal-close-btn" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="css-modal-toolbar">
          <div className="css-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search selector, property, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="css-cat-pills">
            {["all", "structure", "typography", "media", "progress", "variables"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`css-cat-btn ${activeCategory === cat ? "active" : ""}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Selector List */}
        <div className="css-selectors-scroll">
          {filtered.map((item, idx) => {
            const isCopied = copiedTarget === item.selector;

            return (
              <div key={idx} className="css-selector-card">
                <div className="selector-card-header">
                  <div className="selector-name-wrap">
                    <code className="selector-code">{item.selector}</code>
                    <span className={`selector-cat-badge ${item.category}`}>{item.category}</span>
                  </div>

                  <button
                    onClick={() => handleCopy(item.example, item.selector)}
                    className="copy-snippet-btn"
                    title="Copy CSS example snippet"
                  >
                    {isCopied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{isCopied ? "Copied Snippet" : "Copy CSS"}</span>
                  </button>
                </div>

                <p className="selector-desc">{item.description}</p>

                <div className="selector-example-box">
                  <pre>{item.example}</pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CssReferenceModal;
