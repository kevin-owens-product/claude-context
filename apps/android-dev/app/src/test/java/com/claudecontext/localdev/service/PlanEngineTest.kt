package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.claude.AgentEngine
import com.claudecontext.localdev.service.claude.ClaudeApiService
import com.claudecontext.localdev.service.claude.PlanEngine
import com.claudecontext.localdev.service.git.GitService
import com.claudecontext.localdev.service.shell.ShellExecutor
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class PlanEngineTest {

    private lateinit var claudeApi: ClaudeApiService
    private lateinit var shell: ShellExecutor
    private lateinit var buildRunner: BuildRunner
    private lateinit var gitService: GitService
    private lateinit var agentEngine: AgentEngine
    private lateinit var planEngine: PlanEngine

    @Before
    fun setup() {
        claudeApi = mockk()
        shell = mockk()
        buildRunner = mockk()
        gitService = mockk()
        agentEngine = AgentEngine(claudeApi, shell, buildRunner, gitService)
        planEngine = PlanEngine(claudeApi, agentEngine, shell)
    }

    @Test
    fun `PlanSession starts at CLARIFY phase`() {
        val session = PlanSession(goal = "Add dark mode support")
        assertEquals(PlanPhase.CLARIFY, session.phase)
        assertEquals("Add dark mode support", session.goal)
        assertTrue(session.questions.isEmpty())
        assertNull(session.plan)
    }

    @Test
    fun `PlanPhase follows correct order`() {
        val expectedPhases = listOf(
            PlanPhase.CLARIFY,
            PlanPhase.RESEARCH,
            PlanPhase.DRAFT,
            PlanPhase.REVIEW,
            PlanPhase.EXECUTE,
            PlanPhase.DONE
        )

        assertEquals(6, PlanPhase.entries.size)
        expectedPhases.forEach { phase ->
            assertTrue("Missing phase: $phase", PlanPhase.entries.contains(phase))
        }
    }

    @Test
    fun `Plan contains structured steps`() {
        val plan = Plan(
            title = "Add Authentication",
            summary = "Implement JWT-based auth with login and signup",
            steps = listOf(
                PlanStep(
                    title = "Create User model",
                    description = "Add User entity with email and password fields",
                    files = listOf("src/models/user.ts")
                ),
                PlanStep(
                    title = "Add auth endpoints",
                    description = "Create login and signup REST endpoints",
                    files = listOf("src/routes/auth.ts"),
                    dependsOn = listOf("step-1")
                ),
                PlanStep(
                    title = "Write tests",
                    description = "Add unit tests for auth flow",
                    files = listOf("tests/auth.test.ts")
                )
            )
        )

        assertEquals("Add Authentication", plan.title)
        assertEquals(3, plan.steps.size)
        assertEquals(1, plan.steps[1].dependsOn.size)
    }

    @Test
    fun `PlanStep tracks status transitions`() {
        var step = PlanStep(title = "Step 1", description = "Do something")
        assertEquals(PlanStepStatus.PENDING, step.status)

        step = step.copy(status = PlanStepStatus.IN_PROGRESS)
        assertEquals(PlanStepStatus.IN_PROGRESS, step.status)

        step = step.copy(status = PlanStepStatus.COMPLETED)
        assertEquals(PlanStepStatus.COMPLETED, step.status)
    }

    @Test
    fun `PlanStepStatus covers all states`() {
        val statuses = PlanStepStatus.entries
        assertTrue(statuses.contains(PlanStepStatus.PENDING))
        assertTrue(statuses.contains(PlanStepStatus.IN_PROGRESS))
        assertTrue(statuses.contains(PlanStepStatus.COMPLETED))
        assertTrue(statuses.contains(PlanStepStatus.SKIPPED))
        assertTrue(statuses.contains(PlanStepStatus.FAILED))
    }

    @Test
    fun `ClarifyingQuestion tracks answers`() {
        val question = ClarifyingQuestion(
            question = "Should we use JWT or session-based auth?",
            answer = null
        )
        assertNull(question.answer)

        val answered = question.copy(answer = "JWT")
        assertEquals("JWT", answered.answer)
    }

    @Test
    fun `ResearchFinding captures file analysis`() {
        val finding = ResearchFinding(
            file = "src/middleware/auth.ts",
            summary = "Existing auth middleware using passport.js",
            relevance = "Will need to be updated to support new JWT flow"
        )

        assertEquals("src/middleware/auth.ts", finding.file)
        assertFalse(finding.summary.isEmpty())
    }

    @Test
    fun `PlanStepProgress tracks execution output`() {
        val progress = PlanStepProgress(
            stepId = "step-1",
            status = PlanStepStatus.COMPLETED,
            output = "Created user.ts with 45 lines",
            filesModified = listOf("src/models/user.ts")
        )

        assertEquals(PlanStepStatus.COMPLETED, progress.status)
        assertEquals(1, progress.filesModified.size)
    }

    @Test
    fun `reset clears session`() {
        planEngine.reset()
        assertNull(planEngine.session.value)
    }

    @Test
    fun `startPlan creates session`() = runTest {
        coEvery { claudeApi.sendMessage(any(), any(), any()) } returns
            ClaudeMessage(
                role = MessageRole.ASSISTANT,
                content = """{"questions": ["What framework?"], "enough_context": false}"""
            )

        planEngine.configure("/test", ProjectLanguage.TYPESCRIPT)
        val session = planEngine.startPlan("Add auth")

        assertNotNull(session)
        assertEquals("Add auth", session.goal)
    }

    @Test
    fun `AiMode has correct display names`() {
        assertEquals("Agent", AiMode.AGENT.displayName)
        assertEquals("Debug", AiMode.DEBUG.displayName)
        assertEquals("Plan", AiMode.PLAN.displayName)
        assertEquals("Swarm", AiMode.SWARM.displayName)
        assertEquals("Queue", AiMode.QUEUE.displayName)
    }

    @Test
    fun `AiMode descriptions are meaningful`() {
        AiMode.entries.forEach { mode ->
            assertTrue(
                "${mode.name} description should not be empty",
                mode.description.isNotEmpty()
            )
            assertTrue(
                "${mode.name} description should be descriptive",
                mode.description.length > 20
            )
        }
    }
}
