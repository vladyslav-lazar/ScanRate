import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";

import API_URL from "../config.js";

const styleTag = document.createElement("style");
styleTag.textContent = `
  @keyframes scanAnim { 0%{top:10%} 50%{top:85%} 100%{top:10%} }
  @keyframes sheetUp  { from{transform:translateY(100%)} to{transform:translateY(0)} }
`;
document.head.appendChild(styleTag);

const SCAN_W = 360, SCAN_H = 220, CORNER = 1, CORNER_SIZE = 20;

const s = {
    wrapper:      { position: "fixed", inset: 0, backgroundColor: "#000", overflow: "hidden", fontFamily: "'Helvetica Neue', sans-serif" },
    video:        { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
    overlay:      { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    scanWindow:   { width: SCAN_W, height: SCAN_H, position: "relative", borderRadius: 10, border: "2px solid rgba(255,255,255,0.8)", transition: "box-shadow 0.15s ease, border-color 0.15s ease", overflow: "hidden" },
    corner:       { position: "absolute", width: CORNER_SIZE, height: CORNER_SIZE, borderColor: "#fff", borderStyle: "solid" },
    topLeft:      { top: -CORNER, left: -CORNER,    borderWidth: `${CORNER_SIZE/3}px 0 0 ${CORNER_SIZE/3}px` },
    topRight:     { top: -CORNER, right: -CORNER,   borderWidth: `${CORNER_SIZE/3}px ${CORNER_SIZE/3}px 0 0` },
    bottomLeft:   { bottom: -CORNER, left: -CORNER,   borderWidth: `0 0 ${CORNER_SIZE/3}px ${CORNER_SIZE/3}px` },
    bottomRight:  { bottom: -CORNER, right: -CORNER,  borderWidth: `0 ${CORNER_SIZE/3}px ${CORNER_SIZE/3}px 0` },
    scanLine:     { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "#f0f0f0", opacity: 0.85, animation: "scanAnim 2s ease-in-out infinite" },
    instructions: { position: "absolute", bottom: "32%", width: "100%", textAlign: "center" },
    instrText:    { color: "rgba(255,255,255,0.55)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 },
    backBtn:      { position: "absolute", top: 20, left: 20, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },

    // Sheet
    sheet:        { position: "absolute", bottom: 0, left: 0, right: 0, background: "#111", borderTop: "1px solid #222", borderRadius: "20px 20px 0 0", padding: "24px 24px 48px", animation: "sheetUp 0.3s ease" },
    sheetHandle:  { width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" },
    sheetLabel:   { color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" },
    sheetEan:     { color: "rgba(255,255,255,0.25)", fontSize: 12, letterSpacing: "0.1em", margin: "0 0 16px" },
    sheetRow:     { display: "flex", alignItems: "center", gap: 14, marginBottom: 16 },
    sheetImg:     { width: 56, height: 56, borderRadius: 10, objectFit: "contain", background: "#1a1a1a", flexShrink: 0 },
    sheetImgPh:   { width: 56, height: 56, borderRadius: 10, background: "#1a1a1a", flexShrink: 0 },
    sheetName:    { color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.3 },
    sheetBrand:   { color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 },
    sheetHint:    { color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" },
    sheetBtns:    { display: "flex", gap: 12 },
    btnYes:       { flex: 1, padding: 15, background: "#00ff88", border: "none", borderRadius: 12, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    btnNo:        { flex: 1, padding: 15, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" },
    btnFull:      { width: "100%", padding: 15, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" },
    loadingText:  { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", marginBottom: 24 },
    successIcon:  { color: "#00ff88", fontSize: 36, textAlign: "center", margin: "0 0 12px" },
    successTitle: { color: "#fff", fontSize: 17, fontWeight: 700, textAlign: "center", margin: "0 0 8px" },
    successSub:   { color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.6, textAlign: "center", margin: "0 0 24px" },
};

export default function Scanner() {
    const navigate    = useNavigate();
    const videoRef    = useRef(null);
    const scannedRef  = useRef(false);
    const [flash, setFlash]           = useState(false);
    const [fetching, setFetching]     = useState(false);
    const [pending, setPending]       = useState(null);   // { ean, product, state }
    const [requestSent, setRequestSent] = useState(false);

    useEffect(() => {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]);
        const codeReader = new BrowserMultiFormatReader(hints);

        codeReader.decodeFromConstraints(
            { video: { facingMode: "environment" } },
            videoRef.current,
            async (result) => {
                if (result && !scannedRef.current) {
                    scannedRef.current = true;
                    const ean = result.getText();

                    setFlash(true);
                    setTimeout(() => setFlash(false), 300);
                    setFetching(true);

                    try {
                        // First: check local DB
                        const localRes = await fetch(`${API_URL}/product/${ean}`);

                        if (localRes.ok) {
                            const data = await localRes.json();
                            setPending({ ean, product: data, state: "found" });
                        } else {
                            // Not in local DB: check Open Food Facts
                            const lookupRes = await fetch(`${API_URL}/product/${ean}/lookup`);
                            const lookup = lookupRes.ok ? await lookupRes.json() : null;

                            if (lookup?.name) {
                                // Found on Open Food Facts but not local
                                setPending({ ean, product: lookup, state: "requestable" });
                            } else {
                                // Not found anywhere
                                setPending({ ean, product: null, state: "unknown" });
                            }
                        }
                    } catch {
                        setPending({ ean, product: null, state: "unknown" });
                    } finally {
                        setFetching(false);
                    }
                }
            }
        );

        return () => codeReader.reset();
    }, [navigate]);

    function handleConfirm() {
        navigate(`/product/${pending.ean}`);
    }

    function handleRescan() {
        setPending(null);
        setRequestSent(false);
        scannedRef.current = false;
    }

    async function handleRequest() {
        try {
            await fetch(`${API_URL}/product/${pending.ean}/request`, {
                method:  "POST",
                headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
            });
            setRequestSent(true);
        } catch {
            // Still show success - request may have been a duplicate
            setRequestSent(true);
        }
    }

    return (
        <div style={s.wrapper}>
            <video ref={videoRef} style={s.video} playsInline muted />

            <div style={s.overlay}>
                <div style={{
                    ...s.scanWindow,
                    boxShadow: flash
                        ? "0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 3px #00ff88"
                        : "0 0 0 9999px rgba(0,0,0,0.55)",
                    borderColor: flash ? "#00ff88" : "rgba(255,255,255,0.8)",
                }}>
                    {["topLeft","topRight","bottomLeft","bottomRight"].map(c => (
                        <div key={c} style={{ ...s.corner, ...s[c] }} />
                    ))}
                    <div style={s.scanLine} />
                </div>
            </div>

            {!pending && !fetching && (
                <div style={s.instructions}>
                    <p style={s.instrText}>Наведіть штрих-код продукту у цю рамку</p>
                </div>
            )}

            <button style={s.backBtn} onClick={() => navigate("/")}>←</button>

            {/* Bottom sheet */}
            {(fetching || pending) && (
                <div style={s.sheet}>
                    <div style={s.sheetHandle} />

                    {/* Loading state */}
                    {fetching && (
                        <p style={s.loadingText}>Пошук продукту…</p>
                    )}

                    {/* Product found in local DB */}
                    {pending?.state === "found" && !fetching && (
                        <>
                            <p style={s.sheetLabel}>Ви шукали цей продукт?</p>
                            <p style={s.sheetEan}>{pending.ean}</p>
                            <div style={s.sheetRow}>
                                {pending.product?.image_url
                                    ? <img src={pending.product.image_url} alt="" style={s.sheetImg} />
                                    : <div style={s.sheetImgPh} />
                                }
                                <div>
                                    <p style={s.sheetName}>{pending.product?.name ?? "Невідомий продукт"}</p>
                                    {pending.product?.brand &&
                                        <p style={s.sheetBrand}>{pending.product.brand}</p>
                                    }
                                </div>
                            </div>
                            <div style={s.sheetBtns}>
                                <button style={s.btnYes} onClick={handleConfirm}>Так</button>
                                <button style={s.btnNo}  onClick={handleRescan}>Відсканувати знову</button>
                            </div>
                        </>
                    )}

                    {/* Found on Open Food Facts but not in local DB */}
                    {pending?.state === "requestable" && !fetching && !requestSent && (
                        <>
                            <p style={s.sheetLabel}>Продукту немає в базі даних сервісу</p>
                            <p style={s.sheetEan}>{pending.ean}</p>
                            <div style={s.sheetRow}>
                                {pending.product?.image_url
                                    ? <img src={pending.product.image_url} alt="" style={s.sheetImg} />
                                    : <div style={s.sheetImgPh} />
                                }
                                <div>
                                    <p style={s.sheetName}>{pending.product?.name}</p>
                                    {pending.product?.brand &&
                                        <p style={s.sheetBrand}>{pending.product.brand}</p>
                                    }
                                </div>
                            </div>
                            <p style={s.sheetHint}>
                                Цього продукту ще не має в базі даних сервісу, але він існує в Open Food Facts. Ви можете надати запит на його добавлення.
                            </p>
                            <div style={s.sheetBtns}>
                                <button style={s.btnYes} onClick={handleRequest}>Створити запит</button>
                                <button style={s.btnNo}  onClick={handleRescan}>Відсканувати знову</button>
                            </div>
                        </>
                    )}

                    {/* Request sent confirmation */}
                    {pending?.state === "requestable" && !fetching && requestSent && (
                        <>
                            <p style={s.successIcon}>✓</p>
                            <p style={s.successTitle}>Запит було надіслано успішно!</p>
                            <p style={s.successSub}>
                                Адміністратор подивиться на Ваш запит та додасть цей продукт до бази даних сервісу.
                            </p>
                            <button style={s.btnFull} onClick={handleRescan}>Відсканувати знову</button>
                        </>
                    )}

                    {/* Not found anywhere */}
                    {pending?.state === "unknown" && !fetching && (
                        <>
                            <p style={s.sheetLabel}>Продукт не було знайдено</p>
                            <p style={s.sheetEan}>{pending.ean}</p>
                            <p style={s.sheetHint}>
                                Штрихкод цього продукту не існує ні в базі даних сервісу, ні в Open Food Facts.
                            </p>
                            <button style={s.btnFull} onClick={handleRescan}>Відсканувати знову</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}