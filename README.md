# OpenLLM UI

A modern, privacy-first web platform that allows users to connect, manage, and interact with local LLM endpoints (LM Studio, Ollama, vLLM, llama.cpp, OpenAI-compatible APIs). It supports AI chat, multi-agent orchestration, RAG, and a dedicated web development workspace.

> **Privacy-First**: All AI processing and data storage remain entirely local. No data leaves your machine.

---

## Features

| Feature | Description |
|---------|-------------|
| **💬 AI Chat** | Multi-session chat with real-time SSE streaming, markdown rendering, code highlighting, and conversation history |
| **🔄 Multi-Model Arena** | Concurrently compare responses from up to 10 different local models side-by-side |
| **🧠 RAG System** | Advanced Retrieval-Augmented Generation with real semantic embeddings. Upload PDFs, text files, code files and query them with natural language |
| **🤖 Agent Marketplace** | 11 specialized AI agents including Coding Engineer, Research Analyst, Clinical Assistant, DevOps Automator, Documentation Editor, Master Orchestrator |
| **🌐 Web Dev Workspace** | Sequential multi-agent orchestration (Architect → UI/UX → Frontend → Backend → Database → QA → DevOps → Reviewer) with integrated Monaco Code Editor and live HTML preview |
| **📊 Hardware Dashboard** | Real-time simulated CPU/GPU/VRAM/temperature monitoring |
| **🔐 Authentication** | JWT-based auth with local user management, rate limiting |
| **🎤 Voice I/O** | Speech-to-text input and text-to-speech playback via Web Speech API |
| **⚡ WebSocket** | Real-time model health status updates via WebSocket |
| **🌓 Dark/Light Theme** | Toggle between dark and light themes in Settings |
| **📱 Mobile Responsive** | Fully responsive design for tablet and mobile devices |
| **⚙️ Customizable** | Font size, streaming speed, toast notifications, and more |

---

## Quick Start

### Prerequisites

- **Node.js** v18 or higher
- A running local LLM server (e.g., **LM Studio** or **Ollama**) — optional, mock mode works without any LLM

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
cd ..
```

### 2. Run the Application

**Development mode** (with Vite proxy, no CORS issues):

```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 5173, proxies /api to backend)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

**Production mode** (single server):

```bash
# Build frontend
cd frontend
npm run build

# Copy build to backend
cp -r dist ../backend/public

# Start backend (serves everything on port 5000)
cd ../backend
npm start
```

Open **http://localhost:5000** in your browser.

### 3. Login

Use the **Quick Local Login** button on the login page, or create a new account.

---

## Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up --build

# Or just Docker
docker build -t openllm-ui .
docker run -p 5000:5000 openllm-ui
```

---

## Project Structure

```
local-llm-web-app/
├── backend/                          # Express.js API server
│   ├── server.js                     # Main entry point (20+ routes)
│   ├── db.json                       # JSON-based local database
│   ├── test-api.js                   # Backend verification tests
│   ├── services/
│   │   ├── db.js                     # Database CRUD operations
│   │   ├── llmService.js             # LLM provider adapters (Ollama, LM Studio, Mock)
│   │   ├── ragService.js             # RAG: embeddings, chunking, vector search
│   │   ├── agentService.js           # Agent definitions & reasoning
│   │   ├── authService.js            # JWT authentication
│   │   ├── workspaceService.js       # File system management
│   │   └── wsService.js              # WebSocket health monitoring
│   └── workspace/                    # User file workspace
├── frontend/                         # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx                   # Main app component with routing
│   │   ├── index.css                 # Global styles (dark/light theme, mobile responsive)
│   │   ├── utils/
│   │   │   ├── api.js                # Centralized API client
│   │   │   └── useWebSocket.js       # WebSocket hook for real-time updates
│   │   └── components/
│   │       ├── ChatWorkspace.jsx     # Chat interface
│   │       ├── Dashboard.jsx         # System dashboard
│   │       ├── ModelManager.jsx      # Model endpoint management (live status)
│   │       ├── ModelArena.jsx        # Multi-model comparison
│   │       ├── WebDevWorkspace.jsx   # Web dev orchestration
│   │       ├── WorkspacePanel.jsx    # Monaco code editor
│   │       ├── KnowledgeBase.jsx     # Document management
│   │       ├── AgentMarketplace.jsx  # Agent catalog
│   │       ├── SettingsPage.jsx      # User preferences + theme toggle
│   │       ├── LoginPage.jsx         # Authentication
│   │       ├── Toast.jsx             # Notifications
│   │       ├── MarkdownRenderer.jsx  # Shared markdown components
│   │       └── MarkdownUtils.jsx     # Shared markdown utilities
│   ├── index.html
│   └── .env                          # Environment configuration
├── Dockerfile                        # Multi-stage production build
├── docker-compose.yml                # Docker Compose orchestration
├── .gitignore                        # Git ignore rules
├── prd.md                            # Product Requirements Document
└── README.md                         # This file
```

---

## API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create new account | No |
| POST | `/api/auth/login` | Sign in | No |

### Chat

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/chats` | List all chat sessions | Yes |
| POST | `/api/chats` | Create new chat session | Yes |
| DELETE | `/api/chats/:id` | Delete chat session | Yes |
| GET | `/api/messages/:chatId` | Get messages for a chat | Yes |
| POST | `/api/chat` | Send message (SSE streaming) | Yes |

