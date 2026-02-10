package com.claudecontext.localdev.data.models

/**
 * The five interaction modes for Claude AI.
 */
enum class AiMode(val displayName: String, val description: String) {
    AGENT(
        "Agent",
        "Autonomous coding agent that reads files, runs commands, edits code, and iterates until the task is done"
    ),
    DEBUG(
        "Debug",
        "Hypothesis-driven debugger that instruments code, analyzes runtime output, and produces minimal fixes"
    ),
    PLAN(
        "Plan",
        "Strategic planner that researches the codebase, creates a step-by-step plan, then executes it"
    ),
    SWARM(
        "Swarm",
        "Spawn multiple agents working in parallel on different subtasks with an orchestrator coordinating the work"
    ),
    QUEUE(
        "Queue",
        "Queue multiple prompts for sequential or parallel execution with priority ordering and dependency tracking"
    ),
    SESSION(
        "Sessions",
        "Manage conversation sessions with branching, checkpoints, search, and export"
    ),
    CONTEXT(
        "Context",
        "View and manage the AI context window, token budget, and tracked files"
    ),
    DESIGN(
        "Design",
        "Customize themes, layout presets, editor settings, and visual configuration"
    )
}

// --- Agent Mode Models ---

enum class AgentToolType {
    READ_FILE,
    EDIT_FILE,
    CREATE_FILE,
    DELETE_FILE,
    SHELL_COMMAND,
    SEARCH_CODEBASE,
    LIST_DIRECTORY,
    GIT_OPERATION,
    BUILD,
    TEST,
    LINT
}

data class AgentAction(
    val id: String = java.util.UUID.randomUUID().toString(),
    val tool: AgentToolType,
    val description: String,
    val input: Map<String, String> = emptyMap(),
    val output: String? = null,
    val status: AgentActionStatus = AgentActionStatus.PENDING,
    val timestamp: Long = System.currentTimeMillis(),
    val durationMs: Long = 0
)

enum class AgentActionStatus {
    PENDING,
    RUNNING,
    SUCCESS,
    FAILED,
    NEEDS_APPROVAL
}

data class AgentSession(
    val id: String = java.util.UUID.randomUUID().toString(),
    val task: String,
    val actions: List<AgentAction> = emptyList(),
    val messages: List<ClaudeMessage> = emptyList(),
    val status: AgentSessionStatus = AgentSessionStatus.IDLE,
    val iterations: Int = 0,
    val maxIterations: Int = 20,
    val filesModified: List<String> = emptyList(),
    val commandsRun: List<String> = emptyList(),
    val startedAt: Long = System.currentTimeMillis()
)

enum class AgentSessionStatus {
    IDLE,
    THINKING,
    EXECUTING,
    WAITING_APPROVAL,
    COMPLETED,
    FAILED,
    STOPPED
}

// --- Debug Mode Models ---

data class DebugSession(
    val id: String = java.util.UUID.randomUUID().toString(),
    val bugDescription: String,
    val phase: DebugPhase = DebugPhase.DESCRIBE,
    val hypotheses: List<DebugHypothesis> = emptyList(),
    val instrumentedFiles: List<InstrumentedFile> = emptyList(),
    val runtimeLogs: List<String> = emptyList(),
    val proposedFix: ProposedFix? = null,
    val messages: List<ClaudeMessage> = emptyList(),
    val verified: Boolean = false,
    val iterations: Int = 0
)

enum class DebugPhase(val displayName: String) {
    DESCRIBE("Describe Bug"),
    HYPOTHESIZE("Generating Hypotheses"),
    INSTRUMENT("Instrumenting Code"),
    REPRODUCE("Reproduce Bug"),
    ANALYZE("Analyzing Logs"),
    FIX("Proposing Fix"),
    VERIFY("Verify Fix"),
    CLEAN("Cleaning Up"),
    DONE("Complete")
}

data class DebugHypothesis(
    val id: String = java.util.UUID.randomUUID().toString(),
    val description: String,
    val likelihood: HypothesisLikelihood = HypothesisLikelihood.MEDIUM,
    val confirmed: Boolean? = null,
    val evidence: String? = null
)

enum class HypothesisLikelihood { HIGH, MEDIUM, LOW }

data class InstrumentedFile(
    val path: String,
    val originalContent: String,
    val instrumentedContent: String,
    val logStatements: List<LogInstrumentation>
)

data class LogInstrumentation(
    val line: Int,
    val statement: String,
    val purpose: String
)

data class ProposedFix(
    val description: String,
    val changes: List<FileChange>,
    val linesChanged: Int
)

data class FileChange(
    val path: String,
    val originalContent: String,
    val newContent: String,
    val description: String
)

// --- Plan Mode Models ---

data class PlanSession(
    val id: String = java.util.UUID.randomUUID().toString(),
    val goal: String,
    val phase: PlanPhase = PlanPhase.CLARIFY,
    val questions: List<ClarifyingQuestion> = emptyList(),
    val researchFindings: List<ResearchFinding> = emptyList(),
    val plan: Plan? = null,
    val executionProgress: List<PlanStepProgress> = emptyList(),
    val messages: List<ClaudeMessage> = emptyList()
)

enum class PlanPhase(val displayName: String) {
    CLARIFY("Clarifying"),
    RESEARCH("Researching Codebase"),
    DRAFT("Drafting Plan"),
    REVIEW("Review Plan"),
    EXECUTE("Executing"),
    DONE("Complete")
}

data class ClarifyingQuestion(
    val question: String,
    val answer: String? = null
)

