# 🏢 OpenClaw Office

**Virtual AI Office Dashboard** — visualize your multi-agent workflows in real-time.

OpenClaw Office connects to your [OpenClaw](https://github.com/nichochar/openclaw) gateway and renders a live isometric office where each AI agent has a desk. Watch tasks fly between agents, see who's working, and track everything in real-time.

![OpenClaw Office Screenshot](docs/screenshot-placeholder.png)

## ✨ Features

- 🎮 **Isometric office view** with animated agent sprites
- 📬 **Flying task animations** — watch tasks get delegated between agents
- ⚡ **Real-time WebSocket** connection to OpenClaw Gateway
- 📊 **Dashboard stats** — requests, completions, agent activity
- 🎨 **Fully configurable** — define your own agents, colors, positions
- 🔌 **Telegram notifications** (optional)
- 💾 **SQLite storage** for request/event history

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/wickedapp/openclaw-office.git
cd openclaw-office

# Install dependencies
npm install

# Configure
cp openclaw-office.config.example.json openclaw-office.config.json
# Edit openclaw-office.config.json with your gateway token and agent definitions

# Run
npm run dev
```

Open [http://localhost:4200](http://localhost:4200) to see your office.

## ⚙️ Configuration

OpenClaw Office uses a layered config system:

1. **`openclaw-office.config.json`** (primary) — project root
2. **`.env.local`** — environment overrides
3. **Defaults** — sensible fallbacks

### Config File

```json
{
  "office": {
    "name": "My AI Office",
    "style": "cyberpunk"
  },
  "gateway": {
    "url": "ws://127.0.0.1:18789",
    "token": "your-gateway-token"
  },
  "agents": {
    "main": {
      "name": "Main Agent",
      "role": "Orchestrator",
      "color": "#ff006e",
      "emoji": "🤖",
      "position": { "x": 50, "y": 38 }
    },
    "dev": {
      "name": "Dev",
      "role": "Developer",
      "color": "#00f5ff",
      "emoji": "💻",
      "position": { "x": 20, "y": 35 }
    }
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENCLAW_GATEWAY_URL` | WebSocket URL (overrides config) |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway auth token (overrides config) |
| `OFFICE_NAME` | Office display name |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (optional) |
| `TELEGRAM_CHAT_ID` | Telegram chat ID (optional) |

### Agent Configuration

Each agent needs:
- `name` — Display name
- `role` — Role description
- `color` — Hex color for UI elements
- `emoji` — Status emoji
- `position` — `{ x, y }` percentage coordinates on the office image

Optional:
- `keywords` — Array of keywords for automatic task routing
- `thoughts` — Array of flavor text for idle animations

## 🏗️ Architecture

```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── config/        # Public config (no secrets)
│   │   ├── health/        # Health check + gateway status
│   │   ├── workflow/       # Workflow SSE stream
│   │   └── ...
│   └── page.js            # Main dashboard
├── components/            # React components
│   └── IsometricOffice.js # Main office visualization
├── lib/                   # Server-side modules
│   ├── config.js          # Configuration system
│   ├── openclaw-ws.js     # WebSocket client
│   ├── db.js              # SQLite database
│   ├── workflow.js        # Workflow state machine
│   └── agents.js          # Agent definitions
└── public/sprites/        # Office artwork
```

## 🐳 Docker

```bash
docker compose up -d
```

## 📝 License

MIT — see [LICENSE](LICENSE)
