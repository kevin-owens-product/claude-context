import Foundation
import Combine

/// Manages the context window for AI interactions: tracks open files, project structure,
/// token budgets, and assembles optimized context for each request.
@MainActor
class ContextManager: ObservableObject {

    @Published var state = ContextManagerState()

    private var projectPath: String?

    func configure(projectPath: String, language: ProjectLanguage? = nil) {
        self.projectPath = projectPath
        state.projectLanguage = language
    }

    // MARK: - Entry Management

    @discardableResult
    func addEntry(_ entry: ContextEntry) -> ContextEntry {
        if let idx = state.entries.firstIndex(where: { $0.type == entry.type && $0.source == entry.source }) {
            var existing = state.entries[idx]
            existing.content = entry.content
            existing.tokenEstimate = entry.tokenEstimate
            existing.lastAccessed = Date()
            existing.accessCount += 1
            state.entries[idx] = existing
            recalculateBudget()
            return existing
        }

        state.entries.append(entry)
        recalculateBudget()
        return entry
    }

    func addFileContext(_ filePath: String, content: String? = nil) {
        guard let text = content ?? readFile(filePath) else { return }
        let tokens = estimateTokens(text)

        addEntry(ContextEntry(
            type: tokens > state.maxFileSize ? .fileSnippet : .file,
            source: filePath,
            content: tokens > state.maxFileSize ? String(text.prefix(state.maxFileSize * 4)) + "\n... (truncated)" : text,
            tokenEstimate: min(tokens, state.maxFileSize),
            metadata: ["language": detectLanguage(filePath)]
        ))
    }

    func addGitDiff(_ diff: String) {
        addEntry(ContextEntry(type: .gitDiff, source: "git diff", content: diff, tokenEstimate: estimateTokens(diff), priority: .high))
    }

    func addErrorLog(_ error: String, source: String = "build") {
        addEntry(ContextEntry(type: .errorLog, source: source, content: error, tokenEstimate: estimateTokens(error), priority: .critical))
    }

    func addTerminalOutput(_ output: String, command: String) {
        addEntry(ContextEntry(type: .terminalOutput, source: command, content: output, tokenEstimate: estimateTokens(output), metadata: ["command": command]))
    }

    func addUserNote(_ note: String, title: String = "Note") {
        addEntry(ContextEntry(type: .userNote, source: title, content: note, tokenEstimate: estimateTokens(note), priority: .high, pinned: true))
    }

    func addConversationSummary(_ summary: String, sessionId: String) {
        addEntry(ContextEntry(type: .conversationSummary, source: sessionId, content: summary, tokenEstimate: estimateTokens(summary)))
    }

    func removeEntry(_ entryId: UUID) {
        state.entries.removeAll { $0.id == entryId }
        recalculateBudget()
    }

    func pinEntry(_ entryId: UUID, pinned: Bool) {
        if let idx = state.entries.firstIndex(where: { $0.id == entryId }) {
            state.entries[idx].pinned = pinned
        }
    }

    func setPriority(_ entryId: UUID, priority: ContextPriority) {
        if let idx = state.entries.firstIndex(where: { $0.id == entryId }) {
            state.entries[idx].priority = priority
        }
    }

    func clearAll() {
        state.entries = state.entries.filter { $0.pinned }
        recalculateBudget()
    }

    func clearByType(_ type: ContextType) {
        state.entries = state.entries.filter { $0.type != type || $0.pinned }
        recalculateBudget()
    }

    // MARK: - Context Assembly

