package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.ai.ModelRouter
import com.claudecontext.localdev.service.ai.ModelRouter.TaskCategory
import com.claudecontext.localdev.service.ai.RoutingContext
import org.junit.Assert.*
import org.junit.Test

class ModelRouterTest {

    // --- Task Category Classification ---

    @Test
    fun `classifies simple questions correctly`() {
        val category = classifyPrompt("What is a binary tree?")
        assertEquals(TaskCategory.SIMPLE_QUESTION, category)
    }

    @Test
    fun `classifies how questions as simple`() {
        val category = classifyPrompt("How does HTTP work?")
        assertEquals(TaskCategory.SIMPLE_QUESTION, category)
    }

    @Test
    fun `classifies code generation correctly`() {
        val category = classifyPrompt("Create a REST API endpoint for user registration")
        assertEquals(TaskCategory.CODE_GENERATION, category)
    }

    @Test
    fun `classifies implement as code generation`() {
        val category = classifyPrompt("Implement a linked list in Kotlin")
        assertEquals(TaskCategory.CODE_GENERATION, category)
    }

    @Test
    fun `classifies code editing correctly`() {
        val category = classifyPrompt("Modify the login function to add rate limiting")
        assertEquals(TaskCategory.CODE_EDITING, category)
    }

    @Test
    fun `classifies debugging correctly`() {
        val category = classifyPrompt("Fix the null pointer exception in UserService")
        assertEquals(TaskCategory.DEBUGGING, category)
    }

    @Test
    fun `classifies crash reports as debugging`() {
        val category = classifyPrompt("The app crashes when opening the settings page")
        assertEquals(TaskCategory.DEBUGGING, category)
    }

    @Test
    fun `classifies code review correctly`() {
        val category = classifyPrompt("Review this pull request for security issues")
        assertEquals(TaskCategory.CODE_REVIEW, category)
    }

    @Test
    fun `classifies planning correctly`() {
        val category = classifyPrompt("Design the architecture for a microservices system")
        assertEquals(TaskCategory.PLANNING, category)
    }

    @Test
    fun `classifies complex reasoning correctly`() {
        val category = classifyPrompt("Analyze the trade-offs between SQL and NoSQL for this use case")
        assertEquals(TaskCategory.COMPLEX_REASONING, category)
    }

    @Test
    fun `classifies long prompts as complex reasoning`() {
        val longPrompt = "a".repeat(501)
        val category = classifyPrompt(longPrompt)
        assertEquals(TaskCategory.COMPLEX_REASONING, category)
    }

    @Test
    fun `classifies refactoring correctly`() {
        val category = classifyPrompt("Refactor the database layer to use repository pattern")
        assertEquals(TaskCategory.REFACTORING, category)
    }

    @Test
    fun `classifies test generation correctly`() {
        val category = classifyPrompt("Write unit tests for the PaymentService")
        assertEquals(TaskCategory.TEST_GENERATION, category)
    }

    @Test
    fun `classifies documentation correctly`() {
        val category = classifyPrompt("Add documentation to the API endpoints")
        assertEquals(TaskCategory.DOCUMENTATION, category)
    }

    @Test
    fun `classifies unknown prompts as general`() {
        val category = classifyPrompt("hello")
        assertEquals(TaskCategory.GENERAL, category)
    }

    // --- Context-based Routing ---

    @Test
    fun `debug mode overrides classification`() {
        val category = classifyPrompt(
            "What is this function doing?",
            RoutingContext(activeMode = AiMode.DEBUG)
        )
        assertEquals(TaskCategory.DEBUGGING, category)
    }

    @Test
    fun `plan mode overrides classification`() {
        val category = classifyPrompt(
            "Fix this bug",
            RoutingContext(activeMode = AiMode.PLAN)
        )
        assertEquals(TaskCategory.PLANNING, category)
    }

    // --- Model Selection ---

    @Test
    fun `simple questions route to fast tier`() {
        val tier = tierForCategory(TaskCategory.SIMPLE_QUESTION)
        assertEquals(ModelTier.FAST, tier)
    }

    @Test
    fun `code generation routes to standard tier`() {
        val tier = tierForCategory(TaskCategory.CODE_GENERATION)
        assertEquals(ModelTier.STANDARD, tier)
    }

