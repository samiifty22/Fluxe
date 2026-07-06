import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const T = {
  bg:"#06070F",s1:"#0D0F1E",s2:"#131628",border:"rgba(255,255,255,0.08)",
  primary:"#5B5FED",teal:"#00C896",amber:"#F5A623",rose:"#F43F5E",
  text:"#E2E5F1",muted:"#8B95B8",dim:"#252A45",
};

export const metadata = { title: "Admin — FLUXE" };

function isAdmin(email) {
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

function Kpi({ label, value, color }) {
  return <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px" }}>
    <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
    <div style={{ color, fontSize: 24, fontWeight: 800 }}>{value}</div>
  </div>;
}

function Pill({ label, color, bg }) {
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>{label}</span>;
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin?callbackUrl=/admin");

  if (!isAdmin(session.user.email)) {
    return <div style={{ background: T.bg, color: T.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Not authorized</div>
        <div style={{ color: T.muted, fontSize: 13 }}>Add <code style={{ color: T.teal }}>{session.user.email}</code> to <code style={{ color: T.teal }}>ADMIN_EMAILS</code> in <code style={{ color: T.teal }}>.env.local</code> and restart the server.</div>
      </div>
    </div>;
  }

  const tenants = await prisma.tenant.findMany({
    include: { users: true, billing: true },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();
  const trialActive = t => t.plan === "trial" && t.trialEndsAt && new Date(t.trialEndsAt).getTime() > now;
  const paying = t => t.billing?.status === "active";
  const expired = t => !paying(t) && !trialActive(t);

  const stats = {
    total: tenants.length,
    trials: tenants.filter(trialActive).length,
    paying: tenants.filter(paying).length,
    expired: tenants.filter(expired).length,
  };
  const mrr = tenants.reduce((sum, t) => {
    if (!paying(t)) return sum;
    return sum + (t.billing.plan === "yearly" ? 100 / 12 : t.billing.plan === "monthly" ? 20 : 0);
  }, 0);

  return <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "'Inter',-apple-system,sans-serif" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Admin</div>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>Signed in as {session.user.email}</div>
        </div>
        <a href="/app" style={{ color: T.muted, fontSize: 13, textDecoration: "none" }}>← Back to dashboard</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 28 }}>
        <Kpi label="Total Signups" value={stats.total} color={T.primary} />
        <Kpi label="Active Trials" value={stats.trials} color={T.amber} />
        <Kpi label="Paying Customers" value={stats.paying} color={T.teal} />
        <Kpi label="Expired / Lapsed" value={stats.expired} color={T.rose} />
        <Kpi label="Est. MRR" value={`$${mrr.toFixed(0)}`} color={T.teal} />
      </div>

      <div style={{ background: T.s1, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Tenant", "Owner", "Plan", "Status", "Trial Ends", "Signed Up"].map(h =>
              <th key={h} style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", padding: "10px 16px", textAlign: "left", borderBottom: `1px solid ${T.border}` }}>{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {tenants.length === 0 && <tr><td colSpan={6} style={{ padding: "24px 16px", color: T.muted, textAlign: "center" }}>No signups yet.</td></tr>}
            {tenants.map(t => {
              const owner = t.users.find(u => u.id === t.ownerId) ?? t.users[0];
              const status = paying(t) ? { l: "Paying", c: T.teal, bg: "rgba(0,200,150,.12)" }
                : trialActive(t) ? { l: "Trialing", c: T.amber, bg: "rgba(245,166,35,.12)" }
                : { l: "Expired", c: T.rose, bg: "rgba(244,63,94,.12)" };
              return <tr key={t.id}>
                <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, fontWeight: 600, fontSize: 13 }}>{t.name}</td>
                <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 12 }}>{owner?.email ?? "—"}</td>
                <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 12 }}>{t.billing?.plan ?? t.plan}</td>
                <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}><Pill label={status.l} color={status.c} bg={status.bg} /></td>
                <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 12 }}>{t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "—"}</td>
                <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, color: T.muted, fontSize: 12 }}>{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
