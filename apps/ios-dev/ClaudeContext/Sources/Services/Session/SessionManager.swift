import Foundation
import Combine

/// Manages AI conversation sessions with persistence, branching, restore, and cross-session context sharing.
@MainActor
class SessionManager: ObservableObject {

    @Published var state = SessionManagerState()

    private var sessionsDir: URL?
    private let maxRecentSessions = 20
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        sessionsDir = nil
        encoder.outputFormatting = .prettyPrinted
    }

    func configure(projectPath: String) {
        let dir = URL(fileURLWithPath: projectPath).appendingPathComponent(".claude-context/sessions")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        sessionsDir = dir
        loadSessions()
    }

    // MARK: - Session Lifecycle

    @discardableResult
    func createSession(title: String = "New Session", mode: AiMode = .agent, projectId: UUID? = nil, systemPrompt: String? = nil, modelId: String = "claude-sonnet-4-20250514") -> Session {
        let session = Session(
            title: title,
            projectId: projectId,
            mode: mode,
            metadata: SessionMetadata(modelId: modelId, systemPrompt: systemPrompt)
        )

        state.sessions.append(session)
        state.activeSessionId = session.id
        state.recentSessions = ([session] + state.recentSessions.filter { $0.id != session.id })
            .prefix(maxRecentSessions).map { $0 }

        persistSession(session)
        return session
    }

    func switchSession(_ sessionId: UUID) {
        guard let session = state.sessions.first(where: { $0.id == sessionId }) else { return }
        state.activeSessionId = sessionId
        state.recentSessions = ([session] + state.recentSessions.filter { $0.id != sessionId })
            .prefix(maxRecentSessions).map { $0 }
    }

    var activeSession: Session? {
        guard let id = state.activeSessionId else { return nil }
        return state.sessions.first { $0.id == id }
    }

    // MARK: - Message Management

    @discardableResult
    func addMessage(_ sessionId: UUID, message: ChatMessage) -> Session? {
        return updateSession(sessionId) { session in
            var s = session
            if let branchId = session.activeBranchId,
               let idx = session.branches.firstIndex(where: { $0.id == branchId }) {
                s.branches[idx].messages.append(message)
            } else {
                s.messages.append(message)
            }
            s.updatedAt = Date()
            return s
        }
    }

    func getMessages(_ sessionId: UUID) -> [ChatMessage] {
        guard let session = state.sessions.first(where: { $0.id == sessionId }) else { return [] }
        if let branchId = session.activeBranchId,
           let branch = session.branches.first(where: { $0.id == branchId }) {
            return Array(session.messages.prefix(branch.forkPointMessageIndex)) + branch.messages
        }
        return session.messages
    }

    // MARK: - Branching

    @discardableResult
    func createBranch(_ sessionId: UUID, name: String, forkAt: Int? = nil) -> SessionBranch? {
        guard let session = state.sessions.first(where: { $0.id == sessionId }) else { return nil }
        let forkPoint = forkAt ?? session.messages.count

        let branch = SessionBranch(name: name, forkPointMessageIndex: forkPoint, parentBranchId: session.activeBranchId)

        updateSession(sessionId) { s in
            var updated = s
            updated.branches.append(branch)
            updated.activeBranchId = branch.id
            updated.updatedAt = Date()
            return updated
        }

        return branch
    }

    func switchBranch(_ sessionId: UUID, branchId: UUID?) {
        updateSession(sessionId) { s in
            var updated = s
            updated.activeBranchId = branchId
            updated.updatedAt = Date()
            return updated
        }
    }

    @discardableResult
    func mergeBranch(_ sessionId: UUID, branchId: UUID) -> Session? {
        return updateSession(sessionId) { session in
            guard let branch = session.branches.first(where: { $0.id == branchId }) else { return session }
            var s = session
            let baseMessages = Array(session.messages.prefix(branch.forkPointMessageIndex))
            s.messages = baseMessages + branch.messages
            s.branches.removeAll { $0.id == branchId }
            if s.activeBranchId == branchId { s.activeBranchId = nil }
            s.updatedAt = Date()
            return s
        }
    }

    // MARK: - Checkpoints

    @discardableResult
    func createCheckpoint(_ sessionId: UUID, name: String, note: String = "") -> SessionCheckpoint? {
        guard let session = state.sessions.first(where: { $0.id == sessionId }) else { return nil }
        let checkpoint = SessionCheckpoint(name: name, messageIndex: session.messages.count, note: note)

        updateSession(sessionId) { s in
            var updated = s
            updated.checkpoints.append(checkpoint)
            updated.updatedAt = Date()
            return updated
        }

        return checkpoint
    }

    @discardableResult
    func restoreCheckpoint(_ sessionId: UUID, checkpointId: UUID) -> Session? {
        return updateSession(sessionId) { session in
            guard let checkpoint = session.checkpoints.first(where: { $0.id == checkpointId }) else { return session }
            var s = session
            s.messages = Array(session.messages.prefix(checkpoint.messageIndex))
            s.updatedAt = Date()
            return s
        }
    }

    // MARK: - Session Operations

    func updateTitle(_ sessionId: UUID, title: String) {
        updateSession(sessionId) { s in var u = s; u.title = title; u.updatedAt = Date(); return u }
    }

    func addTag(_ sessionId: UUID, tag: String) {
        updateSession(sessionId) { s in
            var u = s
            if !u.tags.contains(tag) { u.tags.append(tag) }
            u.updatedAt = Date()
            return u
        }
    }

    func archiveSession(_ sessionId: UUID) {
        updateSession(sessionId) { s in var u = s; u.status = .archived; u.updatedAt = Date(); return u }
    }

    func deleteSession(_ sessionId: UUID) {
        state.sessions.removeAll { $0.id == sessionId }
        state.recentSessions.removeAll { $0.id == sessionId }
        if state.activeSessionId == sessionId { state.activeSessionId = nil }
        if let dir = sessionsDir {
            try? FileManager.default.removeItem(at: dir.appendingPathComponent("\(sessionId).json"))
        }
    }

    @discardableResult
    func duplicateSession(_ sessionId: UUID) -> Session? {
        guard let original = state.sessions.first(where: { $0.id == sessionId }) else { return nil }
        let copy = createSession(title: "\(original.title) (copy)", mode: original.mode)
        return updateSession(copy.id) { s in
            var u = s
            u.messages = original.messages
            u.tags = original.tags
            u.parentSessionId = original.id
            return u
        }
    }

    // MARK: - Search

    func searchSessions(_ query: String) -> [Session] {
        let lower = query.lowercased()
        let results = state.sessions.filter { session in
            session.title.lowercased().contains(lower) ||
            session.tags.contains { $0.lowercased().contains(lower) } ||
            session.messages.contains { $0.content.lowercased().contains(lower) }
        }.sorted { $0.updatedAt > $1.updatedAt }

        state.searchResults = results
        return results
    }

    // MARK: - Export / Import

    func exportSession(_ sessionId: UUID) -> String? {
        guard let session = state.sessions.first(where: { $0.id == sessionId }),
              let data = try? encoder.encode(session) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func importSession(_ json: String) -> Session? {
        guard let data = json.data(using: .utf8),
              var session = try? decoder.decode(Session.self, from: data) else { return nil }
        session.id = UUID()
        session.title = "\(session.title) (imported)"
        session.status = .active
        session.createdAt = Date()
        session.updatedAt = Date()
        state.sessions.append(session)
        persistSession(session)
        return session
    }

    // MARK: - Persistence

    private func loadSessions() {
        guard let dir = sessionsDir else { return }
        state.isLoading = true

        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" }) ?? []

        let sessions: [Session] = files.compactMap { url in
            guard let data = try? Data(contentsOf: url) else { return nil }
            return try? decoder.decode(Session.self, from: data)
        }.sorted { $0.updatedAt > $1.updatedAt }

        state.sessions = sessions
        state.recentSessions = Array(sessions.prefix(maxRecentSessions))
        state.isLoading = false
    }

    private func persistSession(_ session: Session) {
        guard let dir = sessionsDir, let data = try? encoder.encode(session) else { return }
        try? data.write(to: dir.appendingPathComponent("\(session.id).json"))
    }

    @discardableResult
    private func updateSession(_ sessionId: UUID, transform: (Session) -> Session) -> Session? {
        guard let idx = state.sessions.firstIndex(where: { $0.id == sessionId }) else { return nil }
        let updated = transform(state.sessions[idx])
        state.sessions[idx] = updated
        persistSession(updated)
        return updated
    }
}

