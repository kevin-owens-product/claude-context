package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.session.*
import com.google.gson.Gson
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class SessionManagerTest {

    private lateinit var sessionManager: SessionManager

    @Before
    fun setup() {
        sessionManager = SessionManager(Gson())
    }

    // --- Session Lifecycle ---

    @Test
    fun `createSession creates with defaults`() = runTest {
        val session = sessionManager.createSession(title = "Test Session")

        assertNotNull(session.id)
        assertEquals("Test Session", session.title)
        assertEquals(AiMode.AGENT, session.mode)
        assertEquals(SessionStatus.ACTIVE, session.status)
        assertTrue(session.messages.isEmpty())
    }

    @Test
    fun `createSession sets as active`() = runTest {
        val session = sessionManager.createSession(title = "Test")
        val state = sessionManager.state.first()

        assertEquals(session.id, state.activeSessionId)
    }

    @Test
    fun `createSession adds to recent sessions`() = runTest {
        sessionManager.createSession(title = "First")
        sessionManager.createSession(title = "Second")
        val state = sessionManager.state.first()

        assertEquals(2, state.recentSessions.size)
        assertEquals("Second", state.recentSessions[0].title)
    }

    @Test
    fun `switchSession updates active session`() = runTest {
        val first = sessionManager.createSession(title = "First")
        sessionManager.createSession(title = "Second")
        sessionManager.switchSession(first.id)
        val state = sessionManager.state.first()

        assertEquals(first.id, state.activeSessionId)
    }

    @Test
    fun `getActiveSession returns current session`() = runTest {
        sessionManager.createSession(title = "Active")
        val active = sessionManager.getActiveSession()

        assertNotNull(active)
        assertEquals("Active", active!!.title)
    }

    // --- Message Management ---

    @Test
    fun `addMessage appends to session`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        val message = ClaudeMessage(role = MessageRole.USER, content = "Hello")

        sessionManager.addMessage(session.id, message)
        val messages = sessionManager.getMessages(session.id)

        assertEquals(1, messages.size)
        assertEquals("Hello", messages[0].content)
    }

    @Test
    fun `getMessages returns all messages`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q1"))
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.ASSISTANT, content = "A1"))
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q2"))

        val messages = sessionManager.getMessages(session.id)
        assertEquals(3, messages.size)
    }

    @Test
    fun `editMessage truncates messages after edit point`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q1"))
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.ASSISTANT, content = "A1"))
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q2"))

        sessionManager.editMessage(session.id, 0, "Edited Q1")

        val messages = sessionManager.getMessages(session.id)
        assertEquals(1, messages.size)
        assertEquals("Edited Q1", messages[0].content)
    }

    // --- Branching ---

    @Test
    fun `createBranch creates branch at current point`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q1"))
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.ASSISTANT, content = "A1"))

        val branch = sessionManager.createBranch(session.id, "alternative")

        assertNotNull(branch)
        assertEquals("alternative", branch!!.name)
        assertEquals(2, branch.forkPointMessageIndex)
    }

    @Test
    fun `createBranch sets as active branch`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        val branch = sessionManager.createBranch(session.id, "alt")

        val updated = sessionManager.getActiveSession()
        assertEquals(branch!!.id, updated!!.activeBranchId)
    }

    @Test
    fun `switchBranch changes active branch`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        sessionManager.createBranch(session.id, "b1")
        sessionManager.switchBranch(session.id, null) // back to main

        val updated = sessionManager.getActiveSession()
        assertNull(updated!!.activeBranchId)
    }

    @Test
    fun `branch messages include parent messages`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q1"))
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.ASSISTANT, content = "A1"))

        sessionManager.createBranch(session.id, "alt")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Alt Q2"))

        val messages = sessionManager.getMessages(session.id)
        assertEquals(3, messages.size)
        assertEquals("Q1", messages[0].content)
        assertEquals("A1", messages[1].content)
        assertEquals("Alt Q2", messages[2].content)
    }

    @Test
    fun `mergeBranch combines messages`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q1"))

        val branch = sessionManager.createBranch(session.id, "alt")!!
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "AltQ"))
        sessionManager.mergeBranch(session.id, branch.id)

        val updated = sessionManager.getActiveSession()!!
        assertEquals(2, updated.messages.size)
        assertTrue(updated.branches.isEmpty())
    }

    // --- Checkpoints ---

    @Test
    fun `createCheckpoint saves current position`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q1"))
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.ASSISTANT, content = "A1"))

        val checkpoint = sessionManager.createCheckpoint(session.id, "Before risky change")

        assertNotNull(checkpoint)
        assertEquals("Before risky change", checkpoint!!.name)
        assertEquals(2, checkpoint.messageIndex)
    }

    @Test
    fun `restoreCheckpoint reverts to saved state`() = runTest {
        val session = sessionManager.createSession(title = "Chat")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q1"))
        val checkpoint = sessionManager.createCheckpoint(session.id, "save")!!
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q2"))
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Q3"))

        sessionManager.restoreCheckpoint(session.id, checkpoint.id)

        val messages = sessionManager.getMessages(session.id)
        assertEquals(1, messages.size)
    }

    // --- Session Operations ---

    @Test
    fun `updateSessionTitle changes title`() = runTest {
        val session = sessionManager.createSession(title = "Old")
        sessionManager.updateSessionTitle(session.id, "New Title")

        val state = sessionManager.state.first()
        val updated = state.sessions.find { it.id == session.id }
        assertEquals("New Title", updated!!.title)
    }

    @Test
    fun `addTag adds tag to session`() = runTest {
        val session = sessionManager.createSession(title = "Tagged")
        sessionManager.addTag(session.id, "feature")
        sessionManager.addTag(session.id, "refactor")

        val updated = sessionManager.state.first().sessions.find { it.id == session.id }!!
        assertEquals(2, updated.tags.size)
        assertTrue("feature" in updated.tags)
    }

    @Test
    fun `addTag does not add duplicates`() = runTest {
        val session = sessionManager.createSession(title = "Tagged")
        sessionManager.addTag(session.id, "feature")
        sessionManager.addTag(session.id, "feature")

        val updated = sessionManager.state.first().sessions.find { it.id == session.id }!!
        assertEquals(1, updated.tags.size)
    }

    @Test
    fun `archiveSession changes status`() = runTest {
        val session = sessionManager.createSession(title = "Old")
        sessionManager.archiveSession(session.id)

        val updated = sessionManager.state.first().sessions.find { it.id == session.id }!!
        assertEquals(SessionStatus.ARCHIVED, updated.status)
    }

    @Test
    fun `deleteSession removes from state`() = runTest {
        val session = sessionManager.createSession(title = "Delete Me")
        sessionManager.deleteSession(session.id)

        val state = sessionManager.state.first()
        assertFalse(state.sessions.any { it.id == session.id })
        assertNull(state.activeSessionId)
    }

    @Test
    fun `duplicateSession creates copy`() = runTest {
        val original = sessionManager.createSession(title = "Original")
        sessionManager.addMessage(original.id, ClaudeMessage(role = MessageRole.USER, content = "Q1"))

        val copy = sessionManager.duplicateSession(original.id)

        assertNotNull(copy)
        assertNotEquals(original.id, copy!!.id)
        assertTrue(copy.title.contains("copy"))
        assertEquals(1, copy.messages.size)
    }

    // --- Search ---

    @Test
    fun `searchSessions finds by title`() = runTest {
        sessionManager.createSession(title = "Debugging auth flow")
        sessionManager.createSession(title = "Feature: payment")
        sessionManager.createSession(title = "Bug: auth crash")

        val results = sessionManager.searchSessions("auth")
        assertEquals(2, results.size)
    }

    @Test
    fun `searchSessions finds by tag`() = runTest {
        val session = sessionManager.createSession(title = "Tagged")
        sessionManager.addTag(session.id, "important")
        sessionManager.createSession(title = "Other")

        val results = sessionManager.searchSessions("important")
        assertEquals(1, results.size)
    }

    @Test
    fun `getSessionsByMode filters correctly`() = runTest {
        sessionManager.createSession(title = "Agent 1", mode = AiMode.AGENT)
        sessionManager.createSession(title = "Debug 1", mode = AiMode.DEBUG)
        sessionManager.createSession(title = "Agent 2", mode = AiMode.AGENT)

        val agentSessions = sessionManager.getSessionsByMode(AiMode.AGENT)
        assertEquals(2, agentSessions.size)
    }

    // --- Export / Import ---

    @Test
    fun `exportSession returns JSON`() = runTest {
        val session = sessionManager.createSession(title = "Export Me")
        sessionManager.addMessage(session.id, ClaudeMessage(role = MessageRole.USER, content = "Test"))

        val json = sessionManager.exportSession(session.id)
        assertNotNull(json)
        assertTrue(json!!.contains("Export Me"))
    }

    @Test
    fun `importSession creates new session`() = runTest {
        val session = sessionManager.createSession(title = "Original")
        val json = sessionManager.exportSession(session.id)!!

        val imported = sessionManager.importSession(json)
        assertNotNull(imported)
        assertNotEquals(session.id, imported!!.id)
        assertTrue(imported.title.contains("imported"))
    }

    // --- Statistics ---

    @Test
    fun `getStats calculates correctly`() = runTest {
        sessionManager.createSession(title = "S1", mode = AiMode.AGENT)
        sessionManager.createSession(title = "S2", mode = AiMode.DEBUG)
        sessionManager.createSession(title = "S3", mode = AiMode.AGENT)

        val stats = sessionManager.getStats()
        assertEquals(3, stats.totalSessions)
        assertEquals(3, stats.activeSessions)
        assertEquals(AiMode.AGENT, stats.mostUsedMode)
    }
}
