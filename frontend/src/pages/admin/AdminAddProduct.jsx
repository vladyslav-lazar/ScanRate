import { useState, useRef } from "react";

import API_URL from "../../config";
const EMPTY = { ean: "", name: "", brand: "", image_url: "", description: "" };

export default function AdminAddProduct() {
    const [form, setForm]           = useState(EMPTY);
    const [loading, setLoading]     = useState(false);
    const [lookup, setLookup]       = useState(null);
    const [error, setError]         = useState(null);
    const [success, setSuccess]     = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    function set(key, val) {
        setForm(prev => ({ ...prev, [key]: val }));
    }

    async function handleLookup() {
        if (!form.ean || form.ean.length !== 13) {
            setError("Спочатку введіть штрихкод формату EAN-13."); return;
        }
        setError(null);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/product/${form.ean}/lookup`);
            const data = res.ok ? await res.json() : null;

            if (data?.in_local_db) {
                setError("Цей продукт вже існує в базі даних сервісу."); return;
            }
            if (data?.name) {
                setLookup(data);
                setForm(prev => ({
                    ...prev,
                    name:        data.name        ?? "",
                    brand:       data.brand       ?? "",
                    image_url:   data.image_url   ?? "",
                    description: data.description ?? "",
                }));
            } else {
                setError("Продукт не знайдено в Open Food Facts. Заповніть дані вручну.");
            }
        } catch {
            setError("Помилка пошуку продукту.");
        } finally {
            setLoading(false);
        }
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setForm(prev => ({ ...prev, image_url: "" }));
    }

    function handleRemoveImage() {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleSubmit() {
        if (!form.ean || form.ean.length !== 13) {
            setError("Штрихкод має бути формату EAN-13."); return;
        }
        if (!form.name.trim()) {
            setError("Уведіть назву продукту."); return;
        }
        setError(null);
        setLoading(true);
        try {
            // 1. Create the product
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_URL}/admin/products`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    ean:         form.ean,
                    name:        form.name.trim()        || null,
                    brand:       form.brand.trim()       || null,
                    image_url:   imageFile ? null : (form.image_url.trim() || null),
                    description: form.description.trim() || null,
                }),
            });
            if (res.status === 409) { setError("Цей продукт уже існує в базі даних сервісу."); return; }
            if (!res.ok) throw new Error();

            // 2. Upload image if one was selected
            if (imageFile) {
                const fd = new FormData();
                fd.append("file", imageFile);
                const imgRes = await fetch(`${API_URL}/admin/products/${form.ean}/image`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: fd,
                });
                if (!imgRes.ok) throw new Error("Помилка завантаження зображення.");
            }

            setSuccess(true);
            setForm(EMPTY);
            setLookup(null);
            setImageFile(null);
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (e) {
            setError(e.message ?? "Помилка створення нового продукту.");
        } finally {
            setLoading(false);
        }
    }

    function handleReset() {
        setForm(EMPTY);
        setLookup(null);
        setError(null);
        setSuccess(false);
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    if (success) return (
        <div style={s.successWrap}>
            <p style={s.successIcon}>✓</p>
            <p style={s.successTitle}>Продукт було успішно створено</p>
            <p style={s.successSub}>Цей продукт тепер існує в базі даних сервісу та може бути відсканований.</p>
            <button style={s.addAnother} onClick={handleReset}>Ще один</button>
        </div>
    );

    return (
        <div style={s.wrapper}>
            <p style={s.pageTitle}>Створити продукт</p>

            {/* EAN row with lookup */}
            <label style={s.label}>Штрихкод формату EAN-13</label>
            <div style={s.eanRow}>
                <input
                    style={{ ...s.input, flex: 1 }}
                    placeholder="4820024790022"
                    value={form.ean}
                    onChange={e => set("ean", e.target.value.replace(/\D/g, "").slice(0, 13))}
                    inputMode="numeric"
                    maxLength={13}
                />
                <button
                    style={{ ...s.lookupBtn, ...(loading ? s.btnDis : {}) }}
                    onClick={handleLookup}
                    disabled={loading}
                >
                    {loading ? "…" : "Пошук"}
                </button>
            </div>

            {/* Prefill preview from Open Food Facts */}
            {lookup && (
                <div style={s.previewCard}>
                    <div style={s.previewRow}>
                        {lookup.image_url
                            ? <img src={lookup.image_url} alt="" style={s.previewImg} />
                            : <div style={s.previewImgPh} />
                        }
                        <div>
                            <p style={s.previewNote}>Автозаповнення з Open Food Facts</p>
                            <p style={s.previewName}>{lookup.name}</p>
                        </div>
                    </div>
                </div>
            )}

            <label style={s.label}>
                Назва продукту <span style={s.required}>*</span>
            </label>
            <input
                style={s.input}
                placeholder="e.g. Молоко 2.5%"
                value={form.name}
                onChange={e => set("name", e.target.value)}
            />

            <label style={s.label}>Бренд</label>
            <input
                style={s.input}
                placeholder="e.g. Галичина"
                value={form.brand}
                onChange={e => set("brand", e.target.value)}
            />

            {/* Image section */}
            <label style={s.label}>Зображення продукту</label>

            {/* Preview */}
            {(imagePreview || form.image_url) && (
                <div style={s.currentImgWrap}>
                    <img
                        src={imagePreview ?? form.image_url}
                        alt=""
                        style={s.currentImg}
                        onError={e => e.target.style.display = "none"}
                    />
                    {imageFile && <span style={s.newBadge}>Нове</span>}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
            />

            <div style={s.imageRow}>
                <button
                    style={s.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {imageFile ? "Змінити" : "Завантажити"}
                </button>
                {imageFile && (
                    <button style={s.removeBtn} onClick={handleRemoveImage}>
                        Видалити
                    </button>
                )}
            </div>

            {/* URL fallback - hidden when a file is selected */}
            {!imageFile && (
                <>
                    <p style={s.orDivider}>...або використати зовнішнє посилання</p>
                    <input
                        style={s.input}
                        placeholder="https://..."
                        value={form.image_url}
                        onChange={e => set("image_url", e.target.value)}
                    />
                </>
            )}

            <label style={s.label}>Опис</label>
            <textarea
                style={s.textarea}
                placeholder="Опис продукту (наприклад, інгредієнти)"
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={4}
            />

            {error && <p style={s.error}>{error}</p>}

            <button
                style={{ ...s.submitBtn, ...(loading ? s.btnDis : {}) }}
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? "Завантаження…" : "Добавити до бази даних сервісу"}
            </button>

            <div style={{ height: 60 }} />
        </div>
    );
}

const s = {
    wrapper:        { paddingBottom: 20 },
    pageTitle:      { color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 20px" },
    label:          { display: "block", color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px" },
    required:       { color: "#ff4444" },
    eanRow:         { display: "flex", gap: 10, marginBottom: 16 },
    input:          { display: "block", width: "100%", boxSizing: "border-box", padding: "12px 14px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 16 },
    lookupBtn:      { padding: "12px 16px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, color: "#00ff88", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.04em" },
    btnDis:         { opacity: 0.4, cursor: "default" },
    previewCard:    { background: "#0a1f14", border: "1px solid #0d3320", borderRadius: 10, padding: "12px 14px", marginBottom: 20 },
    previewRow:     { display: "flex", gap: 12, alignItems: "center" },
    previewImg:     { width: 44, height: 44, borderRadius: 6, objectFit: "contain", background: "#0d0d0d", flexShrink: 0 },
    previewImgPh:   { width: 44, height: 44, borderRadius: 6, background: "#0d0d0d", flexShrink: 0 },
    previewNote:    { color: "#00ff88", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" },
    previewName:    { color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 },
    currentImgWrap: { position: "relative", display: "inline-block", marginBottom: 12 },
    currentImg:     { width: 100, height: 100, objectFit: "contain", borderRadius: 10, background: "#0d0d0d", border: "1px solid #1a1a1a", display: "block" },
    newBadge:       { position: "absolute", top: 6, right: 6, background: "#00ff88", color: "#000", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4 },
    imageRow:       { display: "flex", gap: 10, marginBottom: 8 },
    uploadBtn:      { padding: "10px 16px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    removeBtn:      { padding: "10px 16px", background: "transparent", border: "1px solid #ff4444", borderRadius: 10, color: "#ff4444", fontSize: 13, cursor: "pointer" },
    orDivider:      { color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", margin: "8px 0", letterSpacing: "0.08em" },
    textarea:       { display: "block", width: "100%", boxSizing: "border-box", padding: "12px 14px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, color: "#fff", fontSize: 14, lineHeight: 1.6, outline: "none", fontFamily: "inherit", resize: "none", marginBottom: 16 },
    error:          { color: "#ff4444", fontSize: 13, margin: "0 0 14px" },
    submitBtn:      { width: "100%", padding: 15, background: "#00ff88", border: "none", borderRadius: 12, color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" },
    successWrap:    { textAlign: "center", paddingTop: 48 },
    successIcon:    { color: "#00ff88", fontSize: 48, margin: "0 0 16px" },
    successTitle:   { color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" },
    successSub:     { color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.6, margin: "0 0 28px" },
    addAnother:     { padding: "14px 32px", background: "#0d0d0d", border: "1px solid #222", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};