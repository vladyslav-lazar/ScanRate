import { useState, useEffect } from "react";

import API_URL from "../../config";

const FILTERS = [
    { label: "В очікуванні", value: "pending"  },
    { label: "Дозволено",    value: "approved" },
    { label: "Відмінено",    value: "rejected" },
];

function authHeaders() {
    const token = localStorage.getItem("access_token");
    return {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
    };
}

export default function AdminReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter]   = useState("pending");

    async function fetchReviews() {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/admin/reviews?status=${filter}`,
                { headers: authHeaders() },
            );
            if (res.ok) setReviews(await res.json());
        } catch {}
        finally { setLoading(false); }
    }

    useEffect(() => { fetchReviews(); }, [filter]);

    async function handleAction(id, action) {
        try {
            await fetch(`${API_URL}/admin/reviews/${id}/${action}`, {
                method:  "POST",
                headers: authHeaders(),
            });
            setReviews(prev => prev.filter(r => r.id !== id));
        } catch {}
    }

    const stars = (score) => "★".repeat(score) + "☆".repeat(5 - score);

    return (
        <div style={s.wrapper}>
            <div style={s.topRow}>
                <p style={s.pageTitle}>Відгуки</p>
                <div style={s.filterRow}>
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            style={{ ...s.filterBtn, ...(filter === f.value ? s.filterActive : {}) }}
                            onClick={() => setFilter(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading && <p style={s.msg}>Завантаження…</p>}
            {!loading && reviews.length === 0 &&
                <p style={s.msg}>Немає відгуків за цим фільтром</p>
            }

            {reviews.map(r => (
                <div key={r.id} style={s.card}>
                    <div style={s.cardTop}>
                        <div>
                            <p style={s.ean}>{r.product_ean}</p>
                            <p style={s.productName}>{r.product_name ?? "Невідомий продукт"}</p>
                        </div>
                        <span style={s.stars}>{stars(r.score)}</span>
                    </div>

                    {r.comment && <p style={s.comment}>"{r.comment}"</p>}

                    <p style={s.date}>{new Date(r.created_at).toLocaleDateString("uk-UA")}</p>

                    {filter === "pending" && (
                        <div style={s.btnRow}>
                            <button style={s.approveBtn} onClick={() => handleAction(r.id, "approve")}>
                                Дозволити
                            </button>
                            <button style={s.rejectBtn} onClick={() => handleAction(r.id, "reject")}>
                                Відмовити
                            </button>
                        </div>
                    )}

                    {filter !== "pending" && (
                        <div style={s.statusRow}>
                            <span style={{ ...s.statusBadge, ...(filter === "approved" ? s.badgeGreen : s.badgeRed) }}>
                                {FILTERS.find(f => f.value === filter)?.label}
                            </span>
                        </div>
                    )}
                </div>
            ))}

            <div style={{ height: 40 }} />
        </div>
    );
}

const s = {
    wrapper:     { paddingBottom: 20 },
    topRow:      { marginBottom: 16 },
    pageTitle:   { color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 12px" },
    filterRow:   { display: "flex", gap: 8 },
    filterBtn:   { padding: "6px 14px", background: "#0d0d0d", border: "1px solid #222", borderRadius: 20, color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
    filterActive:{ background: "#0a1f14", border: "1px solid #00ff88", color: "#00ff88" },
    msg:         { color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", paddingTop: 32 },
    card:        { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px", marginBottom: 12 },
    cardTop:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
    ean:         { color: "rgba(255,255,255,0.25)", fontSize: 10, letterSpacing: "0.1em", margin: "0 0 3px" },
    productName: { color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 },
    stars:       { color: "#f5c518", fontSize: 13, letterSpacing: 1, flexShrink: 0 },
    comment:     { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.6, margin: "0 0 8px", fontStyle: "italic" },
    date:        { color: "rgba(255,255,255,0.2)", fontSize: 11, margin: "0 0 12px" },
    btnRow:      { display: "flex", gap: 10 },
    approveBtn:  { flex: 1, padding: "10px 0", background: "#00ff88", border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    rejectBtn:   { flex: 1, padding: "10px 0", background: "transparent", border: "1px solid #ff4444", borderRadius: 8, color: "#ff4444", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    statusRow:   { display: "flex" },
    statusBadge: { fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 20 },
    badgeGreen:  { background: "#0a1f14", color: "#00ff88", border: "1px solid #0d3320" },
    badgeRed:    { background: "#1f0a0a", color: "#ff4444", border: "1px solid #3d1010" },
};