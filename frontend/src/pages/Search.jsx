import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import API_URL from "../config";

export default function Search() {
    const navigate = useNavigate();
    const [query, setQuery]     = useState("");
    const [error, setError]     = useState(null);
    const [loading, setLoading] = useState(false);
    const [recent, setRecent]   = useState([]);
    const [top, setTop]         = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/products/recent`).then(r => r.json()).then(setRecent).catch(() => {});
        fetch(`${API_URL}/products/top`).then(r => r.json()).then(setTop).catch(() => {});
    }, []);

    async function handleSearch() {
        const ean = query.trim();
        if (!ean) return;
        setError(null);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/product/search/${ean}`);
            if (res.status === 404) { setError("Продукт не було знайдено. Будьте першими хто його відсканує!"); return; }
            if (!res.ok) throw new Error();
            navigate(`/product/${ean}`);
        } catch {
            setError("Помилка пошуку на стороні сервера.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={s.wrapper}>
            {/* Search input */}
            <div style={s.searchSection}>
                <p style={s.sectionTitle}>Пошук за штрихкодом формату EAN-13</p>
                <div style={s.inputRow}>
                    <input
                        style={s.input}
                        placeholder="4820024790022"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                        inputMode="numeric"
                        maxLength={13}
                        autoFocus
                    />
                    <button
                        style={{ ...s.btn, ...(loading ? s.btnDis : {}) }}
                        onClick={handleSearch}
                        disabled={loading}
                    >
                        {loading ? "…" : "Пошук"}
                    </button>
                </div>
                {error && <p style={s.error}>{error}</p>}
            </div>

            <div style={s.divider} />

            {/* Recently scanned */}
            <div style={s.section}>
                <p style={s.sectionTitle}>Нещодавно відскановані</p>
                {recent.length === 0
                    ? <p style={s.empty}>Ще не було відскановано жодного продукту.</p>
                    : recent.map(p => (
                        <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.ean}`)} />
                    ))
                }
            </div>

            <div style={s.divider} />

            {/* Top rated */}
            <div style={s.section}>
                <p style={s.sectionTitle}>Найвищий рейтинг</p>
                {top.length === 0
                    ? <p style={s.empty}>Ще не було оцінено жодного продукту.</p>
                    : top.map(p => (
                        <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.ean}`)} />
                    ))
                }
            </div>

            <div style={{ height: 100 }} />
        </div>
    );
}

function ProductCard({ product, onClick }) {
    return (
        <div style={c.card} onClick={onClick}>
            {product.image_url
                ? <img src={product.image_url} alt="" style={c.thumb} />
                : <div style={c.thumbPh} />
            }
            <div style={c.body}>
                <p style={c.name}>{product.name ?? "Невідомий продукт"}</p>
                <p style={c.brand}>{product.brand ?? product.ean}</p>
            </div>
            {product.average_rating &&
                <span style={c.rating}>★ {product.average_rating}</span>
            }
        </div>
    );
}

const s = {
    wrapper:      { position: "fixed", inset: 0, background: "#000", overflowY: "auto", fontFamily: "'Helvetica Neue', sans-serif", paddingBottom: 68 },
    searchSection:{ padding: "52px 20px 20px" },
    sectionTitle: { color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 12px" },
    inputRow:     { display: "flex", gap: 10 },
    input:        { flex: 1, padding: "14px 16px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", fontSize: 16, outline: "none", fontFamily: "inherit" },
    btn:          { padding: "14px 20px", background: "#00ff88", border: "none", borderRadius: 12, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" },
    btnDis:       { background: "#1a1a1a", color: "rgba(255,255,255,0.2)", cursor: "default" },
    error:        { color: "#ff4444", fontSize: 13, margin: "10px 0 0" },
    divider:      { height: 1, background: "#1a1a1a", margin: "0 20px" },
    section:      { padding: "20px 20px 0" },
    empty:        { color: "rgba(255,255,255,0.2)", fontSize: 13, textAlign: "center", padding: "12px 0" },
};

const c = {
    card:    { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 },
    thumb:   { width: 48, height: 48, borderRadius: 8, objectFit: "contain", background: "#1a1a1a", flexShrink: 0 },
    thumbPh: { width: 48, height: 48, borderRadius: 8, background: "#1a1a1a", flexShrink: 0 },
    body:    { flex: 1, minWidth: 0 },
    name:    { color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    brand:   { color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 },
    rating:  { color: "#f5c518", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 },
};