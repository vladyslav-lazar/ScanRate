import { useState, useEffect } from "react";

import API_URL from "../../config";

function authHeaders() {
    return { "Authorization": `Bearer ${localStorage.getItem("access_token")}` };
}

function Sparkline({ data, color = "#00ff88", label = "count" }) {
    if (!data || data.length === 0) return <p style={sc.empty}>Даних немає</p>;
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div style={sc.wrap}>
            <div style={sc.bars}>
                {data.map((d, i) => (
                    <div key={i} style={sc.barWrap} title={`${d.date}: ${d.count} ${label}`}>
                        <div style={{ ...sc.bar, height: `${(d.count / max) * 100}%`, background: color }} />
                    </div>
                ))}
            </div>
            <div style={sc.axisRow}>
                <span style={sc.axisLabel}>{data[0]?.date?.slice(5)}</span>
                <span style={sc.axisLabel}>{data[data.length - 1]?.date?.slice(5)}</span>
            </div>
        </div>
    );
}

const sc = {
    wrap:      { width: "100%", marginTop: 8 },
    bars:      { display: "flex", alignItems: "flex-end", height: 60, gap: 2 },
    barWrap:   { flex: 1, height: "100%", display: "flex", alignItems: "flex-end" },
    bar:       { width: "100%", borderRadius: "2px 2px 0 0", minHeight: 2, transition: "height 0.3s" },
    axisRow:   { display: "flex", justifyContent: "space-between", marginTop: 4 },
    axisLabel: { color: "rgba(255,255,255,0.2)", fontSize: 9 },
    empty:     { color: "rgba(255,255,255,0.2)", fontSize: 12, margin: "8px 0 0" },
};

function StatCard({ label, value, sub, accent }) {
    return (
        <div style={s.statCard}>
            <p style={s.statVal}>{value ?? "—"}</p>
            {sub && <p style={{ ...s.statSub, color: accent ?? "rgba(255,255,255,0.3)" }}>{sub}</p>}
            <p style={s.statLabel}>{label}</p>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={s.section}>
            <p style={s.sectionTitle}>{title}</p>
            {children}
        </div>
    );
}

export default function AdminStats() {
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    useEffect(() => {
        fetch(`${API_URL}/admin/stats`, { headers: authHeaders() })
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(data => { setStats(data); setLoading(false); })
            .catch(() => { setError("Не вдалося завантажити статистику."); setLoading(false); });
    }, []);

    if (loading) return <p style={s.msg}>Завантаження…</p>;
    if (error)   return <p style={{ ...s.msg, color: "#ff4444" }}>{error}</p>;

    const reviewStatusColor  = stats.reviews_pending > 0  ? "#f5c518" : "rgba(255,255,255,0.3)";
    const requestStatusColor = stats.requests_pending > 0 ? "#f5c518" : "rgba(255,255,255,0.3)";

    return (
        <div style={s.wrapper}>

            <Section title="Загальна статистика">
                <div style={s.cardGrid}>
                    <StatCard label="Продукти"    value={stats.total_products} />
                    <StatCard label="Користувачі" value={stats.total_users} />
                    <StatCard label="Відгуки"     value={stats.total_reviews} />
                    <StatCard
                        label="Середня оцінка"
                        value={stats.average_rating_overall ? `★ ${stats.average_rating_overall}` : "—"}
                    />
                </div>
            </Section>

            <div style={s.divider} />

            <Section title="Статус відгуків">
                <div style={s.cardGrid}>
                    <StatCard
                        label="Очікують"
                        value={stats.reviews_pending}
                        sub={stats.reviews_pending > 0 ? "Потребують уваги" : null}
                        accent={reviewStatusColor}
                    />
                    <StatCard label="Дозволено" value={stats.reviews_approved}  accent="#00ff88" />
                    <StatCard label="Відхилено" value={stats.reviews_rejected}  accent="#ff4444" />
                </div>
            </Section>

            <div style={s.divider} />

            <Section title="Статус запитів на продукти">
                <div style={s.cardGrid}>
                    <StatCard
                        label="Очікують"
                        value={stats.requests_pending}
                        sub={stats.requests_pending > 0 ? "Потребують уваги" : null}
                        accent={requestStatusColor}
                    />
                    <StatCard label="Дозволено" value={stats.requests_approved} accent="#00ff88" />
                    <StatCard label="Відхилено" value={stats.requests_rejected} accent="#ff4444" />
                </div>
            </Section>

            <div style={s.divider} />

            <Section title="Нові користувачі">
                <Sparkline data={stats.registrations_per_day} color="#00ff88" label="реєстрацій" />
            </Section>

            <div style={s.divider} />

            <Section title="Активність відгуків">
                <Sparkline data={stats.reviews_per_day} color="#f5c518" label="відгуків" />
            </Section>

            <div style={s.divider} />

            <Section title="Топ продукти (мін. 2 відгуки)">
                {stats.top_products.length === 0
                    ? <p style={s.empty}>Ще немає достатньо даних</p>
                    : stats.top_products.map((p, i) => (
                        <div key={p.ean} style={s.listRow}>
                            <span style={s.rank}>#{i + 1}</span>
                            <div style={s.listBody}>
                                <p style={s.listName}>{p.name ?? p.ean}</p>
                                <p style={s.listSub}>{p.ean} · {p.total_ratings} відгуків</p>
                            </div>
                            <span style={s.listRating}>★ {p.average_rating}</span>
                        </div>
                    ))
                }
            </Section>

            <div style={s.divider} />

            <Section title="Найактивніші користувачі">
                {stats.most_active_users.length === 0
                    ? <p style={s.empty}>Ще немає схвалених відгуків</p>
                    : stats.most_active_users.map((u, i) => (
                        <div key={u.email} style={s.listRow}>
                            <span style={s.rank}>#{i + 1}</span>
                            <div style={s.listBody}>
                                <p style={s.listName}>{u.email}</p>
                            </div>
                            <span style={s.listCount}>{u.review_count} відгуків</span>
                        </div>
                    ))
                }
            </Section>

            <div style={{ height: 40 }} />
        </div>
    );
}

const s = {
    wrapper:      { paddingBottom: 20 },
    msg:          { color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: 32, fontSize: 14 },
    section:      { marginBottom: 0 },
    sectionTitle: { color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 12px" },
    divider:      { height: 1, background: "#1a1a1a", margin: "20px 0" },
    empty:        { color: "rgba(255,255,255,0.2)", fontSize: 13, margin: 0 },

    cardGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    statCard:  { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px 14px 12px" },
    statVal:   { color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 2px" },
    statSub:   { fontSize: 11, margin: "0 0 4px" },
    statLabel: { color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 },

    listRow:    { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #1a1a1a" },
    rank:       { color: "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, width: 24, flexShrink: 0 },
    listBody:   { flex: 1, minWidth: 0 },
    listName:   { color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    listSub:    { color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 },
    listRating: { color: "#f5c518", fontSize: 14, fontWeight: 600, flexShrink: 0 },
    listCount:  { color: "rgba(255,255,255,0.4)", fontSize: 12, flexShrink: 0 },
};
