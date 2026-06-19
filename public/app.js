document.addEventListener("DOMContentLoaded", () => {
  // --- Navigation & Tab Switching ---
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");
  const pageTitle = document.getElementById("page-title");

  const tabTitles = {
    dashboard: "Dashboard Overview",
    playground: "AI Model Playground",
    docs: "Integration Guide"
  };

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");
      
      navItems.forEach(nav => nav.classList.remove("active"));
      tabContents.forEach(tab => tab.classList.remove("active"));
      
      item.classList.add("active");
      document.getElementById(`tab-${targetTab}`).classList.add("active");
      pageTitle.textContent = tabTitles[targetTab];
    });
  });

  // --- Sub-tabs for Code Snippets ---
  const snippetTabs = document.querySelectorAll(".snippet-tab");
  const snippetContents = document.querySelectorAll(".snippet-content");

  snippetTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetSnippet = tab.getAttribute("data-snippet");
      
      snippetTabs.forEach(t => t.classList.remove("active"));
      snippetContents.forEach(c => c.classList.remove("active"));
      
      tab.classList.add("active");
      document.getElementById(`snippet-${targetSnippet}`).classList.add("active");
    });
  });

  // --- System Status Polling ---
  const daemonPulse = document.getElementById("daemon-pulse");
  const daemonStatusTxt = document.getElementById("daemon-status-txt");
  const uptimeValue = document.getElementById("uptime-value");

  function formatUptime(seconds) {
    if (!seconds) return "0s";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  }

  async function pollStatus() {
    try {
      const res = await fetch("/health");
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      
      // Update Daemon Indicators
      if (data.daemonOnline) {
        daemonPulse.className = "pulse-dot green";
        daemonStatusTxt.textContent = `Online (Port ${data.daemonPort})`;
      } else {
        daemonPulse.className = "pulse-dot red";
        daemonStatusTxt.textContent = "Offline (Check Console)";
      }
      
      // Update Uptime
      uptimeValue.textContent = formatUptime(data.uptime);
    } catch (err) {
      daemonPulse.className = "pulse-dot red";
      daemonStatusTxt.textContent = "Offline";
      uptimeValue.textContent = "Offline";
    }
  }

  // Poll immediately, then every 3 seconds
  pollStatus();
  setInterval(pollStatus, 3000);

  // --- Playground Chat System ---
  const chatMessagesContainer = document.getElementById("chat-messages-container");
  const chatInput = document.getElementById("chat-input-textarea");
  const sendBtn = document.getElementById("send-chat-btn");
  const clearBtn = document.getElementById("clear-chat-btn");
  const modelSelect = document.getElementById("play-model-select");
  const systemPromptInput = document.getElementById("play-system-prompt");

  let conversationHistory = [];

  function appendMessage(role, content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;
    
    const messageContentDiv = document.createElement("div");
    messageContentDiv.className = "message-content";
    
    // Simple rendering of code blocks inside assistant output
    if (role === "assistant") {
      messageContentDiv.innerHTML = formatMarkdown(content);
    } else {
      messageContentDiv.textContent = content;
    }
    
    messageDiv.appendChild(messageContentDiv);
    chatMessagesContainer.appendChild(messageDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  // Simple formatter to convert markdown-style code blocks and formatting to HTML
  function formatMarkdown(text) {
    if (!text) return "";
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace ```code``` with <pre><code>code</code></pre>
    escaped = escaped.replace(/```([\s\S]*?)```/g, (match, p1) => {
      // Try to strip potential language identifier on the first line
      const lines = p1.split("\n");
      let code = p1;
      if (lines[0] && lines[0].length < 15 && !lines[0].includes(" ")) {
        code = lines.slice(1).join("\n");
      }
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Replace `code` with <code>code</code>
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Replace linebreaks with <br> (excluding inside pre tags)
    const blocks = escaped.split(/(<pre>[\s\S]*?<\/pre>)/);
    const formattedBlocks = blocks.map((block, index) => {
      // Odd indices are the pre tags, keep them intact
      if (index % 2 !== 0) return block;
      return block.replace(/\n/g, "<br>");
    });

    return formattedBlocks.join("");
  }

  async function handleSend() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    // Append user message
    appendMessage("user", prompt);
    chatInput.value = "";
    
    // Update local chat history state
    conversationHistory.push({ role: "user", content: prompt });

    // Insert loading indicator bubble
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message assistant loading-bubble";
    loadingDiv.innerHTML = `<div class="message-content"><em>🔮 Thinking...</em></div>`;
    chatMessagesContainer.appendChild(loadingDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    // Disable input interface
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Prepare message payload
    const systemPrompt = systemPromptInput.value.trim();
    const messagesPayload = [];
    if (systemPrompt) {
      messagesPayload.push({ role: "system", content: systemPrompt });
    }
    messagesPayload.push(...conversationHistory);

    try {
      const response = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelSelect.value,
          messages: messagesPayload
        })
      });

      // Remove loading indicator bubble
      chatMessagesContainer.removeChild(loadingDiv);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || "Failed to generate completions.");
      }

      const data = await response.json();
      const assistantReply = data.choices[0]?.message?.content || "(Empty response)";
      
      appendMessage("assistant", assistantReply);
      conversationHistory.push({ role: "assistant", content: assistantReply });
    } catch (err) {
      if (chatMessagesContainer.contains(loadingDiv)) {
        chatMessagesContainer.removeChild(loadingDiv);
      }
      appendMessage("system", `Error: ${err.message}`);
    } finally {
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  // Send bindings
  sendBtn.addEventListener("click", handleSend);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Clear chat logs
  clearBtn.addEventListener("click", () => {
    chatMessagesContainer.innerHTML = `
      <div class="message system">
        <div class="message-content">Chat history cleared. Select a model and start a new conversation!</div>
      </div>
    `;
    conversationHistory = [];
  });
});

// --- Copy Snippets Utilities ---
window.copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    const copyBtns = document.querySelectorAll(".copy-btn");
    copyBtns.forEach(btn => {
      const originalText = btn.textContent;
      btn.textContent = "Copied!";
      btn.style.background = "#10b981";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = "";
      }, 1500);
    });
  });
};
