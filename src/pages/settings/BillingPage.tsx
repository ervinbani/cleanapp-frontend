export default function BillingPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720 }}>
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.25rem" }}>
          Billing
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
          Manage your subscription and payment details.
        </p>
      </div>

      {/* Current Plan */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "1.25rem" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
          Current Plan
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>Pro Plan</p>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>$49 / month · Renews June 13, 2026</p>
          </div>
          <button style={{ fontSize: "0.8125rem", padding: "0.4rem 1rem", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>
            Change Plan
          </button>
        </div>
      </div>

      {/* Payment Method */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "1.25rem" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
          Payment Method
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.4rem" }}>💳</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>Visa ending in 4242</p>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.8rem" }}>Expires 08 / 2028</p>
            </div>
          </div>
          <button style={{ fontSize: "0.8125rem", padding: "0.4rem 1rem", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>
            Update
          </button>
        </div>
      </div>

      {/* Billing History */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0, padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          Billing History
        </p>
        {[
          { date: "May 13, 2026", amount: "$49.00", status: "Paid" },
          { date: "Apr 13, 2026", amount: "$49.00", status: "Paid" },
          { date: "Mar 13, 2026", amount: "$49.00", status: "Paid" },
        ].map((invoice) => (
          <div key={invoice.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}>{invoice.date}</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>{invoice.amount}</span>
            <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.65rem", borderRadius: 20, background: "#d1fae5", color: "#065f46" }}>{invoice.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
