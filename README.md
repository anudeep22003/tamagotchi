# Personal App Store

> GPT-5 can spin up apps in a single shot — but most end up buried in chat threads, unused. I'm building the personal app store for individuals.

## The Vision

Imagine having your own curated collection of AI-powered apps, each tailored to work with your personal data. Instead of losing brilliant GPT-5 creations in chat history, you can build, configure, and launch them on demand — creating a truly personal digital ecosystem.

## How It Works

This project consists of two powerful components:

### 🚀 **App Creation & Launch**
Build applications with GPT-5 and advanced reasoning support, then configure them to run whenever you need them. The system uses a dual-pane interface where you collaborate with AI in real-time:
- **Human Area** (left): Your input, requirements, and iterations
- **Generative Area** (right): AI-powered app construction and live preview
- **Socket streaming**: Watch your apps come to life as GPT-5 builds them

### 📊 **Personal Data Repository**
A Chrome extension that intelligently captures your digital footprint into your own private data vault:
- **Smart extraction**: Captures content like saved tweets, posts, and interactions
- **DOM parsing**: Reads structured data directly from web pages with user permission
- **API interception**: Legitimately accesses API responses without triggering scraping protections
- **Multi-platform ready**: Designed with adapters for Twitter, LinkedIn, and other platforms

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend      │    │   Chrome Ext    │
│   (React/Vite)  │◄──►│  (FastAPI/Socket)│◄──►│  (React/CRXJS)  │
│                 │    │                  │    │                 │
│ • App Store UI  │    │ • Socket streams │    │ • DOM capture   │
│ • Live building │    │ • GPT-5 integration│  │ • Data parsing  │
│ • Chat interface│    │ • Data ingestion │    │ • API intercept │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Features

- **Real-time App Generation**: Watch GPT-5 build complete applications with reasoning support
- **Personal Data Integration**: Your apps work with your actual data from day one
- **Privacy-First**: All data stays in your control and storage
- **Extensible Platform**: Easy to add new data sources and app types
- **Live Preview**: See apps being built and test them immediately
- **Socket Streaming**: Real-time communication between all components

## Tech Stack

### Backend (`/backend`)
- **FastAPI**: High-performance API framework
- **Socket.IO**: Real-time bidirectional communication
- **OpenAI GPT-5**: Advanced reasoning and app generation
- **Pydantic**: Type-safe data validation
- **Python 3.12+**: Modern Python with full typing

### Frontend (`/frontend`)
- **React 19**: Latest React with concurrent features
- **Socket.IO Client**: Real-time updates and streaming
- **Shadcn/UI**: Beautiful, accessible components
- **TailwindCSS**: Utility-first styling
- **React Router**: Multi-app navigation
- **Zustand**: Lightweight state management

### Chrome Extension (`/extension`)
- **Manifest V3**: Latest Chrome extension standard
- **React + TypeScript**: Type-safe component development
- **CRXJS/Vite**: Modern build tooling
- **DOMPurify**: Safe HTML sanitization
- **Chrome APIs**: Native browser integration

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- Bun (preferred) or npm
- Chrome browser for extension development

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tamagotchi
   ```

2. **Backend setup**
   ```bash
   cd backend
   # Install dependencies with uv
   uv sync
   # Set up environment
   cp .env.example .env.local
   # Add your OPENAI_API_KEY to .env.local
   # Start the server
   uv run uvicorn main:app --reload --port 8085
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   bun install
   bun run dev
   ```

4. **Extension setup**
   ```bash
   cd extension
   bun install
   bun run build
   # Load the dist/ folder as an unpacked extension in Chrome
   ```

### Environment Variables

Create `.env.local` in the backend directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage Examples

### Building Your First App
1. Open the frontend at `http://localhost:5173`
2. Navigate to the Human-AI Workspace
3. Describe your app idea in the left pane
4. Watch GPT-5 build it live in the right pane
5. Iterate and refine until perfect
6. Launch your app from the app store interface

### Capturing Twitter Data
1. Install the Chrome extension
2. Visit Twitter and grant permissions
3. The extension automatically captures your interactions
4. Data appears in your personal repository
5. Build apps that use this data immediately

### Chatting with Your Data
1. Use the Twitter Data Chat page
2. Ask questions about your tweets, engagement, followers
3. Get insights powered by your actual social media data
4. Build custom analytics apps based on these insights

## Development

The project follows modern development practices:
- **Type Safety**: Full TypeScript/Python typing
- **Component Architecture**: Reusable, composable components
- **Real-time Updates**: Socket-based streaming throughout
- **Modern Tooling**: Latest build tools and frameworks
- **Privacy by Design**: Local-first data storage

### Adding New Data Sources
1. Create adapter in extension (`/extension/src/config/`)
2. Add parser for data structure
3. Update backend ingestion (`/backend/core/api/ingestion.py`)
4. Build apps that use the new data source

## The Future

This is just the beginning. The vision includes:
- **Multi-platform adapters**: LinkedIn, GitHub, email, calendar integration
- **App marketplace**: Share and discover community-built apps
- **Advanced AI agents**: Apps that proactively work with your data
- **Cross-device sync**: Access your apps and data anywhere
- **Workflow automation**: Chain apps together for complex tasks

## Contributing

This project represents a new paradigm in personal computing. If you're interested in building the future of personal AI applications, contributions are welcome!

---

*Built for the hackathon that believes in empowering individuals with their own AI-powered app ecosystems.*
