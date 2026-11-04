import React, { useState } from "react";
import { Code2, RotateCcw, Copy, Check, Info } from "lucide-react";
import { ThemeId } from "../../types/themes";
import { THEME_REGISTRY } from "../../themes/ThemeRegistry";

interface CssEditorProps {
  currentTheme: ThemeId;
  customCss: string;
  onCssChange: (newCss: string) => void;
  onResetCss: () => void;
}

export const CssEditor: React.FC<CssEditorProps> = ({
  currentTheme,
  customCss,
  onCssChange,
  onResetCss,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const themeMeta = THEME_REGISTRY[currentTheme];

  const handleCopyObsCss = () => {
    const obsCss = `/* MPO-pro Custom CSS for OBS Browser Source */
body {
  background-color: rgba(0, 0, 0, 0) !important;
  margin: 0px auto;
  overflow: hidden;
}

${customCss}
`;
    navigator.clipboard.writeText(obsCss);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="css-editor-container">
      <div className="css-editor-header">
        <div className="css-header-left">
          <Code2 size={18} color="var(--accent-primary)" />
          <div>
            <div className="css-title">
              Custom CSS Studio — <span>{themeMeta?.name || currentTheme}</span>
            </div>
            <div className="css-subtitle">
              Inject custom styling rules applied live to the desktop HUD and OBS browser sources.
            </div>
          </div>
        </div>

        <div className="css-actions">
          <button
            onClick={onResetCss}
            className="action-btn secondary"
            title="Reset to default theme CSS"
          >
            <RotateCcw size={14} />
            <span>Reset CSS</span>
          </button>

          <button
            onClick={handleCopyObsCss}
            className="action-btn primary"
            title="Copy formatted CSS directly for OBS Studio Browser Source"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied for OBS!" : "Copy for OBS"}</span>
          </button>
        </div>
      </div>

      {/* Editor Box */}
      <div className="code-editor-box">
        <textarea
          value={customCss}
          onChange={(e) => onCssChange(e.target.value)}
          placeholder="/* Enter custom CSS rules here... */"
          className="css-textarea"
          spellCheck={false}
        />
      </div>

      {/* Helper documentation box */}
      <div className="css-help-card">
        <Info size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div className="css-help-text">
          <strong>CSS Class Target Reference:</strong>
          <ul>
            <li><code>.mpo-theme-container</code> — Root positioning container</li>
            <li><code>.glass-card, .cyber-card, .pill-card, .vinyl-card, .cassette-body, .streamer-card</code> — Theme main body card</li>
            <li><code>.glass-title, .cyber-title, .pill-title, .vinyl-title, .cassette-title, .streamer-title</code> — Song title element</li>
            <li><code>.glass-artist, .cyber-artist, .pill-artist, .vinyl-artist, .cassette-artist, .streamer-artist</code> — Artist & Album line</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
