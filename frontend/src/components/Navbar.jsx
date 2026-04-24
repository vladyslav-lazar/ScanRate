import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

const styleTag = document.createElement("style");
styleTag.textContent = `
  .nav-scan-btn:active .scan-inner { transform: scale(0.91); }
  .scan-inner { transition: transform 0.15s; }
  .nav-tab:active { opacity: 0.6; }
  @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
`;
document.head.appendChild(styleTag);

function Icon({ id, size = 22, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", color }}>
            <use href={`/icons.svg#${id}`} />
        </svg>
    );
}

export default function Navbar() {
    const navigate         = useNavigate();
    const { pathname }     = useLocation();
    const { user, logout } = useAuth();
    const [confirming, setConfirming] = useState(false);

    const homeActive   = pathname === "/";
    const searchActive = pathname === "/search";

    function handleLogoutConfirm() {
        logout();
        setConfirming(false);
        navigate("/");
    }

    return (
        <>
            <nav style={s.nav}>
                <button className="nav-tab" style={s.tab} onClick={() => navigate("/")}>
                    <Icon id="icon-home" color={homeActive ? "#00ff88" : "rgba(255,255,255,0.3)"} />
                </button>

                <button className="nav-scan-btn" style={s.scanWrap} onClick={() => navigate("/scan")}>
                    <div className="scan-inner" style={s.scanInner}>
                        <Icon id="icon-scan" size={24} color="#000" />
                    </div>
                </button>

                <button className="nav-tab" style={s.tab} onClick={() => navigate("/search")}>
                    <Icon id="icon-search" color={searchActive ? "#00ff88" : "rgba(255,255,255,0.3)"} />
                </button>

                {user ? (
                    <button className="nav-tab" style={s.tab} onClick={() => setConfirming(true)}>
                        <Icon id="icon-logout" color="rgba(255,255,255,0.3)" />
                    </button>
                ) : (
                    <button className="nav-tab" style={s.tab} onClick={() => navigate("/login")}>
                        <Icon id="icon-login" color={pathname === "/login" ? "#00ff88" : "rgba(255,255,255,0.3)"} />
                    </button>
                )}
            </nav>

            {confirming && (
                <div style={s.overlay} onClick={() => setConfirming(false)}>
                    <div style={s.sheet} onClick={e => e.stopPropagation()}>
                        <div style={s.sheetHandle} />
                        <p style={s.sheetTitle}>Вийти з аккаунту?</p>
                        <p style={s.sheetSub}>
                            Логін: <span style={{ color: "#fff" }}>{user.email}</span>
                        </p>
                        <button style={s.signOutBtn} onClick={handleLogoutConfirm}>
                            Вийти
                        </button>
                        <button style={s.cancelBtn} onClick={() => setConfirming(false)}>
                            Скасувати
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

const FONT = "'Helvetica Neue', sans-serif";

const s = {
    nav: {
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: 68,
        background: "#000",
        borderTop: "1px solid #1a1a1a",
        display: "flex", alignItems: "center", justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 100,
    },
    tab: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "none", border: "none", cursor: "pointer",
        padding: "12px 0", height: "100%",
    },
    scanWrap: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "none", border: "none", cursor: "pointer",
        padding: 0, height: "100%",
        position: "relative", bottom: 14,
    },
    scanInner: {
        width: 54, height: 54,
        background: "#00ff88",
        borderRadius: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#000",
        boxShadow: "0 4px 20px rgba(0,255,136,0.3)",
    },
    overlay:    { position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)" },
    sheet:      { position: "absolute", bottom: 0, left: 0, right: 0, background: "#111", borderTop: "1px solid #222", borderRadius: "20px 20px 0 0", padding: "24px 24px 48px", animation: "sheetUp 0.25s ease", textAlign: "center", fontFamily: FONT },
    sheetHandle:{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" },
    sheetTitle: { color: "#fff", fontSize: 17, fontWeight: 700, margin: "0 0 8px" },
    sheetSub:   { color: "rgba(255,255,255,0.4)", fontSize: 14, margin: "0 0 24px" },
    signOutBtn: { display: "block", width: "100%", padding: 14, background: "transparent", border: "1px solid #ff4444", borderRadius: 12, color: "#ff4444", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 12, fontFamily: FONT },
    cancelBtn:  { display: "block", width: "100%", padding: 14, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", fontSize: 15, cursor: "pointer", fontFamily: FONT },
};