    func assembleContext(userPrompt: String? = nil, budgetOverride: Int? = nil) -> AssembledContext {
        let maxTokens = budgetOverride ?? state.budget.availableTokens

        let sorted: [ContextEntry]
        switch state.contextStrategy {
        case .smartPriority:
            sorted = smartPrioritySort(state.entries)
        case .recencyFirst:
            sorted = state.entries.sorted { $0.lastAccessed > $1.lastAccessed }
        case .relevanceFirst:
            sorted = relevanceSort(state.entries, prompt: userPrompt)
        case .manual:
            sorted = state.entries.sorted { ($0.pinned ? 1 : 0) > ($1.pinned ? 1 : 0) }
        case .fullProject:
            sorted = state.entries.sorted { $0.priority.weight > $1.priority.weight }
        }

        var included: [ContextEntry] = []
        var truncated: [String] = []
        var dropped: [String] = []
        var usedTokens = 0

        for entry in sorted {
            if entry.pinned {
                included.append(entry)
                usedTokens += entry.tokenEstimate
            } else if usedTokens + entry.tokenEstimate <= maxTokens {
                included.append(entry)
                usedTokens += entry.tokenEstimate
            } else if usedTokens + 500 <= maxTokens && entry.tokenEstimate > 500 {
                let available = maxTokens - usedTokens
                var truncatedEntry = entry
                truncatedEntry.content = String(entry.content.prefix(available * 4)) + "\n... (truncated)"
                truncatedEntry.tokenEstimate = available
                included.append(truncatedEntry)
                usedTokens += available
                truncated.append(entry.source)
            } else {
                dropped.append(entry.source)
            }
        }

        return AssembledContext(
            systemPrompt: buildSystemPrompt(included),
            entries: included,
            totalTokens: usedTokens,
            truncatedEntries: truncated,
            droppedEntries: dropped
        )
    }

    // MARK: - Configuration

    func setStrategy(_ strategy: ContextStrategy) { state.contextStrategy = strategy }
    func setMaxBudget(_ maxTokens: Int) { state.budget.maxTokens = maxTokens }
    func setAutoTrackFiles(_ enabled: Bool) { state.autoTrackFiles = enabled }

    // MARK: - Auto-tracking

    func onFileOpened(_ filePath: String) {
        guard state.autoTrackFiles else { return }
        state.activeFileContext = filePath
        addFileContext(filePath)
    }

    func onBuildError(_ error: String) {
        guard state.autoIncludeErrors else { return }
        addErrorLog(error, source: "build")
    }

    // MARK: - Private

    private func smartPrioritySort(_ entries: [ContextEntry]) -> [ContextEntry] {
        entries.sorted { a, b in
            if a.pinned != b.pinned { return a.pinned }
            let scoreA = Double(a.priority.weight * 10) - a.lastAccessed.timeIntervalSinceNow.magnitude / 3600 + Double(a.accessCount) * 0.5
            let scoreB = Double(b.priority.weight * 10) - b.lastAccessed.timeIntervalSinceNow.magnitude / 3600 + Double(b.accessCount) * 0.5
            return scoreA > scoreB
        }
    }

    private func relevanceSort(_ entries: [ContextEntry], prompt: String?) -> [ContextEntry] {
        guard let prompt = prompt else { return entries.sorted { $0.priority.weight > $1.priority.weight } }
        let keywords = Set(prompt.lowercased().split(separator: " ").filter { $0.count > 3 }.map(String.init))

        return entries.sorted { a, b in
            if a.pinned != b.pinned { return a.pinned }
            let matchA = keywords.filter { a.content.lowercased().contains($0) }.count
            let matchB = keywords.filter { b.content.lowercased().contains($0) }.count
            return matchA * 10 + a.priority.weight > matchB * 10 + b.priority.weight
        }
    }

