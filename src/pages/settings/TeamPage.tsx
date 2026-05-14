export default function TeamPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720 }}>
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.25rem" }}>
          Team
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
          Manage your team members and their access.
        </p>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Members
          </span>
          <button style={{ fontSize: "0.8125rem", padding: "0.35rem 0.9rem", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            + Invite
          </button>
        </div>

        {[
          { name: "Alice Johnson", email: "alice@example.com", role: "Owner" },
          { name: "Bob Smith", email: "bob@example.com", role: "Manager" },
          { name: "Carol White", email: "carol@example.com", role: "Cleaner" },
        ].map((member) => (
          <div
            key={member.email}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-light, #e8f0fe)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--accent)", fontSize: "0.9rem" }}>
                {member.name[0]}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{member.name}</p>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.8rem" }}>{member.email}</p>
              </div>
            </div>
            <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.65rem", borderRadius: 20, background: "var(--bg-muted, #f0f0f0)", color: "var(--text-secondary)" }}>
              {member.role}
            </span>
          </div>
        ))}

        <div style={{ padding: "0.75rem 1.25rem" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>3 members · 0 pending invitations</p>
        </div>
      </div>
    </div>
  );
}
