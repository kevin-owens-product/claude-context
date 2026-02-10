package com.claudecontext.localdev.service

import com.claudecontext.localdev.service.context.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ContextManagerTest {

    private lateinit var contextManager: ContextManager

    @Before
    fun setup() {
        contextManager = ContextManager()
    }

    // --- Entry Management ---

    @Test
    fun `addEntry stores entry`() = runTest {
        val entry = ContextEntry(
            type = ContextType.FILE,
            source = "/test/file.kt",
            content = "fun main() {}",
            tokenEstimate = 5
        )
        contextManager.addEntry(entry)

        val state = contextManager.state.first()
        assertEquals(1, state.entries.size)
        assertEquals("/test/file.kt", state.entries[0].source)
    }

    @Test
    fun `addEntry updates existing entry with same source and type`() = runTest {
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "file.kt", content = "v1", tokenEstimate = 10))
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "file.kt", content = "v2", tokenEstimate = 15))

        val state = contextManager.state.first()
        assertEquals(1, state.entries.size)
        assertEquals("v2", state.entries[0].content)
        assertEquals(15, state.entries[0].tokenEstimate)
        assertEquals(1, state.entries[0].accessCount)
    }

    @Test
    fun `removeEntry removes from state`() = runTest {
        val entry = ContextEntry(type = ContextType.FILE, source = "file.kt", content = "test", tokenEstimate = 5)
        contextManager.addEntry(entry)
        contextManager.removeEntry(entry.id)

        val state = contextManager.state.first()
        assertTrue(state.entries.isEmpty())
    }

    @Test
    fun `pinEntry toggles pin`() = runTest {
        val entry = ContextEntry(type = ContextType.FILE, source = "file.kt", content = "test", tokenEstimate = 5)
        contextManager.addEntry(entry)
        contextManager.pinEntry(entry.id, true)

        val state = contextManager.state.first()
        assertTrue(state.entries[0].pinned)
    }

    @Test
    fun `setPriority updates priority`() = runTest {
        val entry = ContextEntry(type = ContextType.FILE, source = "file.kt", content = "test", tokenEstimate = 5)
        contextManager.addEntry(entry)
        contextManager.setPriority(entry.id, ContextPriority.CRITICAL)

        val state = contextManager.state.first()
        assertEquals(ContextPriority.CRITICAL, state.entries[0].priority)
    }

    @Test
    fun `clearAll keeps pinned entries`() = runTest {
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "a.kt", content = "a", tokenEstimate = 5))
        val pinned = ContextEntry(type = ContextType.USER_NOTE, source = "note", content = "important", tokenEstimate = 3, pinned = true)
        contextManager.addEntry(pinned)
        contextManager.clearAll()

        val state = contextManager.state.first()
        assertEquals(1, state.entries.size)
        assertTrue(state.entries[0].pinned)
    }

    @Test
    fun `clearByType removes only specified type`() = runTest {
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "a.kt", content = "a", tokenEstimate = 5))
        contextManager.addEntry(ContextEntry(type = ContextType.ERROR_LOG, source = "build", content = "err", tokenEstimate = 3))
        contextManager.clearByType(ContextType.FILE)

        val state = contextManager.state.first()
        assertEquals(1, state.entries.size)
        assertEquals(ContextType.ERROR_LOG, state.entries[0].type)
    }

    // --- Token Budget ---

    @Test
    fun `budget tracks used tokens`() = runTest {
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "a.kt", content = "test", tokenEstimate = 1000))
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "b.kt", content = "test", tokenEstimate = 2000))

        val budget = contextManager.state.first().budget
        assertEquals(3000, budget.usedTokens)
    }

    @Test
    fun `budget default is 100k tokens`() = runTest {
        val budget = contextManager.state.first().budget
        assertEquals(100000, budget.maxTokens)
    }

    @Test
    fun `budget available tokens accounts for reserves`() = runTest {
        val budget = contextManager.state.first().budget
        assertEquals(100000 - 4096 - 2000, budget.availableTokens)
    }

    @Test
    fun `setMaxTokenBudget updates budget`() = runTest {
        contextManager.setMaxTokenBudget(200000)
        assertEquals(200000, contextManager.state.first().budget.maxTokens)
    }

    // --- Context Assembly ---

    @Test
    fun `assembleContext includes pinned entries first`() = runTest {
        val pinned = ContextEntry(type = ContextType.USER_NOTE, source = "note", content = "important", tokenEstimate = 50, pinned = true)
        val normal = ContextEntry(type = ContextType.FILE, source = "a.kt", content = "code", tokenEstimate = 50)
        contextManager.addEntry(normal)
        contextManager.addEntry(pinned)

        val assembled = contextManager.assembleContext()
        assertTrue(assembled.entries.any { it.pinned })
    }

    @Test
    fun `assembleContext respects budget`() = runTest {
        contextManager.setMaxTokenBudget(200) // Very small budget

        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "a.kt", content = "a".repeat(10000), tokenEstimate = 100))
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "b.kt", content = "b".repeat(10000), tokenEstimate = 100))
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "c.kt", content = "c".repeat(10000), tokenEstimate = 100))

        val assembled = contextManager.assembleContext()
        assertTrue(assembled.droppedEntries.isNotEmpty() || assembled.truncatedEntries.isNotEmpty())
    }

    @Test
    fun `assembleContext generates system prompt`() = runTest {
        contextManager.addEntry(ContextEntry(type = ContextType.FILE, source = "Main.kt", content = "fun main() {}", tokenEstimate = 10, metadata = mapOf("language" to "kotlin")))
        contextManager.addEntry(ContextEntry(type = ContextType.ERROR_LOG, source = "build", content = "NullPointerException", tokenEstimate = 5))

        val assembled = contextManager.assembleContext()
        assertTrue(assembled.systemPrompt.contains("Open Files"))
        assertTrue(assembled.systemPrompt.contains("Main.kt"))
        assertTrue(assembled.systemPrompt.contains("Active Errors"))
        assertTrue(assembled.systemPrompt.contains("NullPointerException"))
    }

    // --- Helper entry methods ---

    @Test
    fun `addErrorLog creates critical entry`() = runTest {
        contextManager.addErrorLog("NullPointerException at line 42", "build")
        val state = contextManager.state.first()

        assertEquals(1, state.entries.size)
        assertEquals(ContextType.ERROR_LOG, state.entries[0].type)
        assertEquals(ContextPriority.CRITICAL, state.entries[0].priority)
    }

    @Test
    fun `addGitDiff creates high priority entry`() = runTest {
        contextManager.addGitDiff("+new line\n-old line")
        val state = contextManager.state.first()

        assertEquals(ContextType.GIT_DIFF, state.entries[0].type)
        assertEquals(ContextPriority.HIGH, state.entries[0].priority)
    }

    @Test
    fun `addUserNote creates pinned entry`() = runTest {
        contextManager.addUserNote("Remember to handle null", "Auth Note")
        val state = contextManager.state.first()

        assertEquals(ContextType.USER_NOTE, state.entries[0].type)
        assertTrue(state.entries[0].pinned)
        assertEquals("Auth Note", state.entries[0].source)
    }

    @Test
    fun `addTerminalOutput stores command metadata`() = runTest {
        contextManager.addTerminalOutput("test passed", "npm test")
        val state = contextManager.state.first()

        assertEquals(ContextType.TERMINAL_OUTPUT, state.entries[0].type)
        assertEquals("npm test", state.entries[0].metadata["command"])
    }

    // --- Strategy ---

    @Test
    fun `setStrategy updates strategy`() = runTest {
        contextManager.setStrategy(ContextStrategy.RECENCY_FIRST)
        assertEquals(ContextStrategy.RECENCY_FIRST, contextManager.state.first().contextStrategy)
    }

    @Test
    fun `default strategy is smart priority`() = runTest {
        assertEquals(ContextStrategy.SMART_PRIORITY, contextManager.state.first().contextStrategy)
    }

    // --- Context Types ---

    @Test
    fun `all context types have display names`() {
        ContextType.entries.forEach {
            assertTrue(it.displayName.isNotEmpty())
        }
    }

    @Test
    fun `context type count is correct`() {
        assertEquals(14, ContextType.entries.size)
    }

    // --- Auto Tracking ---

    @Test
    fun `setAutoTrackFiles toggles tracking`() = runTest {
        contextManager.setAutoTrackFiles(false)
        assertFalse(contextManager.state.first().autoTrackFiles)
    }

    @Test
    fun `setAutoIncludeErrors toggles error tracking`() = runTest {
        contextManager.setAutoIncludeErrors(false)
        assertFalse(contextManager.state.first().autoIncludeErrors)
    }
}