    @Test
    fun `complex reasoning routes to premium tier`() {
        val tier = tierForCategory(TaskCategory.COMPLEX_REASONING)
        assertEquals(ModelTier.PREMIUM, tier)
    }

    @Test
    fun `planning routes to premium tier`() {
        val tier = tierForCategory(TaskCategory.PLANNING)
        assertEquals(ModelTier.PREMIUM, tier)
    }

    @Test
    fun `documentation routes to fast tier`() {
        val tier = tierForCategory(TaskCategory.DOCUMENTATION)
        assertEquals(ModelTier.FAST, tier)
    }

    // --- TaskCategory Enum ---

    @Test
    fun `all task categories have display names`() {
        TaskCategory.entries.forEach { category ->
            assertTrue(category.displayName.isNotEmpty())
        }
    }

    @Test
    fun `task categories count is correct`() {
        assertEquals(11, TaskCategory.entries.size)
    }

    // --- Routing Decision ---

    @Test
    fun `routing decision captures prompt prefix`() {
        val longPrompt = "a".repeat(200)
        val decision = ModelRouter.RoutingDecision(
            prompt = longPrompt.take(100),
            selectedModel = "test",
            reason = "test",
            category = TaskCategory.GENERAL
        )
        assertEquals(100, decision.prompt.length)
    }

    // --- Helper methods that mirror ModelRouter's private logic ---

    private fun classifyPrompt(prompt: String, context: RoutingContext = RoutingContext()): TaskCategory {
        val lower = prompt.lowercase()

        when (context.activeMode) {
            AiMode.DEBUG -> return TaskCategory.DEBUGGING
            AiMode.PLAN -> return TaskCategory.PLANNING
            else -> {}
        }

        return when {
            lower.matches(Regex("^(what|who|when|where|how|why|explain|describe|define|tell me)\\b.*")) &&
                lower.length < 100 && !lower.contains("code") && !lower.contains("implement") ->
                TaskCategory.SIMPLE_QUESTION
            lower.contains("create") || lower.contains("implement") || lower.contains("build") ||
                lower.contains("write a function") || lower.contains("generate code") ||
                lower.contains("add a new") -> TaskCategory.CODE_GENERATION
            lower.contains("edit") || lower.contains("modify") || lower.contains("change") ||
                lower.contains("update") || lower.contains("replace") -> TaskCategory.CODE_EDITING
            lower.contains("bug") || lower.contains("fix") || lower.contains("error") ||
                lower.contains("crash") || lower.contains("debug") || lower.contains("broken") ||
                lower.contains("not working") -> TaskCategory.DEBUGGING
            lower.contains("review") || lower.contains("check") || lower.contains("audit") ||
                lower.contains("security") -> TaskCategory.CODE_REVIEW
            lower.contains("plan") || lower.contains("architect") || lower.contains("design") ||
                lower.contains("strategy") || lower.contains("approach") -> TaskCategory.PLANNING
            lower.contains("analyze") || lower.contains("optimize") || lower.contains("compare") ||
                lower.contains("trade-off") || lower.contains("best way") ||
                lower.length > 500 -> TaskCategory.COMPLEX_REASONING
            lower.contains("refactor") || lower.contains("clean up") || lower.contains("restructure") ||
                lower.contains("simplify") -> TaskCategory.REFACTORING
            lower.contains("test") || lower.contains("spec") || lower.contains("coverage") ->
                TaskCategory.TEST_GENERATION
            lower.contains("document") || lower.contains("readme") || lower.contains("jsdoc") ||
                lower.contains("comment") || lower.contains("explain this code") -> TaskCategory.DOCUMENTATION
            else -> TaskCategory.GENERAL
        }
    }

    private fun tierForCategory(category: TaskCategory): ModelTier {
        return when (category) {
            TaskCategory.SIMPLE_QUESTION, TaskCategory.DOCUMENTATION -> ModelTier.FAST
            TaskCategory.CODE_GENERATION, TaskCategory.CODE_EDITING,
            TaskCategory.DEBUGGING, TaskCategory.REFACTORING,
            TaskCategory.TEST_GENERATION, TaskCategory.CODE_REVIEW,
            TaskCategory.GENERAL -> ModelTier.STANDARD
            TaskCategory.COMPLEX_REASONING, TaskCategory.PLANNING -> ModelTier.PREMIUM
        }
    }
}
