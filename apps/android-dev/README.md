# Claude Local Dev - Android

A local development environment for Android that lets you write, build, and test code directly on your phone. Integrates with the Claude API for AI-assisted development.

## Features

### Code Editor
- Syntax-aware editing with monospace font and line numbers
- Multi-tab file editing with quick file switching
- Save/auto-detect modifications indicator
- Integrated AI assistant panel (Claude API)
- One-tap run for current file

### Terminal
- Full local shell access on device
- Streaming command output with color-coded lines (input/output/error/system)
- Command history and quick command chips
- Quick-action buttons for build, test, and clear

### File Manager
- Browse project files with breadcrumb navigation
- Create, rename, and delete files and folders
- Language-aware file icons with color coding
- File size display and sorting (directories first)

### Git Integration
- Full Git workflow: clone, init, add, commit, push, pull
- Branch management: create, switch, view remote branches
- Visual change tracking (staged/unstaged/untracked)
- Commit log with author, date, and hash
- Stash support

### Build & Test
- Auto-detected build configurations for 12+ languages:
  - Kotlin, Java, Python, JavaScript, TypeScript
  - Rust, Go, C/C++, Dart, Ruby, PHP
- Build, test, lint, format, and clean commands
- Error parsing with file/line/column extraction
- Streaming build output

### Claude AI Assistant
- Inline AI assistance in the editor
- Code explanation, generation, and debugging
- Test generation from source code
- "Apply" button to insert AI-suggested code directly

### Package Manager
- Automatic detection of package manager per language
- Install, add, remove, and list dependencies
- Toolchain availability checking

## Architecture

```
app/src/main/java/com/claudecontext/localdev/
├── ClaudeLocalDevApp.kt          # Hilt application entry
├── MainActivity.kt               # Single-activity Compose host
├── di/
│   └── AppModule.kt              # Hilt dependency injection
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt        # Room database
│   │   └── ProjectDao.kt         # Project data access
│   ├── models/                   # Data classes
│   │   ├── Project.kt
│   │   ├── FileNode.kt
│   │   ├── TerminalSession.kt
│   │   ├── BuildResult.kt
│   │   ├── GitModels.kt
│   │   └── ClaudeMessage.kt
│   └── repository/
│       └── ProjectRepository.kt
├── service/
│   ├── shell/
│   │   ├── ShellExecutor.kt      # Core shell command runner
│   │   └── ShellService.kt       # Foreground service
│   ├── git/
│   │   └── GitService.kt         # Git operations
│   ├── build/
│   │   ├── BuildRunner.kt        # Build/test/lint runner
│   │   └── BuildService.kt       # Foreground build service
│   ├── claude/
│   │   └── ClaudeApiService.kt   # Claude API integration
│   └── packages/
│       └── PackageManagerService.kt
└── ui/
    ├── Navigation.kt             # NavHost + bottom nav
    ├── theme/Theme.kt            # Material3 theming
    ├── projects/                  # Project list & creation
    ├── editor/                    # Code editor + AI panel
    ├── terminal/                  # Terminal emulator
    ├── files/                     # File browser
    ├── git/                       # Git management
    └── settings/                  # App configuration
```

## Tech Stack

- **Language**: Kotlin 1.9
- **UI**: Jetpack Compose + Material 3
- **DI**: Hilt (Dagger)
- **Database**: Room
- **Preferences**: DataStore
- **Networking**: OkHttp + Retrofit (Claude API)
- **Async**: Kotlin Coroutines + Flow
- **Testing**: JUnit 4, MockK, Turbine

## Setup

1. Open in Android Studio
2. Set your Claude API key in Settings
3. Configure git username/email
4. Create a new project or clone from GitHub

## Building

```bash
cd apps/android-dev
./gradlew assembleDebug
```

## Running Tests

```bash
./gradlew test
```

## Requirements

- Android 8.0 (API 26) or higher
- For full functionality, install Termux or similar to get CLI tools (git, node, python, etc.)
