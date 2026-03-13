<img src="dreamlab.png" alt="Dreamlab" width="260"/>

# Dreamlab Jarvis Filemaker

> Drop any file or paste text — get clean **Jarvis Ready Markdown** instantly.

---

## 🔒 Your files never leave your browser.

**100% client-side. No server. No upload. No API. No account. Nothing leaves your machine.**

Everything runs locally in your browser tab. Drop a PDF, a Word doc, raw HTML, or paste any text — you get clean Markdown back instantly, entirely offline once loaded.

---

## ⬇️ Single-File Download

**No install. No setup. Just download and open.**

👉 [**Download jarvis-filemaker.html**](https://github.com/petejwoodbridge/MD-Filemaker/raw/main/jarvis-filemaker.html)

Save the file anywhere on your computer. Open it in Chrome, Firefox, or Edge — that's it.

> **Note:** PDF and DOCX conversion requires an internet connection to load CDN libraries on first use. Plain text, HTML, CSV, JSON, XML work fully offline.

---

## Supported Inputs

| Input Type | Formats |
|---|---|
| Documents | PDF, DOCX, DOC, RTF |
| Text | TXT, MD, RST, TEX, LOG |
| Web | HTML, HTM |
| Data | CSV, TSV, JSON, XML |
| Paste | Plain text, HTML |

---

## Features

- **Drag & drop** or click to upload files
- **Paste** plain text or raw HTML directly
- **Live Markdown preview** alongside raw output
- **Copy to clipboard** or **download as `.md`**
- Smart heading detection for plain text
- CSV / TSV → Markdown table conversion
- JSON arrays → Markdown tables
- Custom output filename before download
- Retro CRT neon UI with TV static background
- Works fully offline once loaded

---

## Deploy on GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source: **Deploy from a branch** → `main` → `/ (root)`
4. Click **Save** — live at `https://<username>.github.io/<repo-name>/`

No build step, no dependencies to install.

---

## Run Locally

Because CDN libraries are loaded over HTTPS, open via a local server rather than `file://`:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

Libraries used (all loaded from CDN, no install needed):

- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF text extraction
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) — DOCX → HTML
- [Turndown.js](https://github.com/mixmark-io/turndown) — HTML → Markdown
- [Press Start 2P + VT323](https://fonts.google.com/) — retro pixel fonts

---

## Project Structure

```
index.html              — App (HTML + inlined CSS, loads app.js)
app.js                  — All conversion logic
jarvis-filemaker.html   — Single-file build (app.js inlined, download this)
dreamlab.png            — Dreamlab logo
README.md               — This file
```

---

## License

MIT
