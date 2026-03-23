/**
 * NLWeb Chat Widget for IndentiaDB documentation
 *
 * Floating chat that queries an NLWeb endpoint via SSE.
 * Configure the endpoint via the data attribute on <body>
 * or fall back to window.__NLWEB_ENDPOINT.
 */
(function () {
  "use strict";

  /* ── Configuration ─────────────────────────────────────────── */

  var ENDPOINT =
    document.body.getAttribute("data-nlweb-endpoint") ||
    window.__NLWEB_ENDPOINT ||
    "/api/ask";

  /* ── DOM construction ──────────────────────────────────────── */

  var CHAT_SVG =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';
  var CLOSE_SVG =
    '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var SEND_SVG =
    '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  var DB_SVG =
    '<svg viewBox="0 0 24 24"><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zM4 17v-2.34c1.52 1.1 4.28 1.84 8 1.84s6.48-.74 8-1.84V17c0 .5-2.13 2-6 2s-6-1.5-6-2zm0-5v-2.34c1.52 1.1 4.28 1.84 8 1.84s6.48-.74 8-1.84V12c0 .5-2.13 2-6 2s-6-1.5-6-2z"/></svg>';

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  /* FAB */
  var fab = el("button", "nlweb-fab");
  fab.setAttribute("data-open", "false");
  fab.setAttribute("aria-label", "Ask IndentiaDB");
  fab.innerHTML =
    '<span class="nlweb-icon-chat">' +
    CHAT_SVG +
    "</span>" +
    '<span class="nlweb-icon-close">' +
    CLOSE_SVG +
    "</span>";

  /* Panel */
  var panel = el("div", "nlweb-panel");
  panel.setAttribute("data-visible", "false");

  var header = el("div", "nlweb-header");
  header.innerHTML =
    '<div class="nlweb-header-icon">' +
    DB_SVG +
    "</div>" +
    '<div><div class="nlweb-header-title">Ask IndentiaDB</div>' +
    '<div class="nlweb-header-subtitle">AI-powered documentation search</div></div>';

  var messages = el("div", "nlweb-messages");
  var welcome = el("div", "nlweb-welcome");
  welcome.innerHTML =
    "<strong>Hi! Ask me anything about IndentiaDB.</strong>" +
    "I can help with SPARQL, SurrealQL, vector search, deployment, security, and more.";
  messages.appendChild(welcome);

  var inputArea = el("div", "nlweb-input-area");
  var input = document.createElement("textarea");
  input.className = "nlweb-input";
  input.placeholder = "Ask a question\u2026";
  input.rows = 1;
  var sendBtn = el("button", "nlweb-send", SEND_SVG);
  sendBtn.setAttribute("aria-label", "Send");
  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(inputArea);

  document.body.appendChild(panel);
  document.body.appendChild(fab);

  /* ── State ──────────────────────────────────────────────────── */

  var isOpen = false;
  var isLoading = false;

  /* ── Toggle ─────────────────────────────────────────────────── */

  function toggle() {
    isOpen = !isOpen;
    fab.setAttribute("data-open", String(isOpen));
    panel.setAttribute("data-visible", String(isOpen));
    if (isOpen) input.focus();
  }

  fab.addEventListener("click", toggle);

  /* ── Auto-resize textarea ───────────────────────────────────── */

  input.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 80) + "px";
  });

  /* ── Markdown-lite renderer ─────────────────────────────────── */

  function renderMarkdown(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      )
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");
  }

  /* ── Add message to chat ────────────────────────────────────── */

  function addMessage(text, role) {
    if (welcome.parentNode) welcome.remove();
    var msg = el("div", "nlweb-msg nlweb-msg-" + role);
    if (role === "bot") {
      msg.innerHTML = renderMarkdown(text);
    } else {
      msg.textContent = text;
    }
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  function addSources(sources, msgEl) {
    if (!sources || !sources.length) return;
    var src = el("div", "nlweb-sources");
    var html = '<div class="nlweb-sources-title">Sources</div>';
    sources.forEach(function (s) {
      var label = s.name || s.url || s;
      var href = s.url || s;
      html += '<a href="' + href + '" target="_blank" rel="noopener">' + label + "</a>";
    });
    src.innerHTML = html;
    msgEl.appendChild(src);
  }

  function showTyping() {
    var t = el("div", "nlweb-typing");
    t.innerHTML = "<span></span><span></span><span></span>";
    t.id = "nlweb-typing";
    messages.appendChild(t);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var t = document.getElementById("nlweb-typing");
    if (t) t.remove();
  }

  function showError(text) {
    var e = el("div", "nlweb-error", text);
    messages.appendChild(e);
    messages.scrollTop = messages.scrollHeight;
  }

  /* ── Send query ─────────────────────────────────────────────── */

  function send() {
    var query = input.value.trim();
    if (!query || isLoading) return;

    addMessage(query, "user");
    input.value = "";
    input.style.height = "auto";
    isLoading = true;
    sendBtn.disabled = true;
    showTyping();

    // Include current page path as context
    var contextUrl = window.location.pathname;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        num_results: 5,
        context_url: contextUrl,
        streaming: true
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Server returned " + res.status);

        var contentType = res.headers.get("content-type") || "";

        // SSE streaming response
        if (contentType.indexOf("text/event-stream") !== -1) {
          return handleSSE(res);
        }

        // NDJSON streaming
        if (contentType.indexOf("application/x-ndjson") !== -1) {
          return handleNDJSON(res);
        }

        // Plain JSON
        return res.json().then(function (data) {
          hideTyping();
          var answer = data.answer || data.text || JSON.stringify(data);
          var msgEl = addMessage(answer, "bot");
          if (data.sources) addSources(data.sources, msgEl);
        });
      })
      .catch(function (err) {
        hideTyping();
        showError("Could not reach the NLWeb server. " + err.message);
      })
      .finally(function () {
        isLoading = false;
        sendBtn.disabled = false;
      });
  }

  /* ── SSE handler ────────────────────────────────────────────── */

  function handleSSE(res) {
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    var answer = "";
    var sources = [];
    var msgEl = null;

    function process(result) {
      if (result.done) {
        hideTyping();
        if (!msgEl && answer) msgEl = addMessage(answer, "bot");
        if (msgEl && sources.length) addSources(sources, msgEl);
        return;
      }

      buffer += decoder.decode(result.value, { stream: true });
      var lines = buffer.split("\n");
      buffer = lines.pop();

      lines.forEach(function (line) {
        if (!line.startsWith("data: ")) return;
        var raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") return;

        try {
          var evt = JSON.parse(raw);

          if (evt.type === "item_details" || evt.answer) {
            answer = evt.answer || evt.text || answer;
            hideTyping();
            if (!msgEl) {
              msgEl = addMessage(answer, "bot");
            } else {
              msgEl.innerHTML = renderMarkdown(answer);
              messages.scrollTop = messages.scrollHeight;
            }
          }

          if (evt.type === "result_batch" && evt.results) {
            sources = evt.results.map(function (r) {
              return { url: r.url, name: r.name || r.description || r.url };
            });
          }

          // Delta streaming (token-by-token)
          if (evt.delta) {
            answer += evt.delta;
            hideTyping();
            if (!msgEl) {
              msgEl = addMessage(answer, "bot");
            } else {
              msgEl.innerHTML = renderMarkdown(answer);
              messages.scrollTop = messages.scrollHeight;
            }
          }
        } catch (_) {
          /* skip non-JSON lines */
        }
      });

      return reader.read().then(process);
    }

    return reader.read().then(process);
  }

  /* ── NDJSON handler ─────────────────────────────────────────── */

  function handleNDJSON(res) {
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    var answer = "";
    var sources = [];
    var msgEl = null;

    function process(result) {
      if (result.done) {
        hideTyping();
        if (!msgEl && answer) msgEl = addMessage(answer, "bot");
        if (msgEl && sources.length) addSources(sources, msgEl);
        return;
      }

      buffer += decoder.decode(result.value, { stream: true });
      var lines = buffer.split("\n");
      buffer = lines.pop();

      lines.forEach(function (line) {
        if (!line.trim()) return;
        try {
          var evt = JSON.parse(line);
          if (evt.answer || evt.text) {
            answer = evt.answer || evt.text;
            hideTyping();
            if (!msgEl) {
              msgEl = addMessage(answer, "bot");
            } else {
              msgEl.innerHTML = renderMarkdown(answer);
              messages.scrollTop = messages.scrollHeight;
            }
          }
          if (evt.sources) sources = evt.sources;
        } catch (_) {}
      });

      return reader.read().then(process);
    }

    return reader.read().then(process);
  }

  /* ── Event listeners ────────────────────────────────────────── */

  sendBtn.addEventListener("click", send);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
})();
