import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import API_URL from "../config";

const injectStyles = () => {
    if (document.getElementById("product-styles")) return;
    const t = document.createElement("style");
    t.id = "product-styles";
    t.textContent = `
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .product-fade { animation: fadeUp 0.35s ease forwards; }
        .tab-btn { transition: color 0.15s, border-color 0.15s; }
        .star-btn:active { transform: scale(0.9); }
    `;
    document.head.appendChild(t);
};

export default function Product() {
    const { ean }  = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [product, setProduct]   = useState(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [tab, setTab]           = useState("info");
    const [selected, setSelected] = useState(null);
    const [comment, setComment]   = useState("");
    const [rated, setRated]       = useState(false);

    useEffect(() => { injectStyles(); }, []);

    useEffect(() => {
        fetch(`${API_URL}/product/${ean}`)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(data => { setProduct(data); setLoading(false); })
            .catch(() => { setError("Помилка завантаження продукту."); setLoading(false); });
    }, [ean]);

    async function handleRate() {
        if (!selected) return;
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_URL}/product/${ean}/rate`, {
                method:  "POST",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ score: selected, comment: comment.trim() || null }),
            });
            if (res.status === 409) {
                setError("Ви вже оцінили цей продукт.");
                return;
            }
            if (!res.ok) throw new Error();
            setProduct(await res.json());
            setRated(true);
        } catch {
            setError("Помилка створення відгуку на цей продукт.");
        }
    }

    if (loading) return <div style={s.wrapper}><p style={s.centerText}>Loading…</p></div>;
    if (error && !product) return <div style={s.wrapper}><p style={{ ...s.centerText, color: "#ff4444" }}>{error}</p></div>;

    const stars = (score) => "★".repeat(score) + "☆".repeat(5 - score);

    return (
        <div style={s.wrapper} className="product-fade">

            {/* Header - name above image */}
            <div style={s.headerWrap}>
                <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>

                {product.brand && <p style={s.brand}>{product.brand}</p>}
                <h1 style={s.name}>{product.name ?? "Невідомий продукт"}</h1>
                <p style={s.ean}>{ean}</p>

                <div style={s.statsRow}>
                    <div style={s.stat}>
                        <span style={s.statVal}>{product.average_rating ? `★ ${product.average_rating}` : "—"}</span>
                        <span style={s.statLbl}>Рейтинг</span>
                    </div>
                    <div style={s.statDivider} />
                    <div style={s.stat}>
                        <span style={s.statVal}>{product.total_ratings}</span>
                        <span style={s.statLbl}>Відгуки</span>
                    </div>
                </div>
            </div>

            {/* Image */}
            <div style={s.heroWrap}>
                {product.image_url
                    ? <img src={product.image_url} alt={product.name} style={s.heroImg} />
                    : <div style={s.heroPlaceholder}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                        </svg>
                    </div>
                }
            </div>

            {/* Tabs */}
            <div style={s.tabBar}>
                {[["info","Інформація"], ["rate","Оцінити"], ["reviews","Відгуки"]].map(([key, label]) => (
                    <button
                        key={key}
                        className="tab-btn"
                        style={{ ...s.tabBtn, ...(tab === key ? s.tabActive : s.tabInactive) }}
                        onClick={() => setTab(key)}
                    >
                        {label}
                        {key === "reviews" && product.total_ratings > 0 &&
                            <span style={s.tabBadge}>{product.total_ratings}</span>
                        }
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div style={s.tabContent}>

                {tab === "info" && (
                    <div>
                        {product.description
                            ? <>
                                <p style={s.descLabel}>Інгредієнти</p>
                                <p style={s.descText}>{product.description}</p>
                            </>
                            : <p style={s.emptyText}>Цей продукт не має опису.</p>
                        }
                    </div>
                )}

                {tab === "rate" && (
                    <div>
                        {/* Not logged in */}
                        {!user && (
                            <div style={s.gateWrap}>
                                <p style={s.gateText}>Увійдіть для того, щоб залишити свій відгук.</p>
                                <button style={s.submitBtn} onClick={() => navigate("/login")}>
                                    Увійти
                                </button>
                            </div>
                        )}

                        {/* Logged in, not yet rated */}
                        {user && !rated && (
                            <>
                                <p style={s.ratePrompt}>Ваша оцінка:</p>
                                <div style={s.starsRow}>
                                    {[1,2,3,4,5].map(score => (
                                        <button
                                            key={score}
                                            className="star-btn"
                                            style={{
                                                ...s.starBtn,
                                                ...(selected === score
                                                        ? s.starActive
                                                        : selected && score < selected
                                                            ? s.starFilled
                                                            : {}
                                                )
                                            }}
                                            onClick={() => setSelected(score)}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                {selected && (
                                    <p style={s.selectedLabel}>
                                        {["","Жахливо","Погано","Добре","Чудово","Відмінно"][selected]}
                                    </p>
                                )}
                                <textarea
                                    style={s.commentInput}
                                    placeholder="Напишіть свій відгук (опціонально)"
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                />
                                <p style={s.charCount}>{comment.length}/500</p>
                                {error && <p style={s.errorText}>{error}</p>}
                                <button
                                    style={{ ...s.submitBtn, ...(!selected ? s.submitDis : {}) }}
                                    onClick={handleRate}
                                    disabled={!selected}
                                >
                                    Надіслати
                                </button>
                            </>
                        )}

                        {/* Logged in, rated */}
                        {user && rated && (
                            <div style={s.ratedWrap}>
                                <p style={s.ratedIcon}>★</p>
                                <p style={s.ratedTitle}>Дякуємо за Ваш відгук!</p>
                                <p style={s.ratedSub}>Цей відгук з'явиться після перевірки адміністрацією сервісу.</p>
                            </div>
                        )}
                    </div>
                )}

                {tab === "reviews" && (
                    <div>
                        {product.ratings?.length === 0
                            ? <p style={s.emptyText}>Немає відгуків на цей продукт. Будьте першими!</p>
                            : [...product.ratings].reverse().map(r => (
                                <div key={r.id} style={s.reviewCard}>
                                    <div style={s.reviewTop}>
                                        <span style={s.reviewStars}>{stars(r.score)}</span>
                                        <span style={s.reviewDate}>{new Date(r.created_at).toLocaleDateString("uk-UA")}</span>
                                    </div>
                                    {r.comment && <p style={s.reviewComment}>{r.comment}</p>}
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            <div style={{ height: 100 }} />
        </div>
    );
}

const s = {
    wrapper:      { position: "fixed", inset: 0, background: "#000", overflowY: "auto", fontFamily: "'Helvetica Neue', sans-serif" },
    centerText:   { color: "rgba(255,255,255,0.4)", textAlign: "center", paddingTop: 80, fontSize: 14 },

    headerWrap:   { padding: "52px 20px 16px" },
    backBtn:      { display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, padding: "0 0 16px", cursor: "pointer" },
    brand:        { color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.12em" },
    name:         { color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.25, letterSpacing: "-0.3px" },
    ean:          { color: "rgba(255,255,255,0.2)", fontSize: 11, margin: "0 0 16px", letterSpacing: "0.1em" },

    statsRow:     { display: "flex", alignItems: "center", marginBottom: 0, background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" },
    stat:         { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0" },
    statVal:      { color: "#fff", fontSize: 18, fontWeight: 700 },
    statLbl:      { color: "rgba(255,255,255,0.3)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 },
    statDivider:  { width: 1, height: 32, background: "#1a1a1a" },

    heroWrap:        { width: "100%", height: 280, background: "#0d0d0d", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
    heroImg:         { width: "100%", height: "100%", objectFit: "contain", padding: "16px", boxSizing: "border-box" },
    heroPlaceholder: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" },

    tabBar:      { display: "flex", borderBottom: "1px solid #1a1a1a", margin: "0 20px" },
    tabBtn:      { flex: 1, background: "none", border: "none", borderBottom: "2px solid transparent", padding: "12px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
    tabActive:   { color: "#00ff88", borderBottomColor: "#00ff88" },
    tabInactive: { color: "rgba(255,255,255,0.3)" },
    tabBadge:    { background: "#1a1a1a", color: "rgba(255,255,255,0.4)", fontSize: 10, padding: "1px 6px", borderRadius: 10 },

    tabContent:   { padding: "20px" },

    descLabel:    { color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 10px" },
    descText:     { color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7, margin: 0 },
    emptyText:    { color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", paddingTop: 20 },

    gateWrap:     { textAlign: "center", paddingTop: 20 },
    gateText:     { color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 20 },

    ratePrompt:   { color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", marginBottom: 20 },
    starsRow:     { display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 },
    starBtn:      { width: 52, height: 52, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 12, color: "rgba(255,255,255,0.2)", fontSize: 26, cursor: "pointer", transition: "all 0.15s" },
    starFilled:   { color: "#f5c518", border: "1px solid #3a3000", background: "#1e1800" },
    starActive:   { color: "#f5c518", border: "1px solid #f5c518", background: "#2a2200", transform: "scale(1.1)" },
    selectedLabel:{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginBottom: 20 },
    commentInput: { width: "100%", boxSizing: "border-box", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", fontSize: 14, lineHeight: 1.6, padding: "12px 14px", marginBottom: 4, fontFamily: "'Helvetica Neue', sans-serif", resize: "none", outline: "none" },
    charCount:    { color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "right", margin: "0 0 16px" },
    errorText:    { color: "#ff4444", fontSize: 13, margin: "0 0 12px" },
    submitBtn:    { width: "100%", padding: 16, background: "#00ff88", border: "none", borderRadius: 12, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" },
    submitDis:    { background: "#1a1a1a", color: "rgba(255,255,255,0.2)", cursor: "default" },
    ratedWrap:    { textAlign: "center", paddingTop: 20 },
    ratedIcon:    { color: "#f5c518", fontSize: 48, margin: "0 0 12px" },
    ratedTitle:   { color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
    ratedSub:     { color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 },

    reviewCard:    { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, padding: "14px", marginBottom: 10 },
    reviewTop:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    reviewStars:   { color: "#f5c518", fontSize: 13, letterSpacing: 2 },
    reviewDate:    { color: "rgba(255,255,255,0.25)", fontSize: 11 },
    reviewComment: { color: "rgba(255,255,255,0.65)", fontSize: 14, margin: 0, lineHeight: 1.5 },
};