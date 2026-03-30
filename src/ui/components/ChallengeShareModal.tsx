import React from "react";

export interface ChallengeShareModalProps {
  open: boolean;
  qrDataUrl?: string;
  shareUrl: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  onCopyLink?: () => void;
  onSystemShare?: () => void;
}

export function ChallengeShareModal({ open, qrDataUrl, shareUrl, title, subtitle, onClose, onCopyLink, onSystemShare }: ChallengeShareModalProps) {
  if (!open) return null;

  return (
    <div className="share-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="share-modal" role="dialog" aria-modal="true" aria-label="分享弹层" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-head">
          <div>
            <h3>{title}</h3>
            <p className="share-modal-desc">{subtitle}</p>
          </div>
          <button className="icon-btn share-close-btn" type="button" onClick={onClose}>关闭</button>
        </div>

        <div className="share-qr-card">
          {qrDataUrl ? (
            <img className="share-qr-image" src={qrDataUrl} alt="分享二维码" />
          ) : (
            <div className="share-qr-fallback">这条链接有点长，二维码暂时生成失败，请直接复制下方链接。</div>
          )}
        </div>

        <div className="share-link-block">
          <span className="share-link-label">分享链接</span>
          <p className="share-link-value">{shareUrl}</p>
        </div>

        <div className="share-modal-actions">
          <button className="secondary-btn share-modal-btn" type="button" onClick={onCopyLink}>复制链接</button>
          <button className="secondary-btn share-modal-btn" type="button" onClick={onSystemShare}>系统分享</button>
          <button className="primary-btn share-modal-btn" type="button" onClick={onClose}>我知道了</button>
        </div>
      </section>
    </div>
  );
}
