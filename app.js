// ============================================================
// Dreamlab Jarvis Filemaker — 100% client-side file-to-Markdown converter
// Fully resilient: works even if CDN libraries fail to load.
// ============================================================

(function () {
    "use strict";

    // Surface any uncaught JS error in the status bar
    window.onerror = function (msg, src, line) {
        var s = document.getElementById("libStatus");
        if (s) { s.textContent = "JS Error: " + msg + " (line " + line + ")"; s.className = "err"; }
        return false;
    };

    // ---- Lazy library accessors (never crash on init) ----
    function getPdfJs() {
        if (typeof pdfjsLib !== "undefined") return pdfjsLib;
        return null;
    }
    function getMammoth() {
        if (typeof mammoth !== "undefined") return mammoth;
        return null;
    }
    function getTurndown() {
        if (typeof TurndownService !== "undefined") {
            if (!getTurndown._inst) {
                try {
                    getTurndown._inst = new TurndownService({
                        headingStyle: "atx",
                        codeBlockStyle: "fenced",
                        bulletListMarker: "-",
                        emDelimiter: "*",
                    });
                } catch (e) {
                    return null;
                }
            }
            return getTurndown._inst;
        }
        return null;
    }

    // ---- DOM refs ----
    var tabs           = document.querySelectorAll(".tab");
    var tabContents    = document.querySelectorAll(".tab-content");
    var dropZone       = document.getElementById("dropZone");
    var fileInput      = document.getElementById("fileInput");
    var fileInfo       = document.getElementById("fileInfo");
    var fileNameSpan   = document.getElementById("fileName");
    var clearFileBtn   = document.getElementById("clearFile");
    var pasteInput     = document.getElementById("pasteInput");
    var htmlInput      = document.getElementById("htmlInput");
    var convertBtn     = document.getElementById("convertBtn");
    var outputSection  = document.getElementById("outputSection");
    var markdownOut    = document.getElementById("markdownOutput");
    var markdownPrev   = document.getElementById("mdPreview");
    var copyBtn        = document.getElementById("copyBtn");
    var downloadBtn    = document.getElementById("downloadBtn");
    var outputTabs     = document.querySelectorAll(".out-tab");
    var outputContents = document.querySelectorAll(".out-content");
    var outputFilename = document.getElementById("outFilename");
    var toastEl        = document.getElementById("toast");
    var libStatus      = document.getElementById("libStatus");

    var currentFile = null;
    var activeTab   = "upload";

    // ---- Show library availability after a short delay ----
    setTimeout(function () {
      try {  
        var pdf = getPdfJs() ? "PDF" : null;
        var doc = getMammoth() ? "DOCX" : null;
        var td  = getTurndown() ? "HTML" : null;
        // Also configure pdf.js worker if available
        if (getPdfJs()) {
            try {
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            } catch (e) { /* ignore */ }
        }
        var loaded = [pdf, doc, td].filter(Boolean);
        if (loaded.length === 3) {
            libStatus.textContent = "All libraries loaded — PDF, DOCX, and HTML conversion ready.";
            libStatus.className = "ok";
        } else if (loaded.length > 0) {
            libStatus.textContent = "Partial: " + loaded.join(", ") + " supported. Some CDN libraries may be blocked.";
            libStatus.className = "warn";
        } else {
            libStatus.textContent = "CDN libraries could not load. Text/CSV/JSON/XML still work. Try deploying to GitHub Pages.";
            libStatus.className = "err";
        }
        setTimeout(function () {
            if (loaded.length === 3) libStatus.style.display = "none";
        }, 4000);
      } catch (e) {
        libStatus.textContent = "Init error: " + e.message;
        libStatus.className = "err";
      }
    }, 1500);

    // ============================================================
    // Tab switching
    // ============================================================
    tabs.forEach(function (t) {
        t.addEventListener("click", function () {
            tabs.forEach(function (x) { x.classList.remove("active"); });
            tabContents.forEach(function (x) { x.classList.remove("active"); });
            t.classList.add("active");
            activeTab = t.getAttribute("data-tab");
            document.getElementById("tab-" + activeTab).classList.add("active");
        });
    });

    outputTabs.forEach(function (t) {
        t.addEventListener("click", function () {
            outputTabs.forEach(function (x) { x.classList.remove("active"); });
            outputContents.forEach(function (x) { x.classList.remove("active"); });
            t.classList.add("active");
            document.getElementById("out-" + t.getAttribute("data-out")).classList.add("active");
        });
    });

    // ============================================================
    // File upload / drag-and-drop
    // ============================================================
    dropZone.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("over");
    });

    dropZone.addEventListener("dragleave", function (e) {
        e.preventDefault();
        dropZone.classList.remove("over");
    });

    dropZone.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("over");
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    clearFileBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        currentFile = null;
        fileInput.value = "";
        fileInfo.style.display = "none";
    });

    function handleFile(file) {
        currentFile = file;
        fileNameSpan.textContent = file.name + " (" + formatBytes(file.size) + ")";
        fileInfo.style.display = "flex";
        // Auto-set output filename
        var baseName = file.name.replace(/\.[^/.]+$/, "");
        outputFilename.value = baseName;
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    }

    // ============================================================
    // Convert button
    // ============================================================
    convertBtn.addEventListener("click", async function () {
        convertBtn.disabled = true;
        convertBtn.textContent = "Converting\u2026";

        try {
            var markdown = "";

            if (activeTab === "upload") {
                if (!currentFile) {
                    showToast("Please select a file first.");
                    return;
                }
                markdown = await convertFile(currentFile);
            } else if (activeTab === "paste") {
                var text = pasteInput.value.trim();
                if (!text) {
                    showToast("Please paste some text first.");
                    return;
                }
                markdown = convertPlainText(text);
            } else if (activeTab === "html") {
                var html = htmlInput.value.trim();
                if (!html) {
                    showToast("Please paste some HTML first.");
                    return;
                }
                var td = getTurndown();
                if (td) {
                    markdown = td.turndown(html);
                } else {
                    // Fallback: basic HTML tag stripping
                    markdown = htmlToMarkdownFallback(html);
                }
            }

            if (markdown) {
                showOutput(markdown);
            }
        } catch (err) {
            console.error("Conversion error:", err);
            showToast("Error: " + (err.message || "Unknown error"));
        } finally {
            convertBtn.disabled = false;
            convertBtn.textContent = "Convert to Markdown";
        }
    });

    // ============================================================
    // File conversion dispatcher
    // ============================================================
    async function convertFile(file) {
        var ext = file.name.split(".").pop().toLowerCase();
        var readers = {
            pdf:  convertPDF,
            docx: convertDocx,
            doc:  convertDocFallback,
            txt:  convertTextFile,
            md:   convertTextFile,
            rst:  convertTextFile,
            tex:  convertTextFile,
            log:  convertTextFile,
            html: convertHTMLFile,
            htm:  convertHTMLFile,
            rtf:  convertRTFFile,
            csv:  convertCSVFile,
            tsv:  convertTSVFile,
            json: convertJSONFile,
            xml:  convertXMLFile,
        };

        var handler = readers[ext];
        if (!handler) {
            throw new Error("Unsupported file type: ." + ext);
        }
        return handler(file);
    }

    // ============================================================
    // PDF
    // ============================================================
    async function convertPDF(file) {
        var lib = getPdfJs();
        if (!lib) {
            throw new Error("PDF.js library not loaded. Check your internet connection or deploy to GitHub Pages.");
        }
        // Ensure worker is set
        try {
            lib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        } catch (e) { /* ignore */ }

        var arrayBuffer = await file.arrayBuffer();
        var pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        var totalPages = pdf.numPages;
        var markdown = "# " + file.name.replace(/\.pdf$/i, "") + "\n\n";

        for (var i = 1; i <= totalPages; i++) {
            var page = await pdf.getPage(i);
            var content = await page.getTextContent();
            var lines = [];
            var lastY = null;

            content.items.forEach(function (item) {
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
                    lines.push("\n");
                }
                lines.push(item.str);
                lastY = item.transform[5];
            });

            var pageText = lines.join("").trim();
            if (pageText) {
                if (totalPages > 1) {
                    markdown += "## Page " + i + "\n\n";
                }
                markdown += pageText + "\n\n";
            }
        }

        return markdown.trim();
    }

    // ============================================================
    // DOCX (via mammoth -> HTML -> Turndown)
    // ============================================================
    async function convertDocx(file) {
        var mam = getMammoth();
        if (!mam) {
            throw new Error("Mammoth.js library not loaded. Check your internet connection or deploy to GitHub Pages.");
        }
        var arrayBuffer = await file.arrayBuffer();
        var result = await mam.convertToHtml({ arrayBuffer: arrayBuffer });
        if (result.messages && result.messages.length) {
            console.warn("Mammoth warnings:", result.messages);
        }
        var td = getTurndown();
        if (td) {
            return td.turndown(result.value);
        } else {
            return htmlToMarkdownFallback(result.value);
        }
    }

    // ============================================================
    // DOC fallback (binary .doc - best effort plain text extraction)
    // ============================================================
    async function convertDocFallback(file) {
        var arrayBuffer = await file.arrayBuffer();
        var bytes = new Uint8Array(arrayBuffer);
        var text = "";
        for (var i = 0; i < bytes.length; i++) {
            var ch = bytes[i];
            if ((ch >= 32 && ch <= 126) || ch === 10 || ch === 13 || ch === 9) {
                text += String.fromCharCode(ch);
            }
        }
        text = text.replace(/[^\S\n]{4,}/g, " ");
        text = text.replace(/(.)\1{5,}/g, "");
        text = text.replace(/\n{3,}/g, "\n\n");
        return convertPlainText(text.trim());
    }

    // ============================================================
    // Plain text / Markdown / RST / TeX
    // ============================================================
    async function convertTextFile(file) {
        var text = await file.text();
        return convertPlainText(text);
    }

    function convertPlainText(text) {
        var lines = text.split(/\r?\n/);
        var md = "";

        for (var idx = 0; idx < lines.length; idx++) {
            var trimmed = lines[idx].trimEnd();

            // Already valid Markdown? Pass through.
            if (/^#{1,6}\s/.test(trimmed) ||
                /^[-*+]\s/.test(trimmed) ||
                /^\d+\.\s/.test(trimmed) ||
                /^>\s/.test(trimmed) ||
                /^```/.test(trimmed) ||
                /^\|/.test(trimmed)) {
                md += trimmed + "\n";
                continue;
            }

            // Likely a heading: short line, all caps or title case, no ending punctuation
            if (trimmed.length > 0 && trimmed.length <= 80 &&
                /^[A-Z]/.test(trimmed) &&
                !/[.!?;,:]$/.test(trimmed) &&
                (trimmed === trimmed.toUpperCase() ||
                 /^([A-Z][a-z]*\s*)+$/.test(trimmed))) {
                if (trimmed === trimmed.toUpperCase() && trimmed.length < 50) {
                    md += "\n## " + titleCase(trimmed) + "\n\n";
                } else {
                    md += "\n### " + trimmed + "\n\n";
                }
                continue;
            }

            // Bullet-like patterns
            if (/^[\u2022\u2023\u25E6\u2043\u25CF\u25CB\u25A0\u25A1\u25C6\u25C7\u25BA\u25B8\u2013\u2014]\s*/.test(trimmed)) {
                md += "- " + trimmed.replace(/^[\u2022\u2023\u25E6\u2043\u25CF\u25CB\u25A0\u25A1\u25C6\u25C7\u25BA\u25B8\u2013\u2014]\s*/, "") + "\n";
                continue;
            }

            // Empty line
            if (trimmed === "") {
                md += "\n";
                continue;
            }

            // Default paragraph
            md += trimmed + "\n";
        }

        md = md.replace(/\n{3,}/g, "\n\n").trim();
        return md;
    }

    function titleCase(str) {
        return str.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    // ============================================================
    // HTML file
    // ============================================================
    async function convertHTMLFile(file) {
        var html = await file.text();
        var match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        var content = match ? match[1] : html;
        var td = getTurndown();
        if (td) {
            return td.turndown(content);
        }
        return htmlToMarkdownFallback(content);
    }

    // ============================================================
    // Fallback HTML -> Markdown (no library needed)
    // ============================================================
    function htmlToMarkdownFallback(html) {
        var md = html;
        // Headings
        md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n\n");
        md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n\n");
        md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n\n");
        md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n\n");
        md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n\n");
        md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n\n");
        // Bold / italic
        md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
        md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
        // Links
        md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
        // Line breaks & paragraphs
        md = md.replace(/<br\s*\/?>/gi, "\n");
        md = md.replace(/<\/p>/gi, "\n\n");
        md = md.replace(/<p[^>]*>/gi, "");
        // List items
        md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
        // Strip remaining tags
        md = md.replace(/<[^>]+>/g, "");
        // Decode entities
        md = md.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
        md = md.replace(/&nbsp;/g, " ").replace(/&quot;/g, '"');
        // Clean up
        md = md.replace(/\n{3,}/g, "\n\n").trim();
        return md;
    }

    // ============================================================
    // RTF (strip RTF control codes, extract text)
    // ============================================================
    async function convertRTFFile(file) {
        var rtf = await file.text();
        var text = rtf;
        text = text.replace(/\{\\[^{}]*\}/g, "");
        text = text.replace(/\\[a-z]+\d*\s?/gi, "");
        text = text.replace(/[{}]/g, "");
        text = text.replace(/\\\\/g, "\\");
        text = text.replace(/\\'[0-9a-f]{2}/gi, "");
        text = text.trim();
        return convertPlainText(text);
    }

    // ============================================================
    // CSV -> Markdown table
    // ============================================================
    async function convertCSVFile(file) {
        var text = await file.text();
        return csvToTable(text, ",");
    }

    async function convertTSVFile(file) {
        var text = await file.text();
        return csvToTable(text, "\t");
    }

    function csvToTable(text, delimiter) {
        var rows = parseDelimited(text, delimiter);
        if (rows.length === 0) return "";

        var md = "";
        var header = rows[0];
        md += "| " + header.join(" | ") + " |\n";
        md += "| " + header.map(function () { return "---"; }).join(" | ") + " |\n";

        for (var i = 1; i < rows.length; i++) {
            while (rows[i].length < header.length) rows[i].push("");
            md += "| " + rows[i].join(" | ") + " |\n";
        }

        return md.trim();
    }

    function parseDelimited(text, delimiter) {
        var rows = [];
        var lines = text.split(/\r?\n/);
        for (var li = 0; li < lines.length; li++) {
            var line = lines[li];
            if (line.trim() === "") continue;
            if (delimiter === ",") {
                // Handle quoted CSV fields
                var row = [];
                var field = "";
                var inQuotes = false;
                for (var i = 0; i < line.length; i++) {
                    var ch = line[i];
                    if (inQuotes) {
                        if (ch === '"' && line[i + 1] === '"') {
                            field += '"';
                            i++;
                        } else if (ch === '"') {
                            inQuotes = false;
                        } else {
                            field += ch;
                        }
                    } else {
                        if (ch === '"') {
                            inQuotes = true;
                        } else if (ch === delimiter) {
                            row.push(field.trim());
                            field = "";
                        } else {
                            field += ch;
                        }
                    }
                }
                row.push(field.trim());
                rows.push(row);
            } else {
                rows.push(line.split(delimiter).map(function (f) { return f.trim(); }));
            }
        }
        return rows;
    }

    // ============================================================
    // JSON -> Markdown
    // ============================================================
    async function convertJSONFile(file) {
        var text = await file.text();
        var parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            return "```json\n" + text + "\n```";
        }

        var md = "# " + file.name + "\n\n";

        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
            var keys = Object.keys(parsed[0]);
            md += "| " + keys.join(" | ") + " |\n";
            md += "| " + keys.map(function () { return "---"; }).join(" | ") + " |\n";
            for (var i = 0; i < parsed.length; i++) {
                var item = parsed[i];
                md += "| " + keys.map(function (k) { return String(item[k] != null ? item[k] : ""); }).join(" | ") + " |\n";
            }
        } else {
            md += "```json\n" + JSON.stringify(parsed, null, 2) + "\n```\n";
        }

        return md.trim();
    }

    // ============================================================
    // XML -> Markdown (code block)
    // ============================================================
    async function convertXMLFile(file) {
        var text = await file.text();
        return "# " + file.name + "\n\n```xml\n" + text + "\n```";
    }

    // ============================================================
    // Show output
    // ============================================================
    function showOutput(markdown) {
        markdownOut.value = markdown;
        markdownPrev.innerHTML = renderMarkdown(markdown);
        outputSection.style.display = "block";
        outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ============================================================
    // Minimal Markdown -> HTML renderer (no dependencies)
    // ============================================================
    function renderMarkdown(md) {
        var html = md;

        // Escape HTML
        html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Code blocks (fenced)
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
            return '<pre><code class="language-' + lang + '">' + code.trim() + "</code></pre>";
        });

        // Headings
        html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
        html = html.replace(/^#####\s+(.+)$/gm,  "<h5>$1</h5>");
        html = html.replace(/^####\s+(.+)$/gm,   "<h4>$1</h4>");
        html = html.replace(/^###\s+(.+)$/gm,    "<h3>$1</h3>");
        html = html.replace(/^##\s+(.+)$/gm,     "<h2>$1</h2>");
        html = html.replace(/^#\s+(.+)$/gm,      "<h1>$1</h1>");

        // Bold & italic
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
        html = html.replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>");
        html = html.replace(/\*(.+?)\*/g,          "<em>$1</em>");

        // Inline code
        html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

        // Blockquotes
        html = html.replace(/^&gt;\s+(.+)$/gm, "<blockquote>$1</blockquote>");

        // Unordered lists
        html = html.replace(/^[-*+]\s+(.+)$/gm, "<li>$1</li>");

        // Ordered lists
        html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

        // Wrap consecutive <li> in <ul>
        html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

        // Tables
        html = html.replace(/^(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)*)/gm, function (_, headerLine, sepLine, bodyLines) {
            var headers = headerLine.split("|").filter(Boolean).map(function (c) { return "<th>" + c.trim() + "</th>"; }).join("");
            var rows = bodyLines.trim().split("\n").map(function (row) {
                var cells = row.split("|").filter(Boolean).map(function (c) { return "<td>" + c.trim() + "</td>"; }).join("");
                return "<tr>" + cells + "</tr>";
            }).join("");
            return "<table><thead><tr>" + headers + "</tr></thead><tbody>" + rows + "</tbody></table>";
        });

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Horizontal rules
        html = html.replace(/^---$/gm, "<hr>");

        // Paragraphs
        html = html.replace(/^(?!<[a-z/])((?!<).+)$/gm, "<p>$1</p>");
        html = html.replace(/<p>\s*<\/p>/g, "");

        return html;
    }

    // ============================================================
    // Copy + Download
    // ============================================================
    copyBtn.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(markdownOut.value).then(function () {
                showToast("Copied to clipboard!");
            }).catch(function () {
                fallbackCopy();
            });
        } else {
            fallbackCopy();
        }
    });

    function fallbackCopy() {
        markdownOut.removeAttribute("readonly");
        markdownOut.select();
        document.execCommand("copy");
        markdownOut.setAttribute("readonly", "");
        showToast("Copied to clipboard!");
    }

    downloadBtn.addEventListener("click", function () {
        var filename = (outputFilename.value.trim() || "output") + ".md";
        var blob = new Blob([markdownOut.value], { type: "text/markdown;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Downloaded " + filename);
    });

    // ============================================================
    // Toast notification
    // ============================================================
    var toastTimer = null;
    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.style.display = "block";
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.style.display = "none";
        }, 3000);
    }

    // Log that app initialized successfully
    console.log("MD Filemaker initialized.");

})();
