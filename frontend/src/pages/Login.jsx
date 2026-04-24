import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import API_URL from "../config";

export default function Login() {
    const navigate      = useNavigate();
    const { user }      = useAuth();
    const [email, setEmail]     = useState("");
    const [sent, setSent]       = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);

    // Already logged in - redirect home
    if (user) {
        navigate("/", { replace: true });
        return null;
    }

    async function handleSubmit() {
        if (!email.trim()) return;
        setError(null);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email: email.trim() }),
            });
            if (!res.ok) throw new Error();
            setSent(true);
        } catch {
            setError("Помилка роботи сервера.");
        } finally {
            setLoading(false);
        }
    }

    if (sent) return (
        <div style={s.wrapper}>
            <div style={s.card}>
                <div style={s.iconWrap}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"/>
                        <path d="M22 6l-10 7L2 6"/>
                    </svg>
                </div>
                <h1 style={s.title}>Перевірте свою електронну скриньку</h1>
                <p style={s.sub}>
                    Лист з посиланням на вхід було надіслано на{" "}
                    <span style={{ color: "#fff" }}>{email}</span>.
                    Зайдіть за цим посиланням швидко - воно буде працювати тільки 15 хвилин.
                </p>
                <p style={s.hint}>
                    Неправильна електронна скринька?{" "}
                    <button style={s.link} onClick={() => setSent(false)}>Назад</button>
                </p>
                <button style={s.backBtn} onClick={() => navigate(-1)}>
                    ← Назад
                </button>
            </div>
        </div>
    );

    return (
        <div style={s.wrapper}>
            <div style={s.card}>
                <button style={s.backBtn} onClick={() => navigate(-1)}>← Назад</button>

                <div style={s.iconWrap}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9V5a1 1 0 011-1h4"/>
                        <path d="M21 9V5a1 1 0 00-1-1h-4"/>
                        <path d="M3 15v4a1 1 0 001 1h4"/>
                        <path d="M21 15v4a1 1 0 01-1 1h-4"/>
                        <line x1="6" y1="12" x2="6" y2="12"/>
                        <line x1="9" y1="12" x2="18" y2="12"/>
                    </svg>
                </div>
                <h1 style={s.title}>ScanRate</h1>
                <p style={s.sub}>Уведіть Вашу електронну скриньку для входу в сервіс.</p>

                <input
                    style={s.input}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    inputMode="email"
                    autoFocus
                />

                {error && <p style={s.error}>{error}</p>}

                <button
                    style={{ ...s.btn, ...(loading ? s.btnDis : {}) }}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? "Надсилаємо…" : "Надіслати"}
                </button>
            </div>
        </div>
    );
}

const s = {
    wrapper:  { position: "fixed", inset: 0, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Helvetica Neue', sans-serif" },
    card:     { width: "100%", maxWidth: 360, textAlign: "center" },
    backBtn:  { display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", marginBottom: 24, padding: 0, textAlign: "left" },
    iconWrap: { width: 64, height: 64, background: "#0a1f14", border: "1px solid #0d3320", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" },
    title:    { color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px" },
    sub:      { color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" },
    input:    { display: "block", width: "100%", boxSizing: "border-box", padding: "14px 16px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", fontSize: 16, outline: "none", fontFamily: "inherit", marginBottom: 12 },
    error:    { color: "#ff4444", fontSize: 13, margin: "0 0 12px" },
    btn:      { width: "100%", padding: 15, background: "#00ff88", border: "none", borderRadius: 12, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" },
    btnDis:   { opacity: 0.5, cursor: "default" },
    hint:     { color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 20, marginBottom: 12 },
    link:     { background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 },
};