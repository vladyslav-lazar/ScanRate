import { useState, useRef } from "react";

import API_URL from "../../config";
const EMPTY = { name: "", brand: "", image_url: "", description: "" };

export default function AdminEditProduct() {
    const [ean, setEan]             = useState("");
    const [form, setForm]           = useState(EMPTY);
    const [original, setOriginal]   = useState(null);
    const [loading, setLoading]     = useState(false);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState(null);
    const [success, setSuccess]     = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    function set(key, val) {
        setForm(prev => ({ ...prev, [key]: val }));
        setSuccess(null);
    }

    async function handleLookup() {
        const trimmed = ean.trim();
        if (!trimmed) return;
        setError(null);
        setSuccess(null);
        setImageFile(null);
        setImagePreview(null);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/product/${trimmed}`);
            if (res.status === 404) {
                setError("Цей продукт не було знайдено в базі даних сервісу.");
                setOriginal(null);
                setForm(EMPTY);
                return;
            }
            if (!res.ok) throw new Error();
            const data = await res.json();
            const filled = {
                name:        data.name        ?? "",
                brand:       data.brand       ?? "",
                image_url:   data.image_url   ?? "",
                description: data.description ?? "",
            };
            setOriginal(filled);
            setForm(filled);
        } catch {
            setError("Помилка завантаження продукту.");
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
        setSuccess(null);
    }

    function handleRemoveImage() {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleSave() {
        if (!original) return;
        if (!form.name.trim()) { setError("Назва продукту є обов'язковою."); return; }
        setError(null);
        setSaving(true);

        try {
            // 1. Save text fields
            const token = localStorage.getItem("access_token");
            const editRes = await fetch(`${API_URL}/admin/products/${ean.trim()}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    name:        form.name.trim()        || null,
                    brand:       form.brand.trim()       || null,
                    image_url:   imageFile ? null : (form.image_url.trim() || null),
                    description: form.description.trim() || null,
                }),
            });
            if (!editRes.ok) throw new Error();

            // 2. Upload image file if one was selected
            if (imageFile) {
                const fd = new FormData();
                fd.append("file", imageFile);
                const imgRes = await fetch(`${API_URL}/admin/products/${ean.trim()}/image`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: fd,
                });
                if (!imgRes.ok) throw new Error("Помилка завантаження зображення.");
            }

            setSuccess("Дані оновлено успішно!");
            setOriginal(form);
            setImageFile(null);
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (e) {
            setError(e.message ?? "Помилка збереження змін.");
        } finally {
            setSaving(false);
        }
    }

    function handleReset() {
        setEan("");
        setForm(EMPTY);
        setOriginal(null);
        setError(null);
        setSuccess(null);
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    const hasChanges = original && (
        form.name        !== original.name        ||
        form.brand       !== original.brand       ||
        form.image_url   !== original.image_url   ||
        form.description !== original.description ||
        imageFile !== null
    );

    return (
        <div style={s.wrapper}>
            <p style={s.pageTitle}>Відредагувати продукт</p>

            {/* EAN lookup */}
            <label style={s.label}>Штрихкод формату EAN-13</label>
            <div style={s.eanRow}>
                <input
                    style={{ ...s.input, flex: 1 }}
                    placeholder="4820024790022"
                    value={ean}
                    onChange={e => {
                        setEan(e.target.value.replace(/\D/g, "").slice(0, 13));
                        setOriginal(null);
                        setForm(EMPTY);
                        setError(null);
                        setSuccess(null);
                    }}
                    inputMode="numeric"
                    maxLength={13}
                />
                <button
                    style={{ ...s.lookupBtn, ...(loading ? s.btnDis : {}) }}
                    onClick={handleLookup}
                    disabled={loading}
                >
                    {loading ? "…" : "Завантаження"}
                </button>
            </div>

            {error && !original && <p style={s.error}>{error}</p>}

            {/* Edit form — only shown after a successful lookup */}
            {original && (
                <>
                    <label style={s.label}>
                        Назва продукту <span style={s.required}>*</span>
                    </label>
                    <input
                        style={s.input}
                        value={form.name}
                        onChange={e => set("name", e.target.value)}
                    />

                    <label style={s.label}>Бренд</label>
                    <input
                        style={s.input}
                        value={form.brand}
                        onChange={e => set("brand", e.target.value)}
                    />

                    {/* Image section */}
                    <label style={s.label}>Зображення продукту</label>

                    {/* Current image preview */}
                    {(imagePreview || form.image_url) && (
                        <div style={s.currentImgWrap}>
                            <img
                                src={imagePreview ?? form.image_url}
                                alt=""
                                style={s.currentImg}
                                onError={e => e.target.style.display = "none"}
                            />
                            {imageFile && (
                                <span style={s.newBadge}>Нове</span>
                            )}
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

                    {/* URL fallback — hidden when a file is selected */}
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

                    <label style={s.label}>Опис продукту (наприклад, інгредієнти)</label>
                    <textarea
                        style={s.textarea}
                        value={form.description}
                        onChange={e => set("description", e.target.value)}
                        rows={4}
                    />

                    {error   && <p style={s.error}>{error}</p>}
                    {success && <p style={s.successMsg}>{success}</p>}

                    <div style={s.actionRow}>
                        <button style={s.resetBtn} onClick={handleReset}>
                            Скасувати
                        </button>
                        <button
                            style={{
                                ...s.saveBtn,
                                ...(!hasChanges || saving ? s.btnDis : {}),
                            }}
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                        >
                            {saving ? "Збереження…" : "Зберегти зміни"}
                        </button>
                    </div>
                </>
            )}

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
    currentImgWrap: { position: "relative", display: "inline-block", marginBottom: 12 },
    currentImg:     { width: 100, height: 100, objectFit: "contain", borderRadius: 10, background: "#0d0d0d", border: "1px solid #1a1a1a", display: "block" },
    newBadge:       { position: "absolute", top: 6, right: 6, background: "#00ff88", color: "#000", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4 },
    imageRow:       { display: "flex", gap: 10, marginBottom: 8 },
    uploadBtn:      { padding: "10px 16px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    removeBtn:      { padding: "10px 16px", background: "transparent", border: "1px solid #ff4444", borderRadius: 10, color: "#ff4444", fontSize: 13, cursor: "pointer" },
    orDivider:      { color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", margin: "8px 0", letterSpacing: "0.08em" },
    textarea:       { display: "block", width: "100%", boxSizing: "border-box", padding: "12px 14px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, color: "#fff", fontSize: 14, lineHeight: 1.6, outline: "none", fontFamily: "inherit", resize: "none", marginBottom: 16 },
    error:          { color: "#ff4444", fontSize: 13, margin: "0 0 14px" },
    successMsg:     { color: "#00ff88", fontSize: 13, margin: "0 0 14px" },
    actionRow:      { display: "flex", gap: 10 },
    resetBtn:       { flex: 1, padding: 14, background: "transparent", border: "1px solid #2a2a2a", borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer" },
    saveBtn:        { flex: 2, padding: 14, background: "#00ff88", border: "none", borderRadius: 12, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" },
};