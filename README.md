# Dreamlab Jarvis Filemaker

A simple, 100% client-side tool that converts files and text into clean Markdown (`.md`) files — ready for ingest.

**Your files never leave your browser. No servers, no APIs.**

## Supported Inputs

| Input Type | Formats |
|---|---|
| Documents | PDF, DOCX, DOC, RTF |
| Text | TXT, MD, RST, TEX |
| Web | HTML, HTM |
| Data | CSV, JSON, XML |
| Paste | Plain text, HTML |

## Features

- **Drag & drop** or click to upload files
- **Paste** plain text or HTML directly
- **Live preview** of the generated Markdown
- **Copy to clipboard** or **download as `.md`**
- Smart heading detection for plain text
- CSV → Markdown table conversion
- JSON arrays → Markdown tables
- Custom output filename

## Deploy on GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch** → `main` → `/ (root)`
4. Click **Save** — your site will be live at `https://<username>.github.io/<repo-name>/`

That's it. No build step, no dependencies to install.

## Local Usage

Just open `index.html` in a browser. Everything runs client-side via CDN libraries:

- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF text extraction
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) — DOCX to HTML
- [Turndown.js](https://github.com/mixmark-io/turndown) — HTML to Markdown

## Project Structure

```
index.html    — Main page
styles.css    — Dark-themed styles
app.js        — All conversion logic
README.md     — This file
```

## License

MIT