    private func buildSystemPrompt(_ entries: [ContextEntry]) -> String {
        var result = "You are a coding assistant in a local development environment.\n\n"

        let files = entries.filter { $0.type == .file || $0.type == .fileSnippet }
        let errors = entries.filter { $0.type == .errorLog }
        let diffs = entries.filter { $0.type == .gitDiff }
        let notes = entries.filter { $0.type == .userNote }

        if !files.isEmpty {
            result += "## Open Files\n"
            for f in files {
                let lang = f.metadata["language"] ?? ""
                result += "### \(f.source)\n```\(lang)\n\(f.content)\n```\n\n"
            }
        }
        if !diffs.isEmpty {
            result += "## Recent Changes\n"
            for d in diffs { result += "```diff\n\(d.content)\n```\n" }
        }
        if !errors.isEmpty {
            result += "## Active Errors\n"
            for e in errors { result += "### \(e.source)\n```\n\(e.content)\n```\n" }
        }
        if !notes.isEmpty {
            result += "## User Notes\n"
            for n in notes { result += "- **\(n.source)**: \(n.content)\n" }
        }

        return result
    }

    private func recalculateBudget() {
        state.budget.usedTokens = state.entries.reduce(0) { $0 + $1.tokenEstimate }
    }

    private func estimateTokens(_ text: String) -> Int { text.count / 4 }

    private func readFile(_ path: String) -> String? {
        try? String(contentsOfFile: path, encoding: .utf8)
    }

    private func detectLanguage(_ path: String) -> String {
        let ext = (path as NSString).pathExtension
        let map = ["kt": "kotlin", "java": "java", "py": "python", "js": "javascript",
                    "ts": "typescript", "swift": "swift", "rs": "rust", "go": "go"]
        return map[ext] ?? ext
    }
}

// MARK: - Data Models

struct ContextEntry: Identifiable {
    let id = UUID()
    let type: ContextType
    let source: String
    var content: String
    var tokenEstimate: Int
    var priority: ContextPriority = .normal
    var pinned: Bool = false
    var addedAt = Date()
    var lastAccessed = Date()
    var accessCount: Int = 0
    var metadata: [String: String] = [:]
}

enum ContextType: String {
    case file, fileSnippet, directoryTree, gitDiff, gitLog
    case terminalOutput, errorLog, documentation, conversationSummary
    case userNote, projectConfig, dependencyInfo, searchResult, custom

    var displayName: String {
        switch self {
        case .file: return "File"
        case .fileSnippet: return "Snippet"
        case .directoryTree: return "Directory Tree"
        case .gitDiff: return "Git Diff"
        case .gitLog: return "Git Log"
        case .terminalOutput: return "Terminal Output"
        case .errorLog: return "Error Log"
        case .documentation: return "Documentation"
        case .conversationSummary: return "Conversation Summary"
        case .userNote: return "User Note"
        case .projectConfig: return "Project Config"
        case .dependencyInfo: return "Dependencies"
        case .searchResult: return "Search Result"
        case .custom: return "Custom"
        }
    }
}

enum ContextPriority: Int {
    case background = 0, low = 1, normal = 2, high = 3, critical = 4
    var weight: Int { rawValue }
}

struct ContextBudget {
    var maxTokens: Int = 100000
    var reservedForResponse: Int = 4096
    var reservedForSystem: Int = 2000
    var usedTokens: Int = 0

    var availableTokens: Int { maxTokens - reservedForResponse - reservedForSystem - usedTokens }
    var usagePercent: Float { Float(usedTokens) / Float(maxTokens - reservedForResponse - reservedForSystem) }
}

enum ContextStrategy: String, CaseIterable {
    case smartPriority = "Smart Priority"
    case recencyFirst = "Recency First"
    case relevanceFirst = "Relevance First"
    case manual = "Manual Only"
    case fullProject = "Full Project"
}

struct ContextManagerState {
    var entries: [ContextEntry] = []
    var budget = ContextBudget()
    var autoTrackFiles = true
    var autoIncludeGitDiff = true
    var autoIncludeErrors = true
    var maxFileSize: Int = 50000
    var contextStrategy: ContextStrategy = .smartPriority
    var activeFileContext: String?
    var projectLanguage: ProjectLanguage?
}

struct AssembledContext {
    let systemPrompt: String
    let entries: [ContextEntry]
    let totalTokens: Int
    let truncatedEntries: [String]
    let droppedEntries: [String]
}
