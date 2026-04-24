import { useState } from "react";

export default function DesktopWarning() {
    const [dismissed, setDismissed] = useState(
        () => localStorage.getItem("desktop-warning-dismissed") === "true"
    );

    const isTouchDevice = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    if (isTouchDevice || dismissed) return null;

    function handleDismiss() {
        localStorage.setItem("desktop-warning-dismissed", "true");
        setDismissed(true);
    }

    return (
        <div style={s.overlay}>
            <div style={s.card}>
                <div style={s.icon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2"/>
                        <line x1="12" y1="18" x2="12" y2="18.01"/>
                    </svg>
                </div>
                <h2 style={s.title}>Увага! Проєкт націлений на смартфони.</h2>
                <p style={s.body}>
                    Сканування штриходів найкраще працює з камерою мобільного телефону. Деякі функції можуть не працювати правильно на комп'ютерних пристроях.
                </p>
                <button style={s.btn} onClick={handleDismiss}>
                    Все одно продовжити
                </button>
            </div>
        </div>
    );
}

const s = {
    overlay: {
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        backdropFilter: "blur(4px)",
    },
    card: {
        background: "#111",
        border: "1px solid #222",
        borderRadius: 20,
        padding: "32px 28px",
        maxWidth: 340,
        textAlign: "center",
        fontFamily: "'Helvetica Neue', sans-serif",
    },
    icon: {
        width: 64, height: 64,
        background: "#0a1f14",
        border: "1px solid #0d3320",
        borderRadius: 18,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
    },
    title: {
        color: "#fff", fontSize: 20, fontWeight: 700,
        margin: "0 0 12px", letterSpacing: "-0.3px",
    },
    body: {
        color: "rgba(255,255,255,0.45)", fontSize: 14,
        lineHeight: 1.65, margin: "0 0 24px",
    },
    btn: {
        width: "100%", padding: "14px 0",
        background: "#00ff88", border: "none",
        borderRadius: 12, color: "#000",
        fontSize: 15, fontWeight: 700,
        cursor: "pointer", letterSpacing: "0.04em",
    },
};