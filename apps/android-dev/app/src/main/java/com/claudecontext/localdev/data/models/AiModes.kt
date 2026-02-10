package com.claudecontext.localdev.data.models

/**
 * The three Cursor-style interaction modes for Claude AI.
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
