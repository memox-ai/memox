# <img src="./dashboard/public/logo.svg" alt="Memox Logo" width="38" style="vertical-align: middle;" /> memox

> Enterprise-grade, universal, polyglot memory bridge for AI agents.

**memox** acts as a unified memory router, policies manager, and adapter bridge for agentic workflows. It enables your AI agents to persist, scrub, route, and load contextually relevant memories across multiple vector databases, memory frameworks, and third-party services.

---

## Key Features

- **Polyglot Adapters**: Seamless integration with Postgres (with `pgvector`), Redis (Redis Stack/Search), Mem0, and Zep.
- **Intent-Based Routing**: Intelligent distribution of read/write memory payloads to the appropriate storage backends.
- **Automatic Fallback & Mocking**: Zero-config local development with mock adapters and in-memory fallbacks if services are not configured.
- **Built-in Policies**: 
  - **PII Scrubbing**: Regular expression-based automatic redaction of sensitive credentials, API keys, SSNs, etc.
  - **TTL Enforcement**: Time-To-Live support per memory or default policy.
- **Local Developer Dashboard**: A rich, premium dashboard styled like Shadcn UI built with React + TailwindCSS to monitor latency, success rates, session statistics, and token metrics.
- **Model Context Protocol (MCP)**: Native stdio-based MCP server integration for agent clients like Claude Desktop.
- **CLI Utilities**: Start, init, write, and load memories straight from your terminal.

---

