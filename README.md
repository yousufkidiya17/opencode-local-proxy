# 🔮 Aetherix Local OpenCode Proxy Gateway

<p align="center">
  <img src="https://img.shields.io/github/license/yousufkidiya17/opencode-local-proxy?style=for-the-badge&color=8b5cf6" alt="License" />
  <img src="https://img.shields.io/github/stars/yousufkidiya17/opencode-local-proxy?style=for-the-badge&color=3b82f6" alt="Stars" />
  <img src="https://img.shields.io/github/forks/yousufkidiya17/opencode-local-proxy?style=for-the-badge&color=10b981" alt="Forks" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-blue?style=for-the-badge&logo=node.js" alt="Node.js version" />
</p>

---

A portable, ultra-fast **OpenAI-compatible API Gateway** designed to run fully on your local machine. It automatically manages your local OpenCode daemon background process, translates standard chat completion prompts, and exposes a premium glassmorphic playground dashboard.

With this setup, **your local PC acts as a secure, high-speed AI inference instance**—allowing you to call OpenCode's free model catalog (`GPT-5 Nano`, `Big Pickle`, `DeepSeek V4`, `Nemotron`) locally, or share them securely across the internet.

---

## 🌌 System Architecture Flow

```
                      ┌─────────────────────────────────────────┐
                      │    Client App (Cursor / Continue IDE)   │
                      └────────────────────┬────────────────────┘
                                           │ (1) POST /v1/chat/completions (Port 4000)
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    Aetherix Local Gateway Proxy (:4000) │
                      └────────────────────┬────────────────────┘
                                           │ (2) Auto-spawns & communicates
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │     Local OpenCode Serve CLI (:3333)    │
                      └────────────────────┬────────────────────┘
                                           │ (3) Executes on free models
                                           ▼
                                🤖 [GPT-5/Pickle/DeepSeek]
```

---

## ✨ Core Features

* **🔌 Frictionless OpenAI Compatibility:** Drop-in replacement for standard OpenAI client libraries. Just point your `baseURL` to `http://localhost:4000/v1`.
* **🧠 Zero-Config Daemon Management:** The gateway automatically starts and monitors the local `opencode serve` process on boot. It gracefully shuts down the background daemon when terminated.
* **🌐 Secure Sharing (Tunneling):** Want to expose your local models to another computer or mobile device? Expose it securely to the world with a single command.
* **⚡ Intuitively Bypassed Local Auth:** Localhost requests bypass API-key checks automatically to save developer configuration steps.
* **🔮 Premium Glassmorphism Dashboard:** Exposes a gorgeous, dark-themed dashboard at root `http://localhost:4000` with real-time status indicators and a **built-in playground chat client**.

---

## 🛠️ Prerequisites

> [!IMPORTANT]
> **OpenCode Account and CLI Auth Required:**
> 1. **Node.js** (v18.0.0 or higher) must be installed.
> 2. **OpenCode CLI** must be installed:
>    * *macOS/Linux:* `curl -sSf https://opencode.ai/install.sh | sh`
>    * *Windows:* Install the CLI executable from the official [OpenCode site](https://opencode.ai).
> 3. **Login session:** Authenticate your CLI locally before running:
>    ```bash
>    opencode login
>    ```

---

## 📥 Setup & Installation

### 1. Clone & Install
```bash
git clone https://github.com/yousufkidiya17/opencode-local-proxy.git
cd opencode-local-proxy
```

### 2. Configure Environment (Optional)
Run the automated setups to install all dependencies and verify environment paths:
* **Windows:** Double-click or run `setup.bat` in CMD/PowerShell.
* **macOS/Linux:** Run `bash setup.sh` in your terminal.

---

## 🚀 Running the Gateway

Start both the proxy gateway and background daemon with one command:
```bash
npm start
```
Once started:
* **Local API endpoint is live at:** `http://localhost:4000/v1`
* **Premium Dashboard UI is live at:** `http://localhost:4000`

---

## 🌐 Instant Remote Sharing

To share your local models with another device (or a friend across the internet) run:
```bash
npm run share
```
This spawns a secure public tunnel via Localtunnel. Simply copy the generated public URL (e.g. `https://aetherix-ai-tunnel.loca.lt`) and use it in your remote configs.

---

## ⚙️ Advanced Configuration (`.env`)

You can create a `.env` file in the root directory to customize parameters:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port of the local gateway proxy server |
| `OPENCODE_PORT` | `3333` | Port of the local OpenCode daemon server |
| `API_KEY` | `aetherix-sk-master-9f3a7b2e1d` | Token required for remote/non-localhost connections |
| `STRICT_AUTH` | `false` | Set to `true` to require authentication headers even for localhost |

---

## 🧩 IDE Integrations

### VS Code (Continue Extension)
Add the following blocks to your `~/.continue/config.json` configuration file:
```json
{
  "models": [
    {
      "title": "Local GPT-5 Nano",
      "provider": "openai",
      "model": "opencode/gpt-5-nano",
      "apiBase": "http://localhost:4000/v1",
      "apiKey": "aetherix-sk-master-9f3a7b2e1d"
    },
    {
      "title": "Local Big Pickle",
      "provider": "openai",
      "model": "opencode/big-pickle",
      "apiBase": "http://localhost:4000/v1",
      "apiKey": "aetherix-sk-master-9f3a7b2e1d"
    }
  ]
}
```

### Cursor Editor
1. Navigate to **Cursor Settings > Models**.
2. Scroll to **OpenAI API Key** and click **Override OpenAI Base URL**.
3. Set the override base URL to `http://localhost:4000/v1`.
4. Enter the default key `aetherix-sk-master-9f3a7b2e1d`.
5. Under model selectors, add your desired targets: `opencode/gpt-5-nano`, `opencode/big-pickle`.

---

## 📜 SDK Snippets

### Python (OpenAI Library)
```python
from openai import OpenAI

# Connect directly to your local instance
client = OpenAI(
    base_url="http://localhost:4000/v1",
    api_key="aetherix-sk-master-9f3a7b2e1d"
)

response = client.chat.completions.create(
    model="opencode/big-pickle",
    messages=[{"role": "user", "content": "Explain Quicksort algorithm in short."}]
)

print(response.choices[0].message.content)
```

### Node.js (OpenAI SDK)
```javascript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:4000/v1",
  apiKey: "aetherix-sk-master-9f3a7b2e1d"
});

const chatCompletion = await client.chat.completions.create({
  model: "opencode/gpt-5-nano",
  messages: [{ role: "user", content: "Tell me a space joke." }]
});

console.log(chatCompletion.choices[0].message.content);
```

---

## 📄 License
Licensed under the [MIT License](file:///d:/x/opencode-local-proxy/LICENSE). Created by **Aetherix Core**.
