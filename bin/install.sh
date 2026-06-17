#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== memox MVP Daemon Installation ==="

# 1. Environment Checks
echo "Checking environment..."

# Node.js Check
if ! command -v node &> /dev/null; then
    echo "[-] Error: Node.js is not installed. Please install Node.js (v18+) to run memox."
    exit 1
else
    NODE_VERSION=$(node -v)
    echo "[+] Node.js is installed ($NODE_VERSION)"
fi

# NPM Check
if ! command -v npm &> /dev/null; then
    echo "[-] Error: npm is not installed."
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo "[+] npm is installed ($NPM_VERSION)"
fi

# Docker Check (Optional but recommended)
if ! command -v docker &> /dev/null; then
    echo "[*] Warning: Docker is not installed. Docker is optional but highly recommended if you wish to run local Postgres/Redis vector indexes."
else
    DOCKER_VERSION=$(docker --version)
    echo "[+] Docker is installed ($DOCKER_VERSION)"
fi

# 2. Build TypeScript Core
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Building project in $PROJECT_DIR..."

cd "$PROJECT_DIR"
npm install
npm run build

# Make CLI executable
chmod +x dist/cli/main.js

# 3. Bootstrap configuration via CLI init
echo "Bootstrapping configurations..."
node dist/cli/main.js init

# 4. Install binary globally
echo "Installing memox binary globally..."

# Try linking via npm first (which uses manifest bin field)
if npm link --force; then
    echo "[+] Successfully linked memox globally via npm link."
else
    # Fallback: create a manual script launcher
    echo "[*] npm link failed or requires root. Creating launcher script instead..."
    
    BIN_DIR="/usr/local/bin"
    if [ ! -w "$BIN_DIR" ]; then
        # If /usr/local/bin is not writable, fall back to home directory local bin
        BIN_DIR="$HOME/.local/bin"
        mkdir -p "$BIN_DIR"
    fi
    
    LAUNCHER_PATH="$BIN_DIR/memox"
    
    echo "#!/usr/bin/env bash" > "$LAUNCHER_PATH"
    echo "exec node \"$PROJECT_DIR/dist/cli/main.js\" \"\$@\"" >> "$LAUNCHER_PATH"
    chmod +x "$LAUNCHER_PATH"
    
    echo "[+] Successfully installed global launcher at: $LAUNCHER_PATH"
    echo "Please ensure $BIN_DIR is in your shell PATH configuration."
fi

echo "========================================="
echo "memox daemon installation complete!"
echo "Run 'memox start' to launch the REST API."
echo "Run 'memox mcp' to launch the MCP stdio wrapper."
echo "========================================="
