#!/bin/bash
# Aetherix Local OpenCode Proxy Setup (macOS/Linux)
set -e

echo "======================================================="
echo "   Aetherix Local OpenCode Proxy Setup (Unix/macOS)"
echo "======================================================="
echo ""

# Step 1: Install Dependencies
echo "[1/3] Installing NPM dependencies..."
npm install
echo "Dependencies installed successfully."
echo ""

# Step 2: Check for OpenCode CLI
echo "[2/3] Checking for OpenCode CLI..."
if ! command -v opencode &> /dev/null; then
    echo "WARNING: 'opencode' command was not found in your PATH."
    echo ""
    echo "To install the OpenCode CLI automatically, run:"
    echo "--> curl -sSf https://opencode.ai/install.sh | sh"
    echo ""
    echo "After installing, please run 'opencode login' to authenticate."
    echo ""
else
    echo "OpenCode CLI found at $(which opencode)"
    echo ""
    echo "[Important] Please make sure you have logged in:"
    echo "--> opencode login"
    echo ""
fi

# Step 3: Instructions
echo "[3/3] Setup complete!"
echo "======================================================="
echo "To start the server and playground, run:"
echo "--> npm start"
echo ""
echo "Open http://localhost:4000 in your browser to test."
echo "======================================================="