### Models

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/models` | List available models (auto-discovers) | Yes |
| POST | `/api/models/connect` | Connect/enable a model endpoint | Yes |
| POST | `/api/models/select` | Set active model | Yes |

### Agents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/agents` | List available agents | Yes |

### Documents (RAG)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/documents` | List indexed documents | Yes |
| POST | `/api/upload` | Upload & index a document (multipart) | Yes |
| DELETE | `/api/documents/:id` | Delete indexed document | Yes |

### Workspace

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/workspace/tree` | Get file tree | Yes |
| GET | `/api/workspace/file` | Read file content | Yes |
| POST | `/api/workspace/file` | Write/update file | Yes |
| DELETE | `/api/workspace/file` | Delete file | Yes |
| GET | `/api/workspace/preview` | Preview HTML file | Yes |

### Orchestration

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/webdev/orchestrate` | Run web dev orchestration (SSE) | Yes |

### WebSocket

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WS | `ws://host:5000/ws` | Real-time model health status updates |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  Dashboard │ Chat │ Arena │ Web Dev │ Knowledge Base    │
│  Model Manager │ Agent Marketplace │ Settings │ Monaco  │
│         Centralized API Client + WebSocket Hook         │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP + SSE + WebSocket (JWT Auth)
┌───────────────────────▼─────────────────────────────────┐
│                  Backend (Express.js)                    │
│  Auth │ Chat │ Models │ Agents │ RAG │ Workspace │ WS   │
│  Rate Limiting │ Helmet Security │ JSON DB              │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP
┌───────────────────────▼─────────────────────────────────┐
│             Local LLM Endpoints                          │
│  Ollama :11434 │ LM Studio :1234 │ OpenAI Compatible   │
└─────────────────────────────────────────────────────────┘
```

---

## Configuration

### Frontend Environment Variables (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
```

### User Preferences (stored in browser localStorage)

| Key | Description | Default |
|-----|-------------|---------|
| `llm_token` | JWT auth token | - |
| `llm_user` | User profile JSON | - |
| `llm_prefs` | Settings (theme, font, speed, TTS) | `{}` |

---

## Supported LLM Providers

| Provider | Endpoint Format | Status |
|----------|----------------|--------|
| **Ollama** | `http://host:11434` | Auto-discovery |
| **LM Studio** | `http://host:1234/v1` | Auto-discovery |
| **Mock (Built-in)** | None needed | Always available |
| **vLLM** | OpenAI-compatible | Manual config |
| **llama.cpp** | OpenAI-compatible | Manual config |

---

## Running Tests

```bash
cd backend
node test-api.js
```

Tests: DB CRUD operations, RAG cosine similarity search, LLM endpoint health check.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 8, Monaco Editor | UI, code editor |
| **Backend** | Node.js, Express, Helmet, Rate Limit | REST API, security |
| **Real-time** | WebSocket (ws) | Model health streaming |
| **Auth** | JWT, bcryptjs | User authentication |
| **AI** | Ollama, LM Studio | Local LLM endpoints |
| **Styling** | CSS Variables, Glassmorphism | Dark/light themes |

---

## Security

- **Helmet** — Security HTTP headers
- **Rate Limiting** — 100 req/15min API, 10 req/15min auth
- **JWT Authentication** — Token-based access control
- **CORS** — Configurable cross-origin policy
- **Path Traversal Protection** — Workspace file access validation
- **Input Size Limits** — 1MB JSON body, 10MB file uploads

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Frontend can't reach backend** | Ensure backend runs on port 5000, check `VITE_API_URL` |
| **CORS errors** | Use Vite proxy in dev mode (automatic) |
| **Models not detected** | Verify Ollama/LM Studio running with CORS enabled |
| **Ollama CORS** | `OLLAMA_ORIGINS="*" ollama serve` |
| **Upload fails** | 10MB limit. Supported: PDF, TXT, MD, JS, PY, JSON, CSV |
| **WebSocket offline** | Backend must be running; WS auto-reconnects every 5s |
| **Theme not switching** | Save settings after changing theme in Settings page |

---

## Version

**2.0.0** — Full improvement pass with security, Docker, WebSocket, themes, mobile responsive.

---

## License

MIT