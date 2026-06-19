import express from "express";
import cors from "cors";
import { createOpencodeClient } from "@opencode-ai/sdk";
import { spawn, exec } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";
import dotenv from "dotenv";
import { promisify } from "util";
import { fileURLToPath } from "url";

dotenv.config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Expose public folder for dashboard
app.use(express.static(path.join(__dirname, "public")));

const OPENCODE_PORT = process.env.OPENCODE_PORT || 3333;
const PROXY_PORT = process.env.PORT || 4000;
const BASE = `http://127.0.0.1:${OPENCODE_PORT}`;
const client = createOpencodeClient({ url: BASE });

// Load local configuration
const API_KEY = process.env.API_KEY || "aetherix-sk-master-9f3a7b2e1d";
const STRICT_AUTH = process.env.STRICT_AUTH === "true"; // If true, requires auth even on localhost

// Dynamic Models Cache
let cachedModels = [];
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds cache

// Fetch models dynamically from OpenCode CLI
async function getAvailableModels() {
  const now = Date.now();
  if (cachedModels.length > 0 && now - lastCacheTime < CACHE_TTL) {
    return cachedModels;
  }

  try {
    const { stdout } = await execAsync("opencode models");
    const lines = stdout.split("\n");
    const parsedModels = [];

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("Available models:") || line.includes("default")) {
        // Skip header lines or help texts
        continue;
      }

      // Handle brackets or comments like "opencode/big-pickle (default)"
      const cleanId = line.split(" ")[0].trim();
      if (cleanId.startsWith("opencode/")) {
        const namePart = cleanId.replace("opencode/", "");
        // Clean name (e.g. deepseek-v4-flash-free -> Deepseek V4 Flash Free)
        const cleanName = namePart
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        parsedModels.push({
          id: cleanId,
          name: cleanName,
          vision: cleanId.includes("vision") || cleanId.includes("nano") || cleanId.includes("gpt"),
        });
      }
    }

    if (parsedModels.length > 0) {
      cachedModels = parsedModels;
      lastCacheTime = now;
    }
  } catch (err) {
    console.error("[Proxy] Error fetching models from CLI:", err.message);
    // Fallback list of models if CLI query fails
    if (cachedModels.length === 0) {
      return [
        { id: "opencode/big-pickle", name: "Big Pickle (Fallback)", vision: false },
        { id: "opencode/deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free (Fallback)", vision: false },
        { id: "opencode/mimo-v2.5-free", name: "Mimo V2.5 Free (Fallback)", vision: false },
        { id: "opencode/nemotron-3-ultra-free", name: "Nemotron 3 Ultra Free (Fallback)", vision: false },
        { id: "opencode/north-mini-code-free", name: "North Mini Code Free (Fallback)", vision: false },
      ];
    }
  }

  return cachedModels;
}

let opencodeProcess = null;
let isDaemonOnline = false;

// Helper: Check if OpenCode server is already running on the target port
function checkDaemonStatus() {
  return new Promise((resolve) => {
    const req = http.get(BASE + "/health", { timeout: 1000 }, (res) => {
      isDaemonOnline = res.statusCode === 200;
      resolve(isDaemonOnline);
    });
    req.on("error", () => {
      isDaemonOnline = false;
      resolve(false);
    });
    req.end();
  });
}

// Spawns the opencode serve daemon in the background
async function ensureDaemonOnline() {
  const online = await checkDaemonStatus();
  if (online) {
    console.log(`[Proxy] OpenCode serve daemon already running at ${BASE}`);
    return;
  }

  console.log(`[Proxy] OpenCode serve daemon not detected at ${BASE}. Spawning daemon...`);
  
  // Create a context directory for OpenCode
  const contextDir = path.join(__dirname, ".opencode_context");
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  // Attempt to spawn
  opencodeProcess = spawn("opencode", ["serve", "--port", String(OPENCODE_PORT)], {
    cwd: contextDir,
    shell: true,
    detached: false, // will terminate if proxy server terminates
  });

  opencodeProcess.stdout.on("data", (data) => {
    const output = data.toString().trim();
    if (output) console.log(`[OpenCode CLI] ${output}`);
  });

  opencodeProcess.stderr.on("data", (data) => {
    console.error(`[OpenCode CLI Error] ${data.toString().trim()}`);
  });

  opencodeProcess.on("close", (code) => {
    console.log(`[Proxy] OpenCode process terminated with exit code: ${code}`);
    isDaemonOnline = false;
  });

  // Wait a few seconds for the server to spin up
  console.log("[Proxy] Waiting for daemon to initialize...");
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const onlineCheck = await checkDaemonStatus();
    if (onlineCheck) {
      console.log(`[Proxy] OpenCode serve daemon is online and verified at ${BASE}!`);
      return;
    }
  }

  console.warn(`[Proxy] Warning: OpenCode daemon failed to respond within 9 seconds. Please ensure 'opencode' is installed.`);
}

// Authentication Middleware
app.use("/v1", (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || "";
  const isLocal = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

  // Bypass authentication for localhost requests unless STRICT_AUTH is true
  if (isLocal && !STRICT_AUTH) {
    return next();
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return res.status(401).json({
      error: { message: "Missing API key. Use: Authorization: Bearer aetherix-sk-xxx", type: "auth_error" }
    });
  }

  if (token !== API_KEY) {
    return res.status(401).json({
      error: { message: "Invalid API key.", type: "auth_error" }
    });
  }

  next();
});

