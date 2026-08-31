"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { type Vehicle } from "@/lib/valuation";

export function OfferSection({ v }: { v: Vehicle }) {
  const offers = useStore((s) => s.offers);
  const approvals = useStore((s) => s.approvals);
  const prepareOffer = useStore((s) => s.prepareOffer);
  const createApproval = useStore((s) => s.createApproval);
  const logActivity = useStore((s) => s.logActivity);

  const sent = offers.find((o) => o.vehicleId === v.id && o.status === "SENT");
  const draft = offers.find((o) => o.vehicleId === v.id && o.status === "DRAFT");
  const pending = approvals.find((a) => a.vehicleId === v.id && a.status === "PENDING");

  const [amount, setAmount] = useState<number>(() => Math.round((v.price * 0.92) / 100) * 100);

  if (sent) {
    return (
      <div className="offer-sent">
        ✓ Offer sent — ${sent.amount.toLocaleString()} <span className="mono">({sent.ref})</span>
      </div>
    );
  }

  function submit() {
    if (!Number.isFinite(amount) || amount <= 0) return;
    prepareOffer(v.id, amount);
    const summary = `Send a $${amount.toLocaleString()} offer to the seller of the ${v.year} ${v.make} ${v.model} ${v.trim}`;
    createApproval({ tool: "submit_offer", vehicleId: v.id, amount, summary, riskScore: 78 });
    logActivity({
      tool: "submit_offer",
      detail: `awaiting approval — $${amount.toLocaleString()} offer`,
      riskClass: "OUTREACH_FINANCIAL",
      decision: "APPROVAL",
      riskScore: 78,
    });
  }

  return (
    <div className="offer-box">
      <div className="offer-row">
        <label>Offer amount</label>
        <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>
      {draft && <div className="offer-draft-note">Draft saved: ${draft.amount.toLocaleString()}</div>}
      {pending ? (
        <div className="offer-pending">Awaiting your approval above…</div>
      ) : (
        <button className="btn-submit" onClick={submit}>
          Submit offer (needs approval)
        </button>
      )}
    </div>
  );
}