// MARK: - Data Models

struct Session: Identifiable, Codable {
    var id = UUID()
    var title: String = "New Session"
    var projectId: UUID?
    var mode: AiMode = .agent
    var messages: [ChatMessage] = []
    var branches: [SessionBranch] = []
    var activeBranchId: UUID?
    var metadata: SessionMetadata = SessionMetadata()
    var createdAt = Date()
    var updatedAt = Date()
    var status: SessionStatus = .active
    var tags: [String] = []
    var parentSessionId: UUID?
    var checkpoints: [SessionCheckpoint] = []
}

struct SessionBranch: Identifiable, Codable {
    let id = UUID()
    let name: String
    let forkPointMessageIndex: Int
    var parentBranchId: UUID?
    var messages: [ChatMessage] = []
    var createdAt = Date()
}

struct SessionMetadata: Codable {
    var modelId: String = "claude-sonnet-4-20250514"
    var systemPrompt: String?
    var temperature: Float = 0.7
    var maxTokens: Int = 4096
    var totalInputTokens: Int = 0
    var totalOutputTokens: Int = 0
    var estimatedCost: Double = 0.0
    var filesReferenced: [String] = []
}

struct SessionCheckpoint: Identifiable, Codable {
    let id = UUID()
    let name: String
    let messageIndex: Int
    var note: String = ""
    var createdAt = Date()
}

enum SessionStatus: String, Codable {
    case active, paused, completed, archived, failed
}

struct SessionManagerState {
    var sessions: [Session] = []
    var activeSessionId: UUID?
    var recentSessions: [Session] = []
    var searchResults: [Session] = []
    var isLoading = false
}
