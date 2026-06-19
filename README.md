# 🔮 Aetherix Local OpenCode Proxy Gateway

A portable, developer-friendly local proxy server that exposes free OpenCode AI models as a standard, OpenAI-compatible API endpoint (`http://localhost:4000/v1`). 

Turn your local PC into an AI inference instance, configure it as your editor autocomplete engine (VS Code / Cursor), or share it with friends and teammates.

---

## 🚀 Key Features

* **Zero-Config Daemon Spawning:** The proxy automatically detects and spins up the local `opencode serve` server in the background. No need to manage multiple terminal tabs.
* **OpenAI Spec Compatible:** Implements standard `/v1/chat/completions` and `/v1/models` endpoints. Integrates seamlessly with standard OpenAI libraries and plugins.
* **Premium Web Dashboard:** Visually monitor your connection health, read integration docs, and chat directly with models in a premium, glassmorphic built-in **Playground Chat UI**.
* **One-Click Remote Sharing:** Share your local instance models with colleagues or mobile devices across the web using a secure public tunnel via `npm run share`.

---

## 🛠️ Prerequisites

1. **Node.js** (v18+) installed.
2. **OpenCode CLI** installed:
   * **macOS/Linux:** `curl -sSf https://opencode.ai/install.sh | sh`
   * **Windows:** Download installer from [opencode.ai](https://opencode.ai).
3. **OpenCode Authentication:**
   * Open your terminal and run:
     ```bash
     opencode login
     ```
   * Authenticate your account to enable the free model pool.

---

## 📦 Setup & Installation

1. Clone or download this repository to your computer.
2. Run the platform-specific installer to configure dependencies:
   * **Windows:** Double-click `setup.bat` (or run in cmd).
   * **macOS/Linux:** Run `bash setup.sh`.
3. Boot up the gateway:
   ```bash
   npm start
   ```
4. Access the Dashboard and Playground at: **[http://localhost:4000](http://localhost:4000)**.

---

## 🌐 Sharing Your AI Instance (Port Forwarding)

To share your local models with another PC or friend over the internet, simply run:
```bash
npm run share
```
This automatically establishes a secure tunnel using Localtunnel and displays a public URL (e.g. `https://aetherix-local-xxx.loca.lt`). 

Your friend can use this URL as their `baseURL` to run completions off of your machine!
*(Note: To restrict access when exposing your server publicly, edit the `.env` settings below to require API key authorization)*.

---

## ⚙️ Configuration (.env)

Customize your setup by creating a `.env` file in the root folder:

```env
# Custom port for the proxy server
PORT=4000

# Custom port for the background OpenCode daemon
OPENCODE_PORT=3333

# Custom API Key required for unauthorized/remote requests
API_KEY=aetherix-sk-master-9f3a7b2e1d

# Require authentication header even for local requests (true/false)
STRICT_AUTH=false
```

---

## 💻 Editor Integrations

### VS Code (Continue Extension)
Open your `~/.continue/config.json` configuration file and add:
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

### Cursor IDE
1. Open **Settings > Models**.
2. Under **OpenAI API Key**, click **Override OpenAI Base URL**.
3. Set base URL to `http://localhost:4000/v1`.
4. Enter the key `aetherix-sk-master-9f3a7b2e1d`.
5. Add model names `opencode/gpt-5-nano` and `opencode/big-pickle`.

---

## 📜 License
MIT License. Created by Aetherix Core.
