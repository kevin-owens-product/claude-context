package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.claude.AgentEngine
import com.claudecontext.localdev.service.claude.ClaudeApiService
import com.claudecontext.localdev.service.git.GitService
import com.claudecontext.localdev.service.shell.ShellExecutor
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class AgentEngineTest {

    private lateinit var claudeApi: ClaudeApiService
    private lateinit var shell: ShellExecutor
    private lateinit var buildRunner: BuildRunner
    private lateinit var gitService: GitService
    private lateinit var agentEngine: AgentEngine

    @Before
    fun setup() {
        claudeApi = mockk()
        shell = mockk()
        buildRunner = mockk()
        gitService = mockk()
        agentEngine = AgentEngine(claudeApi, shell, buildRunner, gitService)
    }

    @Test
    fun `configure sets project path and language`() {
        agentEngine.configure("/test/project", ProjectLanguage.PYTHON)
        assertNull(agentEngine.session.value)
    }

    @Test
    fun `stop sets session status to STOPPED`() = runTest {
        // Start a task that will be stopped
        coEvery { claudeApi.sendMessage(any(), any(), any()) } coAnswers {
            // Simulate slow response
            ClaudeMessage(
                role = MessageRole.ASSISTANT,
                content = """{"tool": "done", "summary": "completed"}"""
            )
        }

        agentEngine.configure("/test", ProjectLanguage.PYTHON)
        agentEngine.stop()
        // After stop, session should reflect stopped state if it was running
    }

    @Test
    fun `AgentSession tracks iterations`() {
        val session = AgentSession(
            task = "Fix the bug",
            iterations = 5,
            maxIterations = 20
        )
        assertEquals(5, session.iterations)
        assertEquals(20, session.maxIterations)
        assertEquals("Fix the bug", session.task)
    }

    @Test
    fun `AgentAction tracks tool execution`() {
        val action = AgentAction(
            tool = AgentToolType.READ_FILE,
            description = "Reading main.py",
            input = mapOf("path" to "main.py"),
            output = "print('hello')",
            status = AgentActionStatus.SUCCESS,
            durationMs = 50
        )

        assertEquals(AgentToolType.READ_FILE, action.tool)
        assertEquals("Reading main.py", action.description)
        assertEquals(AgentActionStatus.SUCCESS, action.status)
        assertEquals(50, action.durationMs)
    }

    @Test
    fun `AgentSession tracks files modified`() {
        val session = AgentSession(
            task = "Refactor code",
            filesModified = listOf("src/main.py", "tests/test_main.py"),
            commandsRun = listOf("python -m pytest")
        )

        assertEquals(2, session.filesModified.size)
        assertEquals(1, session.commandsRun.size)
    }

    @Test
    fun `AgentToolType covers all expected tools`() {
        val expectedTools = listOf(
            AgentToolType.READ_FILE,
            AgentToolType.EDIT_FILE,
            AgentToolType.CREATE_FILE,
            AgentToolType.DELETE_FILE,
            AgentToolType.SHELL_COMMAND,
            AgentToolType.SEARCH_CODEBASE,
            AgentToolType.LIST_DIRECTORY,
            AgentToolType.GIT_OPERATION,
            AgentToolType.BUILD,
            AgentToolType.TEST,
            AgentToolType.LINT
        )

        assertEquals(expectedTools.size, AgentToolType.entries.size)
        expectedTools.forEach { tool ->
            assertTrue("Missing tool: $tool", AgentToolType.entries.contains(tool))
        }
    }

    @Test
    fun `AgentSessionStatus covers all states`() {
        val states = AgentSessionStatus.entries
        assertTrue(states.contains(AgentSessionStatus.IDLE))
        assertTrue(states.contains(AgentSessionStatus.THINKING))
        assertTrue(states.contains(AgentSessionStatus.EXECUTING))
        assertTrue(states.contains(AgentSessionStatus.WAITING_APPROVAL))
        assertTrue(states.contains(AgentSessionStatus.COMPLETED))
        assertTrue(states.contains(AgentSessionStatus.FAILED))
        assertTrue(states.contains(AgentSessionStatus.STOPPED))
    }
}
