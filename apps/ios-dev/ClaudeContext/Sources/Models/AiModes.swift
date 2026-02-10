import Foundation

// MARK: - AI Modes

enum AiMode: String, CaseIterable, Identifiable, Codable {
    case agent
    case debug
    case plan
    case swarm
    case queue

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .agent: return "Agent"
        case .debug: return "Debug"
        case .plan: return "Plan"
        case .swarm: return "Swarm"
        case .queue: return "Queue"
        }
    }

    var iconName: String {
        switch self {
        case .agent: return "cpu"
        case .debug: return "ladybug"
        case .plan: return "map"
        case .swarm: return "point.3.connected.trianglepath.dotted"
        case .queue: return "list.bullet.rectangle"
        }
    }
}

// MARK: - Messages

enum MessageRole: String, Codable {
    case user
    case assistant
    case system
}

struct ChatMessage: Identifiable, Codable {
    let id: UUID
    let role: MessageRole
    let content: String
    let timestamp: Date
    var codeBlocks: [CodeBlock]

    init(role: MessageRole, content: String, codeBlocks: [CodeBlock] = []) {
        self.id = UUID()
        self.role = role
        self.content = content
        self.timestamp = Date()
        self.codeBlocks = codeBlocks
    }
}

struct CodeBlock: Identifiable, Codable {
    let id: UUID
    let code: String
    let language: String
    let filePath: String?

    init(code: String, language: String = "", filePath: String? = nil) {
        self.id = UUID()
        self.code = code
        self.language = language
        self.filePath = filePath
    }
}

// MARK: - Agent Mode

struct AgentSession {
    var status: AgentStatus = .idle
    var currentTask: String = ""
    var steps: [AgentStep] = []
    var pendingAction: AgentAction?
}

enum AgentStatus: String {
    case idle, running, waitingApproval, completed, failed
}

struct AgentStep: Identifiable {
    let id = UUID()
    let description: String
    let type: AgentStepType
    var status: AgentStepStatus = .pending
    var output: String?
}

enum AgentStepType { case think, execute, verify }
enum AgentStepStatus { case pending, running, completed, failed }

struct AgentAction: Identifiable {
    let id = UUID()
    let description: String
    let command: String
    let riskLevel: RiskLevel
}

enum RiskLevel { case low, medium, high }

// MARK: - Debug Mode

struct DebugSession {
    var phase: DebugPhase = .idle
    var errorDescription: String = ""
    var hypotheses: [DebugHypothesis] = []
    var instrumentedFiles: [String] = []
    var logs: String = ""
    var suggestedFix: DebugFix?
    var verificationResult: VerificationResult?
}

enum DebugPhase: String {
    case idle, analyzing, instrumenting, collectingLogs, diagnosing, fixing, verifying
}

struct DebugHypothesis: Identifiable {
    let id = UUID()
    let description: String
    var confidence: Double
    var evidence: [String]
}

struct DebugFix: Identifiable {
    let id = UUID()
    let description: String
    let changes: [FileChange]
}

struct FileChange: Identifiable {
    let id = UUID()
    let filePath: String
    let oldContent: String
    let newContent: String
}

struct VerificationResult {
    let success: Bool
    let output: String
    let testsRun: Int
    let testsPassed: Int
}

// MARK: - Plan Mode

struct PlanSession {
    var phase: PlanPhase = .idle
    var goal: String = ""
    var questions: [PlanQuestion] = []
    var plan: DevelopmentPlan?
    var executionProgress: [String: PlanStepStatus] = [:]
}

enum PlanPhase: String {
    case idle, analyzing, clarifying, planning, ready, executing
}

struct PlanQuestion: Identifiable {
    let id = UUID()
    let question: String
    var answer: String?
}

struct DevelopmentPlan: Identifiable {
    let id = UUID()
    let summary: String
    var phases: [PlanPhaseItem]
    let estimatedComplexity: String
}

struct PlanPhaseItem: Identifiable {
    let id = UUID()
    let name: String
    var steps: [PlanStep]
}

struct PlanStep: Identifiable {
    let id = UUID()
    let description: String
    let filesToModify: [String]
    var status: PlanStepStatus
}

enum PlanStepStatus: String {
    case pending, inProgress, completed, failed, skipped
}

// MARK: - Swarm Mode

struct SwarmSession {
    var status: SwarmStatus = .idle
    var strategy: SwarmStrategy = .divideAndConquer
    var goal: String = ""
    var workers: [SwarmWorker] = []
    var subtasks: [SwarmSubtask] = []
    var mergeResult: SwarmMergeResult?
    var conflicts: [SwarmConflict] = []
}

enum SwarmStatus: String {
    case idle, decomposing, running, merging, resolving, completed, failed
}

enum SwarmStrategy: String, CaseIterable {
    case divideAndConquer = "Divide & Conquer"
    case pipeline = "Pipeline"
    case reviewChain = "Review Chain"
    case specialist = "Specialist"
}

struct SwarmWorker: Identifiable {
    let id = UUID()
    let name: String
    let role: String
    var status: SwarmWorkerStatus = .idle
    var currentTask: String?
    var output: String?
}

enum SwarmWorkerStatus: String {
    case idle, working, waiting, completed, failed
}

struct SwarmSubtask: Identifiable {
    let id = UUID()
    let description: String
    var assignedWorker: UUID?
    var status: SwarmWorkerStatus = .idle
    var result: String?
}

struct SwarmMergeResult {
    let success: Bool
    let output: String
    let conflictCount: Int
}

struct SwarmConflict: Identifiable {
    let id = UUID()
    let file: String
    let workerA: String
    let workerB: String
    let description: String
    var resolution: String?
}

// MARK: - Queue Mode

struct PromptQueueState {
    var items: [QueuedPrompt] = []
    var status: QueueStatus = .idle
    var executionMode: QueueExecutionMode = .sequential
    var completedCount: Int = 0
    var failedCount: Int = 0
}

enum QueueStatus: String {
    case idle, processing, paused
}

enum QueueExecutionMode: String, CaseIterable {
    case sequential = "Sequential"
    case parallel = "Parallel"
    case smart = "Smart"
}

struct QueuedPrompt: Identifiable {
    let id: UUID
    let prompt: String
    let mode: AiMode
    var priority: QueuePriority
    var status: QueuedPromptStatus
    var result: String?
    var error: String?
    let createdAt: Date
    var startedAt: Date?
    var completedAt: Date?
    var retryCount: Int = 0

    init(prompt: String, mode: AiMode = .agent, priority: QueuePriority = .normal) {
        self.id = UUID()
        self.prompt = prompt
        self.mode = mode
        self.priority = priority
        self.status = .pending
        self.createdAt = Date()
    }
}

enum QueuePriority: Int, CaseIterable, Comparable {
    case low = 0
    case normal = 1
    case high = 2
    case urgent = 3

    var displayName: String {
        switch self {
        case .low: return "Low"
        case .normal: return "Normal"
        case .high: return "High"
        case .urgent: return "Urgent"
        }
    }

    static func < (lhs: QueuePriority, rhs: QueuePriority) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

enum QueuedPromptStatus: String {
    case pending, running, completed, failed, cancelled
}
