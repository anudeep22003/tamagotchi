# GitHub Repository Understand

> A sophisticated AI-powered tool for understanding the structure and architecture of GitHub repositories. Peek under the hood of what world-class programmers build and understand why certain technical decisions were made.

## The Vision

Understanding complex codebases is a challenge for developers at every level. This tool analyzes GitHub repositories and generates comprehensive teardowns that explain the core data structures, architectural patterns, and relationships between components — helping you learn from the best codebases and ace technical interviews.

## How It Works

This tool provides an intuitive interface for deep repository analysis:

### 🔍 **Repository Analysis**
Enter any public GitHub repository URL and get comprehensive analysis powered by Claude Code SDK:
- **Intelligent validation**: Checks URL format, repository accessibility, and public status
- **Smart caching**: Uses commit SHA-based caching to avoid re-analyzing unchanged repositories
- **Size optimization**: Filters out overly large repositories to ensure efficient processing
- **Real-time feedback**: Live streaming of analysis progress and insights

### 📋 **Comprehensive Teardowns**
Generate detailed markdown reports that include:
- **Data Structure Analysis**: Identify core data structures and their relationships
- **Architectural Patterns**: Understand design decisions and architectural choices
- **Function & Class Mapping**: Visualize how components interact and depend on each other
- **Mermaid Diagrams**: UML, sequence, and class diagrams for visual understanding
- **Module Dependencies**: Clear mapping of how different parts of the codebase connect

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend      │    │   GitHub API    │
│   (React/Vite)  │◄──►│  (FastAPI/Socket)│◄──►│   Integration   │
│                 │    │                  │    │                 │
│ • Repo Input    │    │ • Claude Code SDK│    │ • Repo metadata │
│ • Live Analysis │    │ • Git operations │    │ • Access validation│
│ • Markdown UI   │    │ • Teardown engine│    │ • Rate limiting │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Features

- **Claude Code SDK Integration**: Leverages Claude's advanced code understanding capabilities
- **Smart Repository Processing**: Intelligent cloning, validation, and size management
- **Real-time Analysis Streaming**: Live progress updates during repository analysis
- **Comprehensive Caching**: SHA-based caching prevents redundant analysis of unchanged repos
- **Rich Markdown Output**: Detailed teardowns with syntax highlighting and Mermaid diagrams
- **GitHub API Integration**: Seamless repository metadata fetching and validation

## Tech Stack

### Backend (`/backend`)
- **FastAPI**: High-performance API framework with async support
- **Claude Code SDK**: AI-powered code analysis and understanding
- **Socket.IO**: Real-time streaming communication protocol
- **GitPython**: Git repository cloning and management
- **PyGithub**: GitHub API integration for repository metadata
- **Pydantic**: Type-safe data validation and serialization
- **Python 3.12+**: Modern Python with full typing support

### Frontend (`/frontend`)
- **React 19**: Latest React with concurrent features and streaming support
- **Socket.IO Client**: Real-time communication with the analysis backend
- **Shadcn/UI**: Beautiful, accessible UI components
- **TailwindCSS**: Utility-first styling with dark theme optimization
- **React Router**: Single-page application routing
- **Zustand**: Centralized state management for analysis progress
- **React Markdown**: Rich markdown rendering with Mermaid diagram support
- **React Syntax Highlighter**: Code syntax highlighting for multiple languages

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- Bun (preferred) or npm
- GitHub Personal Access Token
- Anthropic API Key (for Claude Code SDK)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd github-repo-understand
   ```

2. **Backend setup**
   ```bash
   cd backend
   # Install dependencies with uv
   uv sync
   # Set up environment
   cp .env.example .env.local
   # Add your API keys to .env.local:
   # ANTHROPIC_API_KEY=your_anthropic_api_key_here
   # GITHUB_TOKEN=your_github_token_here
   # BUCKET_NAME=your_storage_bucket_name
   # Start the server
   uv run uvicorn main:app --reload --port 8085
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   bun install
   bun run dev
   ```


### Environment Variables

Create `.env.local` in the backend directory:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GITHUB_TOKEN=your_github_personal_access_token
BUCKET_NAME=your_storage_bucket_name
CLAUDE_MODEL=claude-3-5-sonnet-20241022
TEMP_DIR=/tmp/repo-analysis
OPERATION_TIMEOUT=3600
```

## Usage Examples

### Analyzing a Repository
1. Open the frontend at `http://localhost:5173`
2. Enter a public GitHub repository URL in the input field
3. Wait for validation (green checkmark indicates valid repo)
4. Click "Analyze Repository" to start the teardown process
5. Watch the real-time analysis progress in the right panel
6. Review the comprehensive markdown teardown when complete

### Understanding Complex Codebases
1. Try analyzing popular open-source projects like:
   - `facebook/react` - Learn React's internal architecture
   - `microsoft/vscode` - Understand VS Code's extensible design
   - `kubernetes/kubernetes` - Explore large-scale system architecture
2. Focus on the generated Mermaid diagrams to visualize relationships
3. Use the data structure analysis to understand core abstractions
4. Review the architectural decisions section for design insights

### Preparing for Technical Interviews
1. Analyze repositories similar to your target company's tech stack
2. Study the teardown's architectural patterns section
3. Review the component interaction diagrams
4. Practice explaining the codebase structure using the generated insights

## Analysis Features

The generated teardowns include comprehensive analysis of:

### Code Structure Analysis
- **Data Structures**: Core classes, interfaces, and type definitions
- **Function Mapping**: Key functions and their relationships
- **Module Dependencies**: How different parts of the codebase connect
- **Design Patterns**: Identification of common architectural patterns

### Visual Diagrams
- **Class Diagrams**: UML representation of class hierarchies
- **Sequence Diagrams**: Flow of operations and method calls
- **Dependency Graphs**: Module and component relationships
- **Architecture Overview**: High-level system structure

## Development

The project follows modern development practices:
- **Type Safety**: Full TypeScript/Python typing with Pydantic validation
- **Modular Architecture**: Clean separation between analysis, storage, and UI
- **Real-time Communication**: Streaming updates during repository analysis
- **Modern Tooling**: Vite, Bun, UV for fast development
- **Intelligent Caching**: SHA-based caching to avoid redundant analysis

### Contributing to Analysis Quality
1. Enhance the teardown prompts in `claude_sdk_actor.py`
2. Add new analysis patterns for different programming languages
3. Improve Mermaid diagram generation for better visualization
4. Extend the repository metadata collection in `git_repo_processor.py`

## The Future

This is just the beginning. The vision includes:
- **Language-Specific Analysis**: Tailored teardowns for Go, Rust, Java, and other languages
- **Interactive Diagrams**: Clickable Mermaid diagrams with code navigation
- **Comparative Analysis**: Side-by-side comparison of similar repositories
- **Team Knowledge Sharing**: Collaborative features for sharing insights
- **IDE Integration**: VS Code extension for in-editor repository insights
- **Historical Analysis**: Track how repository architecture evolves over time

## Contributing

This project aims to democratize understanding of complex codebases. If you're interested in helping developers learn from world-class code architecture, contributions are welcome!

---

*Built to help developers understand the structure and genius behind world-class codebases.*
