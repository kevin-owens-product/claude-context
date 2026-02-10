package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.claude.ClaudeApiService
import com.claudecontext.localdev.service.claude.DebugEngine
import com.claudecontext.localdev.service.shell.ShellExecutor
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class DebugEngineTest {

    private lateinit var claudeApi: ClaudeApiService
    private lateinit var shell: ShellExecutor
    private lateinit var debugEngine: DebugEngine

    @Before
    fun setup() {
        claudeApi = mockk()
        shell = mockk()
        debugEngine = DebugEngine(claudeApi, shell)
    }

    @Test
    fun `configure sets project path`() {
        debugEngine.configure("/test/project", ProjectLanguage.TYPESCRIPT)
        assertNull(debugEngine.session.value)
    }

    @Test
    fun `DebugSession starts at DESCRIBE phase`() {
        val session = DebugSession(bugDescription = "App crashes on login")
        assertEquals(DebugPhase.DESCRIBE, session.phase)
        assertEquals("App crashes on login", session.bugDescription)
        assertTrue(session.hypotheses.isEmpty())
        assertNull(session.proposedFix)
        assertFalse(session.verified)
    }

    @Test
    fun `DebugPhase follows correct order`() {
        val phases = listOf(
            DebugPhase.DESCRIBE,
            DebugPhase.HYPOTHESIZE,
            DebugPhase.INSTRUMENT,
            DebugPhase.REPRODUCE,
            DebugPhase.ANALYZE,
            DebugPhase.FIX,
            DebugPhase.VERIFY,
            DebugPhase.CLEAN,
            DebugPhase.DONE
        )

        assertEquals(9, DebugPhase.entries.size)
        phases.forEach { phase ->
            assertTrue(DebugPhase.entries.contains(phase))
        }
    }

    @Test
    fun `DebugHypothesis supports all likelihood levels`() {
        val high = DebugHypothesis(description = "Null pointer", likelihood = HypothesisLikelihood.HIGH)
        val medium = DebugHypothesis(description = "Race condition", likelihood = HypothesisLikelihood.MEDIUM)
        val low = DebugHypothesis(description = "Memory leak", likelihood = HypothesisLikelihood.LOW)

        assertEquals(HypothesisLikelihood.HIGH, high.likelihood)
        assertEquals(HypothesisLikelihood.MEDIUM, medium.likelihood)
        assertEquals(HypothesisLikelihood.LOW, low.likelihood)
    }

    @Test
    fun `InstrumentedFile preserves original content`() {
        val instrumented = InstrumentedFile(
            path = "src/auth.ts",
            originalContent = "function login() {}",
            instrumentedContent = "function login() { console.log('[DEBUG H1] entering login'); }",
            logStatements = listOf(
                LogInstrumentation(
                    line = 1,
                    statement = "console.log('[DEBUG H1] entering login');",
                    purpose = "Track if login function is called"
                )
            )
        )

        assertEquals("src/auth.ts", instrumented.path)
        assertEquals("function login() {}", instrumented.originalContent)
        assertEquals(1, instrumented.logStatements.size)
        assertEquals("Track if login function is called", instrumented.logStatements[0].purpose)
    }

    @Test
    fun `ProposedFix tracks changes`() {
        val fix = ProposedFix(
            description = "Add null check before accessing user.name",
            changes = listOf(
                FileChange(
                    path = "src/auth.ts",
                    originalContent = "return user.name;",
                    newContent = "return user?.name ?? 'Anonymous';",
                    description = "Add optional chaining"
                )
            ),
            linesChanged = 1
        )

        assertEquals(1, fix.changes.size)
        assertEquals(1, fix.linesChanged)
    }

    @Test
    fun `DebugSession tracks iterations for retry cycles`() {
        val session = DebugSession(
            bugDescription = "Intermittent failure",
            iterations = 3
        )
        assertEquals(3, session.iterations)
    }

    @Test
    fun `reset clears session`() {
        debugEngine.reset()
        assertNull(debugEngine.session.value)
    }

    @Test
    fun `startDebug creates session and generates hypotheses`() = runTest {
        coEvery { shell.execute(any(), any()) } returns
            ShellExecutor.ShellResult(0, "src/main.py", "")
        coEvery { claudeApi.sendMessage(any(), any(), any()) } returns
            ClaudeMessage(
                role = MessageRole.ASSISTANT,
                content = """{"hypotheses": [{"description": "Null reference", "likelihood": "HIGH"}]}"""
            )

        debugEngine.configure("/test", ProjectLanguage.PYTHON)
        val session = debugEngine.startDebug("App crashes")

        assertNotNull(session)
        assertEquals("App crashes", session.bugDescription)
    }
}
