package com.claudecontext.localdev.service.ai

import com.claudecontext.localdev.data.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Intelligent model router that selects the best model for each request.
 * Uses the local model for classification when available, otherwise uses
 * heuristic keyword matching.
 *
 * Routing strategy:
 * - Simple questions (what is X, explain Y) -> fast/cheap model
 * - Code generation/editing -> code-specialized model
 * - Complex reasoning/planning -> premium model
 * - Classification/routing -> local model (free)
 */
@Singleton
class ModelRouter @Inject constructor(
    private val multiModelService: MultiModelService,
    private val localModelService: LocalModelService
) {
    private val _routingLog = MutableStateFlow<List<RoutingDecision>>(emptyList())
    val routingLog: StateFlow<List<RoutingDecision>> = _routingLog.asStateFlow()

    data class RoutingDecision(
        val prompt: String,
        val selectedModel: String,
        val reason: String,
        val category: TaskCategory,
        val timestamp: Long = System.currentTimeMillis()
    )

    enum class TaskCategory(val displayName: String) {
        SIMPLE_QUESTION("Simple Question"),
        CODE_GENERATION("Code Generation"),
        CODE_EDITING("Code Editing"),
        DEBUGGING("Debugging"),
        CODE_REVIEW("Code Review"),
        PLANNING("Planning"),
        COMPLEX_REASONING("Complex Reasoning"),
        REFACTORING("Refactoring"),
        TEST_GENERATION("Test Generation"),
        DOCUMENTATION("Documentation"),
        GENERAL("General")
    }

    /**
     * Route a prompt to the best available model.
     * Returns the model ID to use.
     */
    suspend fun route(prompt: String, context: RoutingContext = RoutingContext()): String {
        val config = multiModelService.routingConfig.value
        val available = multiModelService.getAvailableModels()

        if (available.isEmpty()) {
            return config.primaryModel
        }

        // If auto-routing is disabled, use primary model
        if (!config.autoRoute) {
            return config.primaryModel
        }

        // Classify the task
        val category = classifyTask(prompt, context)

        // Select the best model for this category
        val selectedModel = selectModel(category, config, available)

        // Log the decision
        val decision = RoutingDecision(
            prompt = prompt.take(100),
            selectedModel = selectedModel,
            reason = "Category: ${category.displayName}",
            category = category
        )
        _routingLog.value = (_routingLog.value + decision).takeLast(50)

        return selectedModel
    }

    /**
     * Route and send a message in one call.
     */
    suspend fun routeAndSend(
        messages: List<ClaudeMessage>,
        systemPrompt: String? = null,
        context: RoutingContext = RoutingContext()
    ): ClaudeMessage {
        val lastMessage = messages.lastOrNull { it.role == MessageRole.USER }?.content ?: ""
        val modelId = route(lastMessage, context)
        return multiModelService.sendMessage(messages, systemPrompt, modelId)
    }

    private suspend fun classifyTask(prompt: String, context: RoutingContext): TaskCategory {
        // Try local model classification first (free and fast)
        if (localModelService.status.value.isRunning) {
            val categories = TaskCategory.entries.map { it.name.lowercase().replace("_", " ") }
            val result = localModelService.classify(prompt, categories)
            val matched = TaskCategory.entries.find {
                it.name.lowercase().replace("_", " ") == result.lowercase()
            }
            if (matched != null) return matched
        }

        // Fallback to heuristic classification
        return classifyByHeuristic(prompt, context)
    }

    private fun classifyByHeuristic(prompt: String, context: RoutingContext): TaskCategory {
        val lower = prompt.lowercase()

        // Check for mode-specific overrides
        when (context.activeMode) {
            AiMode.DEBUG -> return TaskCategory.DEBUGGING
            AiMode.PLAN -> return TaskCategory.PLANNING
            else -> {}
        }

        // Pattern matching for task categories
        return when {
            // Simple questions
            lower.matches(Regex("^(what|who|when|where|how|why|explain|describe|define|tell me)\\b.*")) &&
                lower.length < 100 && !lower.contains("code") && !lower.contains("implement") ->
                TaskCategory.SIMPLE_QUESTION

            // Code generation
            lower.contains("create") || lower.contains("implement") || lower.contains("build") ||
                lower.contains("write a function") || lower.contains("generate code") ||
                lower.contains("add a new") ->
                TaskCategory.CODE_GENERATION

            // Code editing
            lower.contains("edit") || lower.contains("modify") || lower.contains("change") ||
                lower.contains("update") || lower.contains("replace") ->
                TaskCategory.CODE_EDITING

            // Debugging
            lower.contains("bug") || lower.contains("fix") || lower.contains("error") ||
                lower.contains("crash") || lower.contains("debug") || lower.contains("broken") ||
                lower.contains("not working") ->
                TaskCategory.DEBUGGING

            // Code review
            lower.contains("review") || lower.contains("check") || lower.contains("audit") ||
                lower.contains("security") ->
                TaskCategory.CODE_REVIEW

            // Planning
            lower.contains("plan") || lower.contains("architect") || lower.contains("design") ||
                lower.contains("strategy") || lower.contains("approach") ->
                TaskCategory.PLANNING

            // Complex reasoning
            lower.contains("analyze") || lower.contains("optimize") || lower.contains("compare") ||
                lower.contains("trade-off") || lower.contains("best way") ||
                lower.length > 500 ->
                TaskCategory.COMPLEX_REASONING

            // Refactoring
            lower.contains("refactor") || lower.contains("clean up") || lower.contains("restructure") ||
                lower.contains("simplify") ->
                TaskCategory.REFACTORING

            // Test generation
            lower.contains("test") || lower.contains("spec") || lower.contains("coverage") ->
                TaskCategory.TEST_GENERATION

            // Documentation
            lower.contains("document") || lower.contains("readme") || lower.contains("jsdoc") ||
                lower.contains("comment") || lower.contains("explain this code") ->
                TaskCategory.DOCUMENTATION

            else -> TaskCategory.GENERAL
        }
    }

    private fun selectModel(
        category: TaskCategory,
        config: ModelRoutingConfig,
        available: List<AiModel>
    ): String {
        // Check if specific model is configured for this category
        val specificModel = when (category) {
            TaskCategory.SIMPLE_QUESTION, TaskCategory.DOCUMENTATION ->
                config.fastModel
            TaskCategory.CODE_GENERATION, TaskCategory.CODE_EDITING,
            TaskCategory.REFACTORING, TaskCategory.TEST_GENERATION ->
                config.codeModel
            TaskCategory.COMPLEX_REASONING, TaskCategory.PLANNING ->
                config.reasoningModel
            else -> null
        }

        // If specific model is set and available, use it
        if (specificModel != null && available.any { it.id == specificModel }) {
            return specificModel
        }

        // Auto-select based on tier matching
        val targetTier = when (category) {
            TaskCategory.SIMPLE_QUESTION, TaskCategory.DOCUMENTATION ->
                ModelTier.FAST
            TaskCategory.CODE_GENERATION, TaskCategory.CODE_EDITING,
            TaskCategory.DEBUGGING, TaskCategory.REFACTORING,
            TaskCategory.TEST_GENERATION, TaskCategory.CODE_REVIEW,
            TaskCategory.GENERAL ->
                ModelTier.STANDARD
            TaskCategory.COMPLEX_REASONING, TaskCategory.PLANNING ->
                ModelTier.PREMIUM
        }

        // Try to find a model of the target tier
        val tierMatch = available.filter { it.tier == targetTier }
        if (tierMatch.isNotEmpty()) {
            return tierMatch.first().id
        }

        // Fall back to primary model
        return config.primaryModel
    }

    /**
     * Check if a prompt can be answered locally (no API call needed).
     */
    suspend fun canAnswerLocally(prompt: String): Boolean {
        if (!localModelService.status.value.isRunning) return false

        val category = classifyByHeuristic(prompt, RoutingContext())
        return category == TaskCategory.SIMPLE_QUESTION
    }

    /**
     * Answer a simple question using the local model.
     */
    suspend fun answerLocally(prompt: String): ClaudeMessage? {
        if (!canAnswerLocally(prompt)) return null

        val answer = localModelService.quickAnswer(prompt)
        return if (answer.isNotEmpty()) {
            ClaudeMessage(role = MessageRole.ASSISTANT, content = answer)
        } else null
    }
}

data class RoutingContext(
    val activeMode: AiMode? = null,
    val currentFile: String? = null,
    val projectLanguage: ProjectLanguage? = null,
    val conversationLength: Int = 0
)