data class ResearchFinding(
    val file: String,
    val summary: String,
    val relevance: String
)

data class Plan(
    val title: String,
    val summary: String,
    val steps: List<PlanStep>,
    val estimatedFiles: List<String> = emptyList(),
    val markdownContent: String = ""
)

data class PlanStep(
    val id: String = java.util.UUID.randomUUID().toString(),
    val title: String,
    val description: String,
    val files: List<String> = emptyList(),
    val dependsOn: List<String> = emptyList(),
    val status: PlanStepStatus = PlanStepStatus.PENDING
)

enum class PlanStepStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    SKIPPED,
    FAILED
}

data class PlanStepProgress(
    val stepId: String,
    val status: PlanStepStatus,
    val output: String = "",
    val filesModified: List<String> = emptyList()
)

// --- Swarm Mode Models ---

data class SwarmSession(
    val id: String = java.util.UUID.randomUUID().toString(),
    val goal: String,
    val strategy: SwarmStrategy = SwarmStrategy.DIVIDE_AND_CONQUER,
    val workers: List<SwarmWorker> = emptyList(),
    val status: SwarmStatus = SwarmStatus.PLANNING,
    val subtasks: List<SwarmSubtask> = emptyList(),
    val mergeResult: SwarmMergeResult? = null,
    val startedAt: Long = System.currentTimeMillis(),
    val maxWorkers: Int = 5,
    val messages: List<ClaudeMessage> = emptyList()
)

enum class SwarmStrategy(val displayName: String, val description: String) {
    DIVIDE_AND_CONQUER(
        "Divide & Conquer",
        "Break task into independent subtasks, run in parallel, merge results"
    ),
    PIPELINE(
        "Pipeline",
        "Each agent's output feeds into the next agent's input sequentially"
    ),
    REVIEW_CHAIN(
        "Review Chain",
        "One agent implements, others review and iterate until consensus"
    ),
    SPECIALIST(
        "Specialist",
        "Assign subtasks to agents with different expertise (frontend, backend, tests)"
    )
}

enum class SwarmStatus {
    PLANNING,
    DECOMPOSING,
    RUNNING,
    MERGING,
    REVIEWING,
    COMPLETED,
    FAILED,
    STOPPED
}

data class SwarmWorker(
    val id: String = java.util.UUID.randomUUID().toString(),
    val name: String,
    val role: String,
    val subtaskId: String,
    val status: SwarmWorkerStatus = SwarmWorkerStatus.IDLE,
    val agentSession: AgentSession? = null,
    val output: String = "",
    val filesModified: List<String> = emptyList(),
    val startedAt: Long? = null,
    val completedAt: Long? = null
)

enum class SwarmWorkerStatus {
    IDLE,
    RUNNING,
    COMPLETED,
    FAILED,
    BLOCKED
}

data class SwarmSubtask(
    val id: String = java.util.UUID.randomUUID().toString(),
    val title: String,
    val description: String,
    val assignedWorkerId: String? = null,
    val dependsOn: List<String> = emptyList(),
    val status: PlanStepStatus = PlanStepStatus.PENDING,
    val priority: Int = 0,
    val files: List<String> = emptyList()
)

data class SwarmMergeResult(
    val conflicts: List<SwarmConflict> = emptyList(),
    val filesModified: List<String> = emptyList(),
    val summary: String = "",
    val success: Boolean = true
)

data class SwarmConflict(
    val file: String,
    val workerA: String,
    val workerB: String,
    val description: String,
    val resolved: Boolean = false,
    val resolution: String? = null
)

// --- Prompt Queue Models ---

data class PromptQueueState(
    val id: String = java.util.UUID.randomUUID().toString(),
    val items: List<QueuedPrompt> = emptyList(),
    val status: QueueStatus = QueueStatus.IDLE,
    val executionMode: QueueExecutionMode = QueueExecutionMode.SEQUENTIAL,
    val maxConcurrent: Int = 3,
    val completedCount: Int = 0,
    val totalCount: Int = 0
)

enum class QueueStatus {
    IDLE,
    RUNNING,
    PAUSED,
    STOPPED,
    COMPLETED,
    FAILED
}

enum class QueueExecutionMode(val displayName: String) {
    SEQUENTIAL("Sequential"),
    PARALLEL("Parallel"),
    SMART("Smart (auto-detect dependencies)")
}

data class QueuedPrompt(
    val id: String = java.util.UUID.randomUUID().toString(),
    val prompt: String,
    val mode: AiMode = AiMode.AGENT,
    val priority: QueuePriority = QueuePriority.NORMAL,
    val status: QueuedPromptStatus = QueuedPromptStatus.PENDING,
    val dependsOn: List<String> = emptyList(),
    val result: QueuedPromptResult? = null,
    val addedAt: Long = System.currentTimeMillis(),
    val startedAt: Long? = null,
    val completedAt: Long? = null,
    val retryCount: Int = 0,
    val maxRetries: Int = 2
)

enum class QueuePriority(val displayName: String, val weight: Int) {
    CRITICAL("Critical", 4),
    HIGH("High", 3),
    NORMAL("Normal", 2),
    LOW("Low", 1)
}

enum class QueuedPromptStatus {
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED,
    SKIPPED,
    BLOCKED,
    RETRYING
}

data class QueuedPromptResult(
    val output: String = "",
    val filesModified: List<String> = emptyList(),
    val success: Boolean = true,
    val error: String? = null,
    val durationMs: Long = 0
)