## Table of Contents
- [Getting Started & Instance Setup](#getting-started--instance-setup)
- [Configuration Resolution](#configuration-resolution)
- [CLI Reference](#cli-reference)
- [Model Context Protocol (MCP) Integration](#model-context-protocol-mcp-integration)
- [SDK Usage](#sdk-usage)
  - [Node.js Client (SDK)](#nodejs-client-sdk)
  - [Python Client (SDK)](#python-client-sdk)
- [REST API Reference](#rest-api-reference)

---

## Getting Started & Instance Setup

### 1. Run via Docker Compose (Recommended)
The project includes a unified [docker-compose.yml](file:///Users/emmanuelf/2026/memox/docker-compose.yml) orchestrating Postgres with `pgvector`, Redis Stack (with Redis Search module), and the memox API wrapper.

To spin up the services:
```bash
docker compose up -d
```
This starts:
* **Postgres Database**: `localhost:5432`
* **Redis Stack**: `localhost:6379`
* **memox REST API & Dashboard**: `http://localhost:3000`

### 2. Local Setup (Without Docker)
Make sure you have Node.js (v18+) installed.

#### Install dependencies & Build
```bash
npm install
npm run build
```

#### Bootstrapping configurations
Run the init command to bootstrap the default `.memox` directories:
```bash
# Initialize a local config folder in the current workspace directory
npm run dev -- init --local

# Or initialize a global configuration folder (~/.memox)
npm run dev -- init
```

This creates:
- `.memox/config.yaml` — Instance and database configuration
- `.memox/history.db` — SQLite database storing memory routing logs and metrics

#### Start the Server
```bash
npm run start
# Or for development reload:
npm run dev -- start
```
The REST API server will start listening at `http://localhost:3000` and will statically serve the React developer dashboard frontend.

---

## Configuration Resolution

The router resolves config files automatically in the following order:
1. **Local Repository Directory**: Look for `.memox/config.yaml` in the current working directory (`process.cwd()`).
2. **Global Fallback**: Fall back to the home directory under `~/.memox/config.yaml`.

### Default configuration schema:
```yaml
router:
  primaryProvider: postgres
  fallbackProvider: redis
  enableAuditLogs: true

policies:
  piiScrubbing:
    enabled: true
    patterns: []
  ttl:
    enforceTtl: true
    defaultTtlSeconds: 3600

databases:
  postgres:
    connectionString: ""
    tableName: memox_memories
    vectorDimension: 1536
  redis:
    url: ""
    indexName: memox_idx
    vectorDimension: 1536

external:
  mem0:
    apiKey: ""
  zep:
    apiKey: ""
    apiUrl: "https://api.getzep.com"
```

---

## CLI Reference

The CLI is implemented in [src/cli/main.ts](file:///Users/emmanuelf/2026/memox/src/cli/main.ts).

- **Initialize Config**:
  ```bash
  memox init [--local]
  ```
- **Start REST Server**:
  ```bash
  memox start [-p <port>]
  ```
- **Run MCP Server**:
  ```bash
  memox mcp
  ```
- **Write Memory directly**:
  ```bash
  memox write --session <session-id> --content <memory-text> [--ttl <ttl-seconds>]
  ```
- **Load Memory directly**:
  ```bash
  memox load --session <session-id> --query <search-text> [--limit <number>]
  ```

---

## Model Context Protocol (MCP) Integration

You can integrate `memox` as a tool provider inside any MCP host (such as Claude Desktop). The MCP server is defined in [src/mcp/server.ts](file:///Users/emmanuelf/2026/memox/src/mcp/server.ts).

Add the following to your Claude Desktop config (e.g. `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "memox": {
      "command": "memox",
      "args": ["mcp"]
    }
  }
}
```

### Provided Tools:
- `write_memory`: Stores user/agent memories under a specific session ID.
- `load_memory`: Searches and retrieves matching memories for a given query under a specific session ID.

---

## SDK Usage

### Node.js Client (SDK)

The Node.js SDK is located in [sdks/nodejs](file:///Users/emmanuelf/2026/memox/sdks/nodejs). It exposes the `MemoxClient` class.

#### Installation
```bash
cd sdks/nodejs
npm install
npm run build
```

#### Usage Example
```typescript
import { MemoxClient } from 'memox-sdk';

const client = new MemoxClient('http://localhost:3000');

async function run() {
  // 1. Write Memory
  const success = await client.write(
    'session-abc-123',
    'User prefers dark mode and likes typescript.',
    { source: 'web-onboarding' },
    3600 // optional TTL in seconds
  );

  // 2. Load Memory Context
  const memories = await client.load('session-abc-123', 'preferences', 5);
  console.log('Search results:', memories);
}

run();
```

#### LangGraph Node Integration
The SDK provides a native helper for LangGraph to automatically persist state updates:
```typescript
import { MemoxClient } from 'memox-sdk';

const client = new MemoxClient('http://localhost:3000');

// Generate a LangGraph node function for automatic persistence
const memoxNode = client.getLangGraphNode('session-abc-123');

// Include `memoxNode` in your LangGraph workflow nodes
```

---

### Python Client (SDK)

The Python SDK is located in [sdks/python](file:///Users/emmanuelf/2026/memox/sdks/python). It exposes the `MemoxClient` and a LangChain runnable wrapper `MemoxRunnable`.

#### Installation
```bash
cd sdks/python
pip install .
```

#### Usage Example (Sync & Async)
```python
import asyncio
from memox import MemoxClient

client = MemoxClient("http://localhost:3000")

# Sync Usage
success = client.write(
    session_id="session-xyz-456", 
    content="User is a python developer who works on macOS.",
    metadata={"department": "engineering"}
)
results = client.load(session_id="session-xyz-456", query="dev setup")
print("Sync results:", results)

# Async Usage
async def main():
    await client.awrite(
        session_id="session-xyz-456",
        content="User also likes using FastAPI."
    )
    async_results = await client.aload(session_id="session-xyz-456", query="frameworks")
    print("Async results:", async_results)

asyncio.run(main())
```

#### LangChain Integration
`memox` integrates seamlessly into LangChain pipelines using the `MemoxRunnable` class:
```python
from memox import MemoxClient, MemoxRunnable

client = MemoxClient("http://localhost:3000")

# Create a runnable wrapper to write inputs into session memory
write_runnable = MemoxRunnable(client, session_id="session-xyz-456", action="write")

# Create a runnable wrapper to load memories from session memory
load_runnable = MemoxRunnable(client, session_id="session-xyz-456", action="load")

# Chain it inside LangChain
# chain = prompt | model | write_runnable | parser
```

---

## REST API Reference

The server exposes endpoints documented in [src/api/server.ts](file:///Users/emmanuelf/2026/memox/src/api/server.ts).

### 1. Write Memory
* **Path**: `/v1/memory/write`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Body**:
  ```json
  {
    "sessionId": "session-123",
    "content": "User prefers using SQLite for local testing",
    "metadata": { "platform": "desktop" },
    "ttl_seconds": 1800
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "Memory routed successfully"
  }
  ```

### 2. Load Memory
* **Path**: `/v1/memory/load`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Body**:
  ```json
  {
    "sessionId": "session-123",
    "query": "local database preferences",
    "limit": 5
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "memories": [
      {
        "id": "uuid-string",
        "sessionId": "session-123",
        "content": "User prefers using SQLite for local testing",
        "score": 0.89,
        "timestamp": "2026-06-17T21:14:00.000Z"
      }
    ]
  }
  ```

---

## License

This project is licensed under the MIT License. See [LICENSE](file:///Users/emmanuelf/2026/memox/LICENSE) for details.
