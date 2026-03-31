import React from "react";
import type { ShareActionResult } from "../../game/share";

export interface ChallengeShareModalProps {
  open: boolean;
  qrDataUrl?: string;
  shareUrl: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  onCopyLink?: () => void;
  shareFeedback?: ShareActionResult | null;
}

export function ChallengeShareModal({ open, qrDataUrl, shareUrl, title, subtitle, onClose, onCopyLink, shareFeedback }: ChallengeShareModalProps) {
  if (!open) return null;

  const linkCopied = shareFeedback?.action === "challengeLink" && shareFeedback?.tone === "success";
  const feedbackClass = shareFeedback ? `share-feedback is-${shareFeedback.tone}` : "share-feedback is-hint";
  const feedbackText = shareFeedback?.message ?? "复制链接适合发消息，扫码更适合当面一起玩。";

  return (
    <div className="share-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="share-modal" role="dialog" aria-modal="true" aria-label="分享弹层" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-head">
          <div>
            <h3>{title}</h3>
            <p className="share-modal-desc">{subtitle}</p>
          </div>
          <button className="icon-btn share-close-btn" type="button" onClick={onClose} aria-label="关闭分享弹层">X</button>
        </div>

        <div className="share-qr-card">
          {qrDataUrl ? (
            <img className="share-qr-image" src={qrDataUrl} alt="分享二维码" />
          ) : (
            <div className="share-qr-fallback">这条链接有点长，二维码暂时生成失败，请直接复制下方链接。</div>
          )}
        </div>

        <div className="share-link-block">
          <div className="share-link-head">
            <span className="share-link-label">分享链接</span>
            <button
              className={`icon-btn share-copy-icon${linkCopied ? " is-copied" : ""}`}
              type="button"
              onClick={onCopyLink}
              aria-label={linkCopied ? "链接已复制" : "复制分享链接"}
            >
              {linkCopied ? "✓" : "⧉"}
            </button>
          </div>
          <p className="share-link-value">{shareUrl}</p>
        </div>

        <p className={feedbackClass} role="status" aria-live="polite">{feedbackText}</p>
      </section>
    </div>
  );
}
