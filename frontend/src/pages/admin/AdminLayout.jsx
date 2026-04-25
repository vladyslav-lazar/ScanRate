import { Outlet, useNavigate, useLocation } from "react-router-dom";

const injectStyles = () => {
    if (document.getElementById("admin-styles")) return;
    const t = document.createElement("style");
    t.id = "admin-styles";
    t.textContent = `
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .admin-fade { animation: fadeUp 0.25s ease forwards; }
        .admin-tab:active { opacity: 0.6; }
    `;
    document.head.appendChild(t);
};

const TABS = [
    { path: "/admin/stats",    label: "Статистика" },
    { path: "/admin/reviews",  label: "Відгуки"    },
    { path: "/admin/requests", label: "Запити"     },
    { path: "/admin/add",      label: "Добавити"   },
    { path: "/admin/edit",     label: "Редагувати" },
];

export default function AdminLayout() {
    const navigate     = useNavigate();
    const { pathname } = useLocation();
    injectStyles();

    return (
        <div style={s.wrapper}>
            {/* Header */}
            <div style={s.header}>
                <button style={s.backBtn} onClick={() => navigate("/")}>←</button>
                <div style={{ flex: 1 }}>
                    <p style={s.headerLabel}>Панель адміністратора</p>
                    <h1 style={s.headerTitle}>ScanRate</h1>
                </div>
                {/* Grafana link - opens the auth shim which sets cookie then redirects */}
				<a href="https://grafana.scanrate.pp.ua" target="_blank" rel="noopener noreferrer" style={s.grafanaBtn}>
					Моніторинг
				</a>
            </div>

            {/* Tab bar */}
            <div style={s.tabBar}>
                {TABS.map(tab => {
                    const active = pathname === tab.path ||
                        (pathname === "/admin" && tab.path === "/admin/stats");
                    return (
                        <button
                            key={tab.path}
                            className="admin-tab"
                            style={{ ...s.tab, ...(active ? s.tabActive : s.tabInactive) }}
                            onClick={() => navigate(tab.path)}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Page content */}
            <div style={s.content} className="admin-fade">
                <Outlet />
            </div>
        </div>
    );
}

const s = {
    wrapper:     { position: "fixed", inset: 0, background: "#000", fontFamily: "'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" },
    header:      { display: "flex", alignItems: "center", gap: 14, padding: "20px 20px 16px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 },
    backBtn:     { width: 36, height: 36, borderRadius: "50%", background: "#0d0d0d", border: "1px solid #222", color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    headerLabel: { color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 2px" },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" },
    grafanaBtn:  { padding: "7px 12px", background: "#0a1f14", border: "1px solid #0d3320", borderRadius: 8, color: "#00ff88", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none", flexShrink: 0 },
    tabBar:      { display: "flex", borderBottom: "1px solid #1a1a1a", flexShrink: 0, padding: "0 20px" },
    tab:         { flex: 1, background: "none", border: "none", borderBottom: "2px solid transparent", padding: "12px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em", transition: "color 0.15s, border-color 0.15s" },
    tabActive:   { color: "#00ff88", borderBottomColor: "#00ff88" },
    tabInactive: { color: "rgba(255,255,255,0.3)", borderBottomColor: "rgba(255,255,255,0.1)" },
    content:     { flex: 1, overflowY: "auto", padding: "20px" },
};