// GET /v1/models (Updated to be fully dynamic)
app.get("/v1/models", async (req, res) => {
  const dynamicModels = await getAvailableModels();
  res.json({
    object: "list",
    data: dynamicModels.map((m) => ({
      id: m.id,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "opencode-local-proxy",
    })),
  });
});

// POST /v1/chat/completions
app.post("/v1/chat/completions", async (req, res) => {
  const { model, messages, temperature, max_tokens } = req.body;
  const dynamicModels = await getAvailableModels();
  
  // Verify model exists in our active models list
  const defaultModel = dynamicModels[0]?.id || "opencode/big-pickle";
  const selectedModel = model || defaultModel;
  const startTime = Date.now();

  console.log(`[Proxy] Request received for model: ${selectedModel} (msgs: ${messages?.length || 0})`);

  try {
    // 1. Create a session on the local daemon
    const { data: session } = await client.session.create({
      baseUrl: BASE,
      body: { modelID: selectedModel },
    });

    // 2. Parse OpenAI messages to OpenCode prompt format
    const parts = [];
    let systemMsg = "";

    for (const msg of messages || []) {
      if (msg.role === "system") {
        systemMsg = msg.content;
        continue;
      }
      
      if (typeof msg.content === "string") {
        parts.push({ type: "text", text: `[${msg.role}]: ${msg.content}` });
      } else if (Array.isArray(msg.content)) {
        let textContent = "";
        const images = [];
        for (const part of msg.content) {
          if (part.type === "text") {
            textContent += part.text;
          } else if (part.type === "image_url") {
            const url = part.image_url?.url || part.image_url;
            images.push(url);
          }
        }
        let fullText = textContent;
        for (let i = 0; i < images.length; i++) {
          fullText += `\n![image${i + 1}](${images[i]})`;
        }
        parts.push({ type: "text", text: fullText });
      }
    }

    if (systemMsg) {
      parts.unshift({ type: "text", text: systemMsg });
    }
    
    if (parts.length === 0) {
      parts.push({ type: "text", text: "Hello" });
    }

    // 3. Prompt the session
    // We include temperature and maxTokens in the prompt body just in case the SDK parses them.
    const result = await client.session.prompt({
      baseUrl: BASE,
      path: { id: session.id },
      body: { 
        parts,
        config: {
          temperature: temperature !== undefined ? Number(temperature) : 0.7,
          maxTokens: max_tokens !== undefined ? Number(max_tokens) : 2048
        }
      },
    });

    // 4. Compile the output parts
    const responseParts = result?.data?.parts || [];
    const textParts = responseParts.filter((p) => p.type === "text").map((p) => p.text).join("");
    const assistantText = textParts || "No response generated by model.";
    const info = result?.data?.info || {};
    const tokens = info.tokens || {};
    const elapsed = Date.now() - startTime;

    console.log(`[Proxy] ✅ Completed prompt in ${elapsed}ms. Tokens: ${tokens.total || 0}`);

    res.json({
      id: `chatcmpl-${session.id || Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: info.modelID || selectedModel,
      choices: [{
        index: 0,
        message: { role: "assistant", content: assistantText },
        finish_reason: info.finish || "stop",
      }],
      usage: {
        prompt_tokens: tokens.input || 0,
        completion_tokens: tokens.output || 0,
        total_tokens: tokens.total || 0,
      },
    });

    // Clean up session asynchronously
    client.session.delete({ baseUrl: BASE, path: { id: session.id } }).catch(() => {});
  } catch (err) {
    console.error(`[Proxy] ❌ Session Error:`, err.message);
    res.status(500).json({ error: { message: err.message, type: "proxy_error" } });
  }
});

// GET /health
app.get("/health", async (req, res) => {
  const daemonOnline = await checkDaemonStatus();
  res.json({
    status: "ok",
    service: "Aetherix Local Proxy Gateway",
    proxyPort: PROXY_PORT,
    daemonPort: OPENCODE_PORT,
    daemonOnline,
    uptime: process.uptime(),
  });
});

// Start proxy server
app.listen(PROXY_PORT, "0.0.0.0", async () => {
  const dynamicModels = await getAvailableModels();
  console.log("");
  console.log("=".repeat(60));
  console.log(`  🔮 Aetherix Local OpenCode Proxy Gateway (Dynamic Version)`);
  console.log("=".repeat(60));
  console.log(`  Local Endpoint:   http://localhost:${PROXY_PORT}/v1`);
  console.log(`  Dashboard UI:     http://localhost:${PROXY_PORT}`);
  console.log(`  Listen Mode:      All interfaces (0.0.0.0)`);
  console.log(`  Bypass LocalAuth: ${!STRICT_AUTH ? "ENABLED" : "DISABLED"}`);
  console.log(`  API Key:          ${API_KEY}`);
  console.log(`  Detected Models:  ${dynamicModels.map(m => m.id).join(", ")}`);
  console.log("=".repeat(60));
  
  // Ensure the local OpenCode Daemon is spun up
  await ensureDaemonOnline();
});

// Graceful cleanup on exit
process.on("SIGINT", () => {
  console.log("\n[Proxy] Shutting down. Stopping daemon...");
  if (opencodeProcess) {
    opencodeProcess.kill();
  }
  process.exit(0);
});
