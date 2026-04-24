import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import API_URL from "../config";

export default function AuthVerify() {
    const [searchParams]  = useSearchParams();
    const navigate        = useNavigate();
    const { refreshAuth } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) { setError("Помилка токену."); return; }

        fetch(`${API_URL}/auth/verify?token=${encodeURIComponent(token)}`)
            .then(r => {
                if (!r.ok) return r.json().then(d => { throw new Error(d.detail ?? "Це посилання не є валідним."); });
                return r.json();
            })
            .then(async data => {
                localStorage.setItem("access_token", data.access_token);
                localStorage.setItem("is_admin",     String(data.is_admin));
                await refreshAuth();
                // Respect ?next= so Grafana redirect works after login
                const next = searchParams.get("next");
                navigate(next ?? "/", { replace: true });
            })
            .catch(e => setError(e.message));
    }, []);

    if (error) return (
        <div style={s.wrapper}>
            <p style={s.icon}>✕</p>
            <p style={s.title}>Це посилання не є валідним</p>
            <p style={s.sub}>{error}</p>
            <button style={s.btn} onClick={() => navigate("/login")}>
                Спробувати знову
            </button>
        </div>
    );

    return (
        <div style={s.wrapper}>
            <p style={s.sub}>Входимо у Ваш аккаунт…</p>
        </div>
    );
}

const s = {
    wrapper: { position: "fixed", inset: 0, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', sans-serif", textAlign: "center", padding: 24 },
    icon:    { color: "#ff4444", fontSize: 48, margin: "0 0 12px" },
    title:   { color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" },
    sub:     { color: "rgba(255,255,255,0.4)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 },
    btn:     { padding: "12px 28px", background: "#00ff88", border: "none", borderRadius: 10, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
