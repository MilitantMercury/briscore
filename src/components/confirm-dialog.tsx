"use client";

import { useEffect, useRef } from "react";

export type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
};

export function ConfirmDialog({ confirmation, onClose }: { confirmation: Confirmation | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirmation && !dialog.current?.open) dialog.current?.showModal();
    if (!confirmation && dialog.current?.open) dialog.current.close();
  }, [confirmation]);

  function cancel() { onClose(); }
  function confirm() {
    confirmation?.onConfirm();
    onClose();
  }

  return (
    <dialog ref={dialog} className="confirm-dialog" onCancel={cancel} onClick={(event) => { if (event.target === dialog.current) cancel(); }}>
      {confirmation && <div className="confirm-card">
        <span className={`confirm-symbol ${confirmation.tone === "danger" ? "danger" : ""}`}>{confirmation.tone === "danger" ? "!" : "✦"}</span>
        <span className="eyebrow">CONFERMA AZIONE</span>
        <h2>{confirmation.title}</h2>
        <p>{confirmation.message}</p>
        <div className="confirm-actions">
          <button className="secondary" onClick={cancel}>Non ora</button>
          <button className={confirmation.tone === "danger" ? "danger-button" : "primary"} onClick={confirm}>{confirmation.confirmLabel}</button>
        </div>
      </div>}
    </dialog>
  );
}
