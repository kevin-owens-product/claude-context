package com.claudecontext.localdev.service.session

import com.claudecontext.localdev.data.models.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages AI conversation sessions with persistence, branching, restore,
 * and cross-session context sharing.
 */

// --- Data Models ---

data class Session(
    val id: String = UUID.randomUUID().toString(),
    val title: String = "New Session",
    val projectId: Long? = null,
    val mode: AiMode = AiMode.AGENT,
    val messages: List<ClaudeMessage> = emptyList(),
    val branches: List<SessionBranch> = emptyList(),
    val activeBranchId: String? = null,
    val metadata: SessionMetadata = SessionMetadata(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val status: SessionStatus = SessionStatus.ACTIVE,
    val tags: List<String> = emptyList(),
    val parentSessionId: String? = null,
    val checkpoints: List<SessionCheckpoint> = emptyList()
)

data class SessionBranch(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val parentBranchId: String? = null,
    val forkPointMessageIndex: Int,
    val messages: List<ClaudeMessage> = emptyList(),
    val createdAt: Long = System.currentTimeMillis()
)

data class SessionMetadata(
    val modelId: String = "claude-sonnet-4-20250514",
    val systemPrompt: String? = null,
    val temperature: Float = 0.7f,
    val maxTokens: Int = 4096,
    val totalInputTokens: Long = 0,
    val totalOutputTokens: Long = 0,
    val estimatedCost: Double = 0.0,
    val filesReferenced: List<String> = emptyList(),
    val commandsExecuted: List<String> = emptyList()
)

data class SessionCheckpoint(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val messageIndex: Int,
    val note: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

enum class SessionStatus {
    ACTIVE,
    PAUSED,
    COMPLETED,
    ARCHIVED,
    FAILED
}

data class SessionManagerState(
    val sessions: List<Session> = emptyList(),
    val activeSessionId: String? = null,
    val recentSessions: List<Session> = emptyList(),
    val searchResults: List<Session> = emptyList(),
    val isLoading: Boolean = false
)

@Singleton
class SessionManager @Inject constructor(
    private val gson: Gson
) {
    private val _state = MutableStateFlow(SessionManagerState())
    val state: StateFlow<SessionManagerState> = _state.asStateFlow()

    private var sessionsDir: File? = null
    private val maxRecentSessions = 20

    fun configure(projectPath: String) {
        sessionsDir = File(projectPath, ".claude-context/sessions").apply { mkdirs() }
        loadSessions()
    }

    // --- Session Lifecycle ---

    fun createSession(
        title: String = "New Session",
        mode: AiMode = AiMode.AGENT,
        projectId: Long? = null,
        systemPrompt: String? = null,
        modelId: String = "claude-sonnet-4-20250514"
    ): Session {
        val session = Session(
            title = title,
            projectId = projectId,
            mode = mode,
            metadata = SessionMetadata(
                modelId = modelId,
                systemPrompt = systemPrompt
            )
        )

        val sessions = _state.value.sessions + session
        _state.value = _state.value.copy(
            sessions = sessions,
            activeSessionId = session.id,
            recentSessions = (listOf(session) + _state.value.recentSessions).take(maxRecentSessions)
        )

        persistSession(session)
        return session
    }

    fun switchSession(sessionId: String) {
        val session = _state.value.sessions.find { it.id == sessionId } ?: return
        _state.value = _state.value.copy(
            activeSessionId = sessionId,
            recentSessions = (listOf(session) + _state.value.recentSessions.filter { it.id != sessionId })
                .take(maxRecentSessions)
        )
    }

    fun getActiveSession(): Session? {
        val id = _state.value.activeSessionId ?: return null
        return _state.value.sessions.find { it.id == id }
    }

    // --- Message Management ---

    fun addMessage(sessionId: String, message: ClaudeMessage): Session? {
        return updateSession(sessionId) { session ->
            val branchId = session.activeBranchId
            if (branchId != null) {
                val branches = session.branches.map { branch ->
                    if (branch.id == branchId) {
                        branch.copy(messages = branch.messages + message)
                    } else branch
                }
                session.copy(branches = branches, updatedAt = System.currentTimeMillis())
            } else {
                session.copy(
                    messages = session.messages + message,
                    updatedAt = System.currentTimeMillis()
                )
            }
        }
    }

    fun getMessages(sessionId: String): List<ClaudeMessage> {
        val session = _state.value.sessions.find { it.id == sessionId } ?: return emptyList()
        val branchId = session.activeBranchId
        if (branchId != null) {
            val branch = session.branches.find { it.id == branchId }
            if (branch != null) {
                return session.messages.take(branch.forkPointMessageIndex) + branch.messages
            }
        }
        return session.messages
    }

    fun editMessage(sessionId: String, messageIndex: Int, newContent: String): Session? {
        return updateSession(sessionId) { session ->
            val messages = session.messages.toMutableList()
            if (messageIndex in messages.indices) {
                messages[messageIndex] = messages[messageIndex].copy(content = newContent)
                // Remove all messages after the edit point and re-process
                val trimmed = messages.take(messageIndex + 1)
                session.copy(messages = trimmed, updatedAt = System.currentTimeMillis())
            } else session
        }
    }

    // --- Branching ---

    fun createBranch(sessionId: String, name: String, forkAtMessageIndex: Int? = null): SessionBranch? {
        val session = _state.value.sessions.find { it.id == sessionId } ?: return null
        val forkPoint = forkAtMessageIndex ?: session.messages.size

        val branch = SessionBranch(
            name = name,
            parentBranchId = session.activeBranchId,
            forkPointMessageIndex = forkPoint
        )

        updateSession(sessionId) { s ->
            s.copy(
                branches = s.branches + branch,
                activeBranchId = branch.id,
                updatedAt = System.currentTimeMillis()
            )
        }

        return branch
    }

    fun switchBranch(sessionId: String, branchId: String?) {
        updateSession(sessionId) { session ->
            session.copy(activeBranchId = branchId, updatedAt = System.currentTimeMillis())
        }
    }

    fun listBranches(sessionId: String): List<SessionBranch> {
        return _state.value.sessions.find { it.id == sessionId }?.branches ?: emptyList()
    }

    fun mergeBranch(sessionId: String, branchId: String): Session? {
        return updateSession(sessionId) { session ->
            val branch = session.branches.find { it.id == branchId } ?: return@updateSession session
            val baseMessages = session.messages.take(branch.forkPointMessageIndex)
            val mergedMessages = baseMessages + branch.messages

            session.copy(
                messages = mergedMessages,
                branches = session.branches.filter { it.id != branchId },
                activeBranchId = if (session.activeBranchId == branchId) null else session.activeBranchId,
                updatedAt = System.currentTimeMillis()
            )
        }
    }

    // --- Checkpoints ---

    fun createCheckpoint(sessionId: String, name: String, note: String = ""): SessionCheckpoint? {
        val session = _state.value.sessions.find { it.id == sessionId } ?: return null
        val checkpoint = SessionCheckpoint(
            name = name,
            messageIndex = session.messages.size,
            note = note
        )

        updateSession(sessionId) { s ->
            s.copy(
                checkpoints = s.checkpoints + checkpoint,
                updatedAt = System.currentTimeMillis()
            )
        }
        return checkpoint
    }

    fun restoreCheckpoint(sessionId: String, checkpointId: String): Session? {
        return updateSession(sessionId) { session ->
            val checkpoint = session.checkpoints.find { it.id == checkpointId }
                ?: return@updateSession session
            session.copy(
                messages = session.messages.take(checkpoint.messageIndex),
                updatedAt = System.currentTimeMillis()
            )
        }
    }

    // --- Session Operations ---

    fun updateSessionTitle(sessionId: String, title: String) {
        updateSession(sessionId) { it.copy(title = title, updatedAt = System.currentTimeMillis()) }
    }

    fun addTag(sessionId: String, tag: String) {
        updateSession(sessionId) { session ->
            if (tag !in session.tags) {
                session.copy(tags = session.tags + tag, updatedAt = System.currentTimeMillis())
            } else session
        }
    }

    fun removeTag(sessionId: String, tag: String) {
        updateSession(sessionId) { session ->
            session.copy(tags = session.tags - tag, updatedAt = System.currentTimeMillis())
        }
    }

    fun archiveSession(sessionId: String) {
        updateSession(sessionId) { it.copy(status = SessionStatus.ARCHIVED, updatedAt = System.currentTimeMillis()) }
    }

    fun deleteSession(sessionId: String) {
        val sessions = _state.value.sessions.filter { it.id != sessionId }
        val activeId = if (_state.value.activeSessionId == sessionId) null else _state.value.activeSessionId
        _state.value = _state.value.copy(
            sessions = sessions,
            activeSessionId = activeId,
            recentSessions = _state.value.recentSessions.filter { it.id != sessionId }
        )
        sessionsDir?.let { File(it, "$sessionId.json").delete() }
    }

    fun duplicateSession(sessionId: String): Session? {
        val original = _state.value.sessions.find { it.id == sessionId } ?: return null
        return createSession(
            title = "${original.title} (copy)",
            mode = original.mode,
            projectId = original.projectId,
            systemPrompt = original.metadata.systemPrompt,
            modelId = original.metadata.modelId
        ).let { newSession ->
            updateSession(newSession.id) { s ->
                s.copy(
                    messages = original.messages,
                    tags = original.tags,
                    parentSessionId = original.id
                )
            }
        }
    }

    // --- Search ---

    fun searchSessions(query: String): List<Session> {
        val lower = query.lowercase()
        val results = _state.value.sessions.filter { session ->
            session.title.lowercase().contains(lower) ||
            session.tags.any { it.lowercase().contains(lower) } ||
            session.messages.any { it.content.lowercase().contains(lower) }
        }.sortedByDescending { it.updatedAt }

        _state.value = _state.value.copy(searchResults = results)
        return results
    }

    fun getSessionsByTag(tag: String): List<Session> {
        return _state.value.sessions.filter { tag in it.tags }
    }

    fun getSessionsByProject(projectId: Long): List<Session> {
        return _state.value.sessions.filter { it.projectId == projectId }
            .sortedByDescending { it.updatedAt }
    }

    fun getSessionsByMode(mode: AiMode): List<Session> {
        return _state.value.sessions.filter { it.mode == mode }
    }

    // --- Export / Import ---

    suspend fun exportSession(sessionId: String): String? = withContext(Dispatchers.IO) {
        val session = _state.value.sessions.find { it.id == sessionId } ?: return@withContext null
        gson.toJson(session)
    }

    suspend fun importSession(json: String): Session? = withContext(Dispatchers.IO) {
        try {
            val session = gson.fromJson(json, Session::class.java)
            val imported = session.copy(
                id = UUID.randomUUID().toString(),
                title = "${session.title} (imported)",
                status = SessionStatus.ACTIVE,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
            val sessions = _state.value.sessions + imported
            _state.value = _state.value.copy(sessions = sessions)
            persistSession(imported)
            imported
        } catch (e: Exception) {
            null
        }
    }

    // --- Persistence ---

    private fun loadSessions() {
        val dir = sessionsDir ?: return
        _state.value = _state.value.copy(isLoading = true)

        val sessions = dir.listFiles { f -> f.extension == "json" }
            ?.mapNotNull { file ->
                try {
                    gson.fromJson(file.readText(), Session::class.java)
                } catch (e: Exception) {
                    null
                }
            }
            ?.sortedByDescending { it.updatedAt }
            ?: emptyList()

        _state.value = _state.value.copy(
            sessions = sessions,
            recentSessions = sessions.take(maxRecentSessions),
            isLoading = false
        )
    }

    private fun persistSession(session: Session) {
        val dir = sessionsDir ?: return
        try {
            File(dir, "${session.id}.json").writeText(gson.toJson(session))
        } catch (e: Exception) {
            // Log error
        }
    }

    private fun updateSession(sessionId: String, transform: (Session) -> Session): Session? {
        val sessions = _state.value.sessions.toMutableList()
        val index = sessions.indexOfFirst { it.id == sessionId }
        if (index < 0) return null

        val updated = transform(sessions[index])
        sessions[index] = updated

        _state.value = _state.value.copy(sessions = sessions)
        persistSession(updated)
        return updated
    }

    // --- Statistics ---

    fun getStats(): SessionStats {
        val sessions = _state.value.sessions
        val totalMessages = sessions.sumOf { it.messages.size }
        val totalCost = sessions.sumOf { it.metadata.estimatedCost }

        return SessionStats(
            totalSessions = sessions.size,
            activeSessions = sessions.count { it.status == SessionStatus.ACTIVE },
            totalMessages = totalMessages,
            totalBranches = sessions.sumOf { it.branches.size },
            totalCheckpoints = sessions.sumOf { it.checkpoints.size },
            estimatedTotalCost = totalCost,
            mostUsedMode = sessions.groupBy { it.mode }
                .maxByOrNull { it.value.size }?.key ?: AiMode.AGENT,
            sessionsByDay = sessions.groupBy {
                java.text.SimpleDateFormat("yyyy-MM-dd").format(java.util.Date(it.createdAt))
            }.mapValues { it.value.size }
        )
    }
}

data class SessionStats(
    val totalSessions: Int,
    val activeSessions: Int,
    val totalMessages: Int,
    val totalBranches: Int,
    val totalCheckpoints: Int,
    val estimatedTotalCost: Double,
    val mostUsedMode: AiMode,
    val sessionsByDay: Map<String, Int>
)
