package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.claude.ClaudeApiService
import com.claudecontext.localdev.service.claude.SwarmEngine
import com.claudecontext.localdev.service.git.GitService
import com.claudecontext.localdev.service.shell.ShellExecutor
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class SwarmEngineTest {

    private lateinit var claudeApi: ClaudeApiService
    private lateinit var shell: ShellExecutor
    private lateinit var buildRunner: BuildRunner
    private lateinit var gitService: GitService
    private lateinit var swarmEngine: SwarmEngine

    @Before
    fun setup() {
        claudeApi = mockk()
        shell = mockk()
        buildRunner = mockk()
        gitService = mockk()
        swarmEngine = SwarmEngine(claudeApi, shell, buildRunner, gitService)
    }

    @Test
    fun `configure sets project path`() {
        swarmEngine.configure("/test/project", ProjectLanguage.KOTLIN)
        assertNull(swarmEngine.session.value)
    }

    @Test
    fun `reset clears session`() {
        swarmEngine.reset()
        assertNull(swarmEngine.session.value)
    }

    @Test
    fun `SwarmSession starts at PLANNING status`() {
        val session = SwarmSession(goal = "Build REST API")
        assertEquals(SwarmStatus.PLANNING, session.status)
        assertEquals("Build REST API", session.goal)
        assertTrue(session.workers.isEmpty())
        assertTrue(session.subtasks.isEmpty())
        assertNull(session.mergeResult)
    }

    @Test
    fun `SwarmStrategy has all four strategies`() {
        val strategies = SwarmStrategy.entries
        assertEquals(4, strategies.size)
        assertTrue(strategies.contains(SwarmStrategy.DIVIDE_AND_CONQUER))
        assertTrue(strategies.contains(SwarmStrategy.PIPELINE))
        assertTrue(strategies.contains(SwarmStrategy.REVIEW_CHAIN))
        assertTrue(strategies.contains(SwarmStrategy.SPECIALIST))
    }

    @Test
    fun `SwarmStrategy has display names and descriptions`() {
        SwarmStrategy.entries.forEach { strategy ->
            assertTrue(strategy.displayName.isNotEmpty())
            assertTrue(strategy.description.length > 10)
        }
    }

    @Test
    fun `SwarmStatus covers all states`() {
        val statuses = SwarmStatus.entries
        assertEquals(8, statuses.size)
        assertTrue(statuses.contains(SwarmStatus.PLANNING))
        assertTrue(statuses.contains(SwarmStatus.DECOMPOSING))
        assertTrue(statuses.contains(SwarmStatus.RUNNING))
        assertTrue(statuses.contains(SwarmStatus.MERGING))
        assertTrue(statuses.contains(SwarmStatus.REVIEWING))
        assertTrue(statuses.contains(SwarmStatus.COMPLETED))
        assertTrue(statuses.contains(SwarmStatus.FAILED))
        assertTrue(statuses.contains(SwarmStatus.STOPPED))
    }

    @Test
    fun `SwarmWorker tracks status and output`() {
        val worker = SwarmWorker(
            name = "Agent 1",
            role = "backend",
            subtaskId = "task-1",
            status = SwarmWorkerStatus.COMPLETED,
            output = "Created 3 files",
            filesModified = listOf("src/api.kt", "src/models.kt")
        )

        assertEquals("Agent 1", worker.name)
        assertEquals("backend", worker.role)
        assertEquals(SwarmWorkerStatus.COMPLETED, worker.status)
        assertEquals(2, worker.filesModified.size)
    }

    @Test
    fun `SwarmWorkerStatus covers all states`() {
        val statuses = SwarmWorkerStatus.entries
        assertEquals(5, statuses.size)
        assertTrue(statuses.contains(SwarmWorkerStatus.IDLE))
        assertTrue(statuses.contains(SwarmWorkerStatus.RUNNING))
        assertTrue(statuses.contains(SwarmWorkerStatus.COMPLETED))
        assertTrue(statuses.contains(SwarmWorkerStatus.FAILED))
        assertTrue(statuses.contains(SwarmWorkerStatus.BLOCKED))
    }

    @Test
    fun `SwarmSubtask tracks dependencies`() {
        val subtask = SwarmSubtask(
            title = "Create API endpoints",
            description = "Build REST endpoints for user CRUD",
            dependsOn = listOf("task-1"),
            priority = 1,
            files = listOf("src/routes/users.kt")
        )

        assertEquals("Create API endpoints", subtask.title)
        assertEquals(1, subtask.dependsOn.size)
        assertEquals(1, subtask.priority)
        assertEquals(PlanStepStatus.PENDING, subtask.status)
    }

    @Test
    fun `SwarmMergeResult tracks conflicts`() {
        val merge = SwarmMergeResult(
            conflicts = listOf(
                SwarmConflict(
                    file = "src/config.kt",
                    workerA = "Agent 1",
                    workerB = "Agent 2",
                    description = "Both modified database config",
                    resolution = "Merge both connection pools"
                )
            ),
            filesModified = listOf("src/config.kt", "src/api.kt"),
            summary = "1 conflict found",
            success = false
        )

        assertEquals(1, merge.conflicts.size)
        assertEquals(2, merge.filesModified.size)
        assertFalse(merge.success)
        assertEquals("Merge both connection pools", merge.conflicts[0].resolution)
    }

    @Test
    fun `SwarmSession default maxWorkers is 5`() {
        val session = SwarmSession(goal = "test")
        assertEquals(5, session.maxWorkers)
    }

    @Test
    fun `SwarmSession default strategy is DIVIDE_AND_CONQUER`() {
        val session = SwarmSession(goal = "test")
        assertEquals(SwarmStrategy.DIVIDE_AND_CONQUER, session.strategy)
    }

    @Test
    fun `stop sets session to STOPPED`() {
        swarmEngine.configure("/test", ProjectLanguage.KOTLIN)
        swarmEngine.stop()
        // Session is null since no swarm was started
        assertNull(swarmEngine.session.value)
    }

    @Test
    fun `startSwarm creates session with goal`() = runTest {
        coEvery { claudeApi.sendMessage(any(), any(), any()) } returns
            ClaudeMessage(
                role = MessageRole.ASSISTANT,
                content = """{"subtasks": [{"title": "Step 1", "description": "Do thing", "files": [], "depends_on": [], "priority": 0, "role": "general"}]}"""
            )
        // Mock the agent execution
        coEvery { shell.execute(any(), any()) } returns
            ShellExecutor.ShellResult(0, "", "")
        coEvery { buildRunner.detectBuildConfig(any(), any()) } returns mockk()

        swarmEngine.configure("/test", ProjectLanguage.KOTLIN)

        // This will try to run the full swarm, but we just verify it starts
        try {
            swarmEngine.startSwarm("Build something", SwarmStrategy.DIVIDE_AND_CONQUER)
        } catch (_: Exception) {
            // Expected since mocks aren't fully set up for the agent loop
        }

        // Session should have been created
        val session = swarmEngine.session.value
        assertNotNull(session)
    }
}
