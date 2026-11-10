import React from "react";
import { Cpu } from "lucide-react";

interface SettingsTabAboutProps {
  overlayHotkey: string;
  lockHotkey: string;
}

export const SettingsTabAbout: React.FC<SettingsTabAboutProps> = ({
  overlayHotkey,
  lockHotkey,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 1. Production Core Telemetry & Status */}
      <div className="settings-section-card telemetry-card">
        <div className="settings-card-header">
          <div className="settings-card-icon-wrap" style={{ background: "rgba(56, 189, 248, 0.15)" }}>
            <Cpu size={20} color="#38bdf8" />
          </div>
          <div className="settings-card-title-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="settings-card-title">Production Core Telemetry & Status</div>
              <span className="settings-version-tag">v7.0.0-beta.18 Build</span>
            </div>
            <div className="settings-card-desc">
              Real-time monitoring of Windows WinRT multimedia pipeline and low-latency audio hooks.
            </div>
          </div>
        </div>

        <div className="telemetry-grid">
          <div className="telemetry-item">
            <span className="telemetry-label">App Release</span>
            <span className="telemetry-val" style={{ color: "#38bdf8" }}>MPO-pro v7.0.0-beta.18</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Scrubber Engine</span>
            <span className="telemetry-val" style={{ color: "#34d399" }}>PLL Monotonic (Active)</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Windows WinRT</span>
            <span className="telemetry-val">GSMTC Hooked</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Active Hotkeys</span>
            <span className="telemetry-val">{overlayHotkey} / {lockHotkey}</span>
          </div>
        </div>
      </div>

      {/* 2. Developer & App Information Reference Card (Bilingual Arabic & English) */}
      <div className="credits-bilingual-card">
        <div className="credits-arabic-section">
          <div className="credits-arabic-title">
            MPO-PRO — ميديا بلاير أوفرلاي ستوديو. يعمل بالكامل على جهازك: لا رفع ملفات، لا إنترنت، لا تتبع ولا بطيخ.
          </div>
          <div className="credits-arabic-body">
            الترخيص والمصدر: هذا التطبيق مفتوح المصدر. جميع الحقوق محفوظة.
          </div>
          <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.85)" }}>
            البريد الإلكتروني للتواصل:{" "}
            <a
              href="mailto:mohammed@jadaan.dev"
              style={{ color: "#38bdf8", textDecoration: "underline", direction: "ltr", display: "inline-block" }}
            >
              mohammed@jadaan.dev
            </a>
          </div>
          <div className="credits-arabic-author">
            هذا البرنامج يتم تشغيله وتطويره بواسطة محمد جدعان - Jadaan.Dev
          </div>
        </div>

        {/* Official Ecosystem Links */}
        <div className="credits-ecosystem-links">
          <div className="ecosystem-link-row">
            <span className="ecosystem-link-label">Official Website:</span>
            <a
              href="https://mpopro.notion.site/"
              target="_blank"
              rel="noreferrer"
              className="ecosystem-link-anchor"
            >
              https://mpopro.notion.site/
            </a>
          </div>

          <div className="ecosystem-link-row">
            <span className="ecosystem-link-label">Telegram Channel &amp; Updates:</span>
            <a
              href="https://t.me/mpo_pro"
              target="_blank"
              rel="noreferrer"
              className="ecosystem-link-anchor"
            >
              https://t.me/mpo_pro
            </a>
          </div>

          <div className="ecosystem-link-row">
            <span className="ecosystem-link-label">Developer Hub:</span>
            <a
              href="https://jadaan.dev"
              target="_blank"
              rel="noreferrer"
              className="ecosystem-link-anchor"
            >
              https://jadaan.dev
            </a>
          </div>
        </div>

        <div className="credits-footer-strip">
          <span className="credits-footer-text">
            MPO-pro Studio v7.0.0-beta.18 Build
          </span>
          <span className="credits-footer-release">
            الإصدار: 7.0.0-beta.18
          </span>
        </div>
      </div>
    </div>
  );
};
