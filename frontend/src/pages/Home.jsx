import { useNavigate } from "react-router-dom";

export default function Home() {
    return (
        <div style={s.wrapper}>
            <div style={s.content}>
                <div style={s.iconWrap}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9V5a1 1 0 011-1h4"/>
                        <path d="M21 9V5a1 1 0 00-1-1h-4"/>
                        <path d="M3 15v4a1 1 0 001 1h4"/>
                        <path d="M21 15v4a1 1 0 01-1 1h-4"/>
                        <line x1="6" y1="12" x2="6" y2="12"/>
                        <line x1="9" y1="12" x2="18" y2="12"/>
                    </svg>
                </div>
                <h1 style={s.title}>ScanRate</h1>
                <p style={s.subtitle}>Відскануйте та оцініть продукти на території України!</p>
                <p style={s.wip}>В активній розробці</p>
            </div>
        </div>
    );
}

const s = {
    wrapper:  { position: "fixed", inset: 0, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', sans-serif", paddingBottom: 68 },
    content:  { textAlign: "center", padding: "0 36px", width: "100%" },
    iconWrap: { width: 88, height: 88, background: "#0a1f14", border: "1px solid #0d3320", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" },
    title:    { color: "#fff", fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px" },
    subtitle: { color: "rgba(255,255,255,0.35)", fontSize: 14, margin: "0 0 28px" },
    wip:      { color: "rgba(255,255,255,0.2)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 16px", display: "inline-block" },
};