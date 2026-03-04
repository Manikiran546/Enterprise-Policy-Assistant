/**
 * Enterprise Policy Assistant – Frontend Logic
 * Handles file upload (drag-and-drop), chat messaging, and source citation rendering.
 */

(function () {
    "use strict";

    // ================================================================
    //  DOM Elements
    // ================================================================
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    const uploadProgress = document.getElementById("uploadProgress");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");
    const documentsSection = document.getElementById("documentsSection");
    const documentList = document.getElementById("documentList");
    const chatMessages = document.getElementById("chatMessages");
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");
    const chatInputWrapper = document.getElementById("chatInputWrapper");
    const welcomeContainer = document.getElementById("welcomeContainer");
    const statusDot = document.querySelector(".status-dot");
    const statusText = document.getElementById("statusText");
    const newSessionBtn = document.getElementById("newSessionBtn");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");

    // ================================================================
    //  State
    // ================================================================
    let sessionId = null;
    let isProcessing = false;

    // ================================================================
    //  Sidebar Toggle (Mobile)
    // ================================================================
    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", (e) => {
        if (
            window.innerWidth <= 768 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(e.target) &&
            e.target !== sidebarToggle
        ) {
            sidebar.classList.remove("open");
        }
    });

    // ================================================================
    //  Drag & Drop
    // ================================================================
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("drag-over");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) {
            handleFiles(fileInput.files);
        }
    });

    // ================================================================
    //  File Upload
    // ================================================================
    async function handleFiles(files) {
        if (isProcessing) return;
        isProcessing = true;

        // Show progress
        uploadProgress.style.display = "block";
        progressFill.style.width = "20%";
        progressText.textContent = "Uploading documents...";

        const formData = new FormData();
        if (sessionId) formData.append("session_id", sessionId);

        let validCount = 0;
        for (const file of files) {
            const ext = file.name.split(".").pop().toLowerCase();
            if (["pdf", "txt", "docx"].includes(ext)) {
                formData.append("files", file);
                validCount++;
            }
        }

        if (validCount === 0) {
            showUploadError("No valid files. Supported formats: PDF, TXT, DOCX");
            isProcessing = false;
            return;
        }

        progressFill.style.width = "50%";
        progressText.textContent = "Processing and indexing documents...";

        try {
            const res = await fetch("/upload", { method: "POST", body: formData });
            const data = await res.json();

            if (data.error) {
                showUploadError(data.error);
                isProcessing = false;
                return;
            }

            progressFill.style.width = "100%";
            progressText.textContent = "Documents indexed successfully!";

            sessionId = data.session_id;

            // Show loaded documents
            if (data.filenames) {
                for (const name of data.filenames) {
                    addDocumentToList(name);
                }
            }

            // Enable chat
            enableChat();

            // Show success message
            setTimeout(() => {
                showUploadSuccess(
                    `${data.documents_processed} document(s) processed, ${data.chunks_created} chunks indexed.`
                );
            }, 500);

            // Reset
            setTimeout(() => {
                uploadProgress.style.display = "none";
                progressFill.style.width = "0%";
            }, 2000);
        } catch (err) {
            showUploadError("Upload failed. Please check if the server is running.");
            console.error(err);
        }

        isProcessing = false;
        fileInput.value = "";
    }

    function addDocumentToList(name) {
        documentsSection.style.display = "block";
        const ext = name.split(".").pop().toLowerCase();
        const li = document.createElement("li");
        li.className = "document-item";
        li.innerHTML = `
            <div class="doc-icon ${ext}">${ext.toUpperCase()}</div>
            <span class="doc-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
        `;
        documentList.appendChild(li);
    }

    function showUploadSuccess(text) {
        // Remove any existing success/error messages
        const existing = document.querySelectorAll(".upload-success, .upload-error");
        existing.forEach((el) => el.remove());

        const div = document.createElement("div");
        div.className = "upload-success";
        div.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="upload-success-text">${escapeHtml(text)}</span>
        `;
        const uploadSection = document.querySelector(".upload-section");
        uploadSection.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }

    function showUploadError(text) {
        uploadProgress.style.display = "none";
        progressFill.style.width = "0%";

        const existing = document.querySelectorAll(".upload-success, .upload-error");
        existing.forEach((el) => el.remove());

        const div = document.createElement("div");
        div.className = "upload-error";
        div.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span class="upload-error-text">${escapeHtml(text)}</span>
        `;
        const uploadSection = document.querySelector(".upload-section");
        uploadSection.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }

    // ================================================================
    //  Chat
    // ================================================================
    function enableChat() {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInputWrapper.classList.remove("disabled");
        chatInput.placeholder = "Ask about your policy documents...";
        statusDot.classList.add("active");
        statusText.textContent = "Ready – Documents loaded";
    }

    function disableChat() {
        chatInput.disabled = true;
        sendBtn.disabled = true;
        chatInputWrapper.classList.add("disabled");
        chatInput.placeholder = "Upload documents first...";
        statusDot.classList.remove("active");
        statusText.textContent = "Upload documents to begin";
    }

    sendBtn.addEventListener("click", sendMessage);

    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
    });

    async function sendMessage() {
        const query = chatInput.value.trim();
        if (!query || isProcessing || !sessionId) return;

        // Hide welcome
        if (welcomeContainer) {
            welcomeContainer.style.display = "none";
        }

        // Add user message
        addMessage("user", query);

        // Clear input
        chatInput.value = "";
        chatInput.style.height = "auto";

        // Show typing indicator
        const typingEl = showTypingIndicator();

        isProcessing = true;
        sendBtn.disabled = true;

        try {
            const res = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, session_id: sessionId }),
            });
            const data = await res.json();

            // Remove typing indicator
            typingEl.remove();

            // Add assistant message
            addMessage("assistant", data.answer, data.sources || []);
        } catch (err) {
            typingEl.remove();
            addMessage(
                "assistant",
                "Sorry, I encountered an error. Please check if the server is running and try again."
            );
            console.error(err);
        }

        isProcessing = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }

    function addMessage(role, text, sources) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${role}`;

        const avatarLabel = role === "user" ? "You" : "AI";
        const avatarContent = role === "user" ? "U" : "AI";

        let sourcesHTML = "";
        if (sources && sources.length > 0) {
            const sourceItems = sources
                .map(
                    (s, i) => `
                <div class="source-item">
                    <span class="source-badge">Source ${i + 1}</span>
                    <div class="source-info">
                        <strong>${escapeHtml(s.document)}</strong> – Page ${s.page}
                        ${s.snippet ? `<div class="source-snippet">${escapeHtml(s.snippet)}</div>` : ""}
                    </div>
                </div>
            `
                )
                .join("");

            sourcesHTML = `
                <div class="sources-panel">
                    <button class="sources-toggle" onclick="this.classList.toggle('expanded'); this.nextElementSibling.classList.toggle('visible');">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                        ${sources.length} source(s) cited
                    </button>
                    <div class="sources-list">${sourceItems}</div>
                </div>
            `;
        }

        msgDiv.innerHTML = `
            <div class="message-avatar">${avatarContent}</div>
            <div class="message-content">
                <div class="message-bubble">${formatText(text)}</div>
                ${sourcesHTML}
            </div>
        `;

        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const div = document.createElement("div");
        div.className = "typing-indicator";
        div.innerHTML = `
            <div class="message-avatar" style="background: var(--gradient-primary); color: white;">AI</div>
            <div class="typing-dots">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        chatMessages.appendChild(div);
        scrollToBottom();
        return div;
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    // ================================================================
    //  New Session
    // ================================================================
    newSessionBtn.addEventListener("click", () => {
        sessionId = null;
        documentList.innerHTML = "";
        documentsSection.style.display = "none";
        chatMessages.innerHTML = "";

        // Re-add welcome
        chatMessages.innerHTML = `
            <div class="welcome-container" id="welcomeContainer">
                <div class="welcome-icon">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" stroke-width="1.5">
                        <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <h2 class="welcome-title">Welcome to PolicyAI</h2>
                <p class="welcome-desc">Upload your company policy documents and ask questions. I'll provide accurate answers grounded strictly in your documents.</p>
                <div class="welcome-features">
                    <div class="feature-card">
                        <div class="feature-icon">📄</div>
                        <div class="feature-text"><strong>Multi-Format</strong><span>PDF, DOCX, TXT</span></div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔍</div>
                        <div class="feature-text"><strong>Smart Retrieval</strong><span>RAG Fusion + Reranking</span></div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🛡️</div>
                        <div class="feature-text"><strong>Grounded Answers</strong><span>No hallucination</span></div>
                    </div>
                </div>
            </div>
        `;

        disableChat();
    });

    // ================================================================
    //  Utilities
    // ================================================================
    function escapeHtml(str) {
        const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
        return String(str).replace(/[&<>"']/g, (m) => map[m]);
    }

    function formatText(text) {
        // Basic markdown-like formatting
        let html = escapeHtml(text);

        // Bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Italic: *text*
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // Line breaks
        html = html.replace(/\n/g, "<br>");

        // Bullet points
        html = html.replace(/^[-•]\s(.+)/gm, "• $1");

        return html;
    }
})();
