import { useState, useEffect } from "react";

import API_URL from "../../config";

const FILTERS = [
    { label: "В очікуванні", value: "pending"  },
    { label: "Добавлено",    value: "approved" },
    { label: "Відмінено",    value: "rejected" },
];

function authHeaders() {
    const token = localStorage.getItem("access_token");
    return {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
    };
}

export default function AdminRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [filter, setFilter]     = useState("pending");

    async function fetchRequests() {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/admin/requests?status=${filter}`,
                { headers: authHeaders() },
            );
            if (res.ok) setRequests(await res.json());
        } catch {}
        finally { setLoading(false); }
    }

    useEffect(() => { fetchRequests(); }, [filter]);

    async function handleAction(id, action) {
        try {
            await fetch(`${API_URL}/admin/requests/${id}/${action}`, {
                method:  "POST",
                headers: authHeaders(),
            });
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch {}
    }

    return (
        <div style={s.wrapper}>
            <div style={s.topRow}>
                <p style={s.pageTitle}>Запити на добавлення продуктів</p>
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
            {!loading && requests.length === 0 &&
                <p style={s.msg}>Немає запитів за цим фільтром</p>
            }

            {requests.map(r => (
                <div key={r.id} style={s.card}>
                    <div style={s.cardTop}>
                        {r.image_url
                            ? <img src={r.image_url} alt="" style={s.thumb} />
                            : <div style={s.thumbPh} />
                        }
                        <div style={s.cardBody}>
                            <p style={s.ean}>{r.ean}</p>
                            <p style={s.name}>{r.name ?? "Невідомий продукт"}</p>
                            {r.brand && <p style={s.brand}>{r.brand}</p>}
                        </div>
                    </div>

                    {r.description && (
                        <p style={s.description} title={r.description}>
                            {r.description.length > 120
                                ? r.description.slice(0, 120) + "…"
                                : r.description
                            }
                        </p>
                    )}

                    <p style={s.date}>
                        Запит від {new Date(r.created_at).toLocaleDateString("uk-UA")}
                    </p>

                    {filter === "pending" && (
                        <div style={s.btnRow}>
                            <button style={s.approveBtn} onClick={() => handleAction(r.id, "approve")}>
                                Добавити
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
    cardTop:     { display: "flex", gap: 12, marginBottom: 10 },
    thumb:       { width: 56, height: 56, borderRadius: 8, objectFit: "contain", background: "#1a1a1a", flexShrink: 0 },
    thumbPh:     { width: 56, height: 56, borderRadius: 8, background: "#1a1a1a", flexShrink: 0 },
    cardBody:    { flex: 1, minWidth: 0 },
    ean:         { color: "rgba(255,255,255,0.25)", fontSize: 10, letterSpacing: "0.1em", margin: "0 0 4px" },
    name:        { color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 0 3px" },
    brand:       { color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 },
    description: { color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5, margin: "0 0 8px" },
    date:        { color: "rgba(255,255,255,0.2)", fontSize: 11, margin: "0 0 12px" },
    btnRow:      { display: "flex", gap: 10 },
    approveBtn:  { flex: 1, padding: "10px 0", background: "#00ff88", border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    rejectBtn:   { flex: 1, padding: "10px 0", background: "transparent", border: "1px solid #ff4444", borderRadius: 8, color: "#ff4444", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    statusRow:   { display: "flex" },
    statusBadge: { fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 20 },
    badgeGreen:  { background: "#0a1f14", color: "#00ff88", border: "1px solid #0d3320" },
    badgeRed:    { background: "#1f0a0a", color: "#ff4444", border: "1px solid #3d1010" },
};