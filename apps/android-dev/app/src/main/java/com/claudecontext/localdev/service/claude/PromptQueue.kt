package com.claudecontext.localdev.service.claude

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.ai.ModelRouter
import com.claudecontext.localdev.service.ai.MultiModelService
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.context.ContextManager
import com.claudecontext.localdev.service.git.GitService
import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Semaphore
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages a queue of prompts for sequential or parallel execution.
 * Supports priority ordering, dependency tracking, retries, and smart mode detection.
 */
@Singleton
class PromptQueue @Inject constructor(
    private val claudeApi: ClaudeApiService,
    private val multiModelService: MultiModelService,
    private val modelRouter: ModelRouter,
    private val contextManager: ContextManager,
    private val agentEngine: AgentEngine,
    private val debugEngine: DebugEngine,
    private val planEngine: PlanEngine,
    private val shell: ShellExecutor,
    private val buildRunner: BuildRunner,
    private val gitService: GitService
) {

    private val _state = MutableStateFlow(PromptQueueState())
    val state: StateFlow<PromptQueueState> = _state.asStateFlow()

    private var projectPath = ""
    private var projectLanguage = ProjectLanguage.OTHER
    private var executionJob: Job? = null
    private var scope: CoroutineScope? = null

    fun configure(path: String, language: ProjectLanguage) {
        projectPath = path
        projectLanguage = language
    }

    fun reset() {
        executionJob?.cancel()
        scope?.cancel()
        scope = null
        _state.value = PromptQueueState()
    }

    /**
     * Add a prompt to the queue.
     */
    fun enqueue(
        prompt: String,
        mode: AiMode = AiMode.AGENT,
        priority: QueuePriority = QueuePriority.NORMAL,
        dependsOn: List<String> = emptyList()
    ): QueuedPrompt {
        val item = QueuedPrompt(
            prompt = prompt,
            mode = mode,
            priority = priority,
            dependsOn = dependsOn
        )
        val current = _state.value
        _state.value = current.copy(
            items = (current.items + item).sortedByDescending { it.priority.weight },
            totalCount = current.totalCount + 1
        )
        return item
    }

    /**
     * Add multiple prompts at once (batch enqueue).
     */
    fun enqueueBatch(prompts: List<String>, mode: AiMode = AiMode.AGENT): List<QueuedPrompt> {
        return prompts.map { enqueue(it, mode) }
    }

    /**
     * Remove a prompt from the queue (only if pending).
     */
    fun remove(promptId: String) {
        val current = _state.value
        val item = current.items.find { it.id == promptId } ?: return
        if (item.status != QueuedPromptStatus.PENDING) return

        _state.value = current.copy(
            items = current.items.filter { it.id != promptId },
            totalCount = current.totalCount - 1
        )
    }

    /**
     * Reorder a prompt's priority.
     */
    fun setPriority(promptId: String, priority: QueuePriority) {
        val current = _state.value
        _state.value = current.copy(
            items = current.items.map {
                if (it.id == promptId && it.status == QueuedPromptStatus.PENDING) {
                    it.copy(priority = priority)
                } else it
            }.sortedByDescending { it.priority.weight }
        )
    }

    /**
     * Set the execution mode for the queue.
     */
    fun setExecutionMode(mode: QueueExecutionMode) {
        _state.value = _state.value.copy(executionMode = mode)
    }

    /**
     * Start processing the queue.
     */
    suspend fun startProcessing() {
        val current = _state.value
        if (current.status == QueueStatus.RUNNING) return
        if (current.items.none { it.status == QueuedPromptStatus.PENDING }) return

        _state.value = current.copy(status = QueueStatus.RUNNING)

        scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        executionJob = scope!!.launch {
            when (_state.value.executionMode) {
                QueueExecutionMode.SEQUENTIAL -> processSequential()
                QueueExecutionMode.PARALLEL -> processParallel()
                QueueExecutionMode.SMART -> processSmart()
            }
        }
        executionJob!!.join()
    }

    /**
     * Pause processing (finish current item, don't start next).
     */
    fun pause() {
        _state.value = _state.value.copy(status = QueueStatus.PAUSED)
    }

    /**
     * Resume processing from where we paused.
     */
    suspend fun resume() {
        if (_state.value.status != QueueStatus.PAUSED) return
        startProcessing()
    }

    /**
     * Retry a failed prompt.
     */
    fun retryFailed(promptId: String) {
        val current = _state.value
        _state.value = current.copy(
            items = current.items.map {
                if (it.id == promptId && it.status == QueuedPromptStatus.FAILED) {
                    it.copy(
                        status = QueuedPromptStatus.PENDING,
                        retryCount = it.retryCount + 1,
                        result = null
                    )
                } else it
            }
        )
    }

    /**
     * Retry all failed prompts.
     */
    fun retryAllFailed() {
        val current = _state.value
        _state.value = current.copy(
            items = current.items.map {
                if (it.status == QueuedPromptStatus.FAILED && it.retryCount < it.maxRetries) {
                    it.copy(
                        status = QueuedPromptStatus.PENDING,
                        retryCount = it.retryCount + 1,
                        result = null
                    )
                } else it
            }
        )
    }

    // --- Processing Strategies ---

    private suspend fun processSequential() {
        while (true) {
            if (_state.value.status == QueueStatus.PAUSED ||
                _state.value.status == QueueStatus.STOPPED) break

            val next = getNextReady() ?: break
            executePrompt(next)
        }

        finishIfDone()
    }

    private suspend fun processParallel() {
        val maxConcurrent = _state.value.maxConcurrent
        val semaphore = Semaphore(maxConcurrent)

        coroutineScope {
            while (true) {
                if (_state.value.status == QueueStatus.PAUSED ||
                    _state.value.status == QueueStatus.STOPPED) break

                val next = getNextReady() ?: break

                semaphore.acquire()
                launch {
                    try {
                        executePrompt(next)
                    } finally {
                        semaphore.release()
                    }
                }
            }
        }

        finishIfDone()
    }

    private suspend fun processSmart() {
        // Smart mode: detect dependencies automatically and run independent items in parallel
        val maxConcurrent = _state.value.maxConcurrent
        val semaphore = Semaphore(maxConcurrent)

        coroutineScope {
            while (true) {
                if (_state.value.status == QueueStatus.PAUSED ||
                    _state.value.status == QueueStatus.STOPPED) break

                val readyItems = getAllReady()
                if (readyItems.isEmpty()) break

                // Launch all ready items in parallel (up to semaphore limit)
                val jobs = readyItems.map { item ->
                    launch {
                        semaphore.acquire()
                        try {
                            executePrompt(item)
                        } finally {
                            semaphore.release()
                        }
                    }
                }

                // Wait for this batch to complete before checking next batch
                jobs.forEach { it.join() }
            }
        }

        finishIfDone()
    }

    private fun getNextReady(): QueuedPrompt? {
        val items = _state.value.items
        return items.firstOrNull { item ->
            item.status == QueuedPromptStatus.PENDING &&
                item.dependsOn.all { depId ->
                    items.find { it.id == depId }?.status == QueuedPromptStatus.COMPLETED
                }
        }
    }

    private fun getAllReady(): List<QueuedPrompt> {
        val items = _state.value.items
        return items.filter { item ->
            item.status == QueuedPromptStatus.PENDING &&
                item.dependsOn.all { depId ->
                    items.find { it.id == depId }?.status == QueuedPromptStatus.COMPLETED
                }
        }
    }

    private suspend fun executePrompt(item: QueuedPrompt) {
        val startTime = System.currentTimeMillis()

        updateItem(item.copy(
            status = QueuedPromptStatus.RUNNING,
            startedAt = startTime
        ))

        try {
            val result = when (item.mode) {
                AiMode.AGENT -> executeAsAgent(item.prompt)
                AiMode.DEBUG -> executeAsDebug(item.prompt)
                AiMode.PLAN -> executeAsPlan(item.prompt)
                AiMode.SWARM, AiMode.QUEUE, AiMode.SESSION, AiMode.CONTEXT, AiMode.DESIGN ->
                    executeAsAgent(item.prompt) // fallback to agent
            }

            val duration = System.currentTimeMillis() - startTime
            updateItem(item.copy(
                status = QueuedPromptStatus.COMPLETED,
                completedAt = System.currentTimeMillis(),
                result = result.copy(durationMs = duration)
            ))

            _state.value = _state.value.copy(
                completedCount = _state.value.completedCount + 1
            )
        } catch (e: Exception) {
            if (e is CancellationException) throw e

            val duration = System.currentTimeMillis() - startTime
            val shouldRetry = item.retryCount < item.maxRetries

            updateItem(item.copy(
                status = if (shouldRetry) QueuedPromptStatus.RETRYING else QueuedPromptStatus.FAILED,
                result = QueuedPromptResult(
                    success = false,
                    error = e.message ?: "Unknown error",
                    durationMs = duration
                )
            ))

            if (shouldRetry) {
                // Re-enqueue for retry after a delay
                delay(2000L * (item.retryCount + 1)) // exponential backoff
                updateItem(item.copy(
                    status = QueuedPromptStatus.PENDING,
                    retryCount = item.retryCount + 1,
                    result = null
                ))
            }

            // Check if blocked items should be marked
            markBlockedItems(item.id)
        }
    }

    private suspend fun executeAsAgent(prompt: String): QueuedPromptResult {
        val engine = AgentEngine(claudeApi, multiModelService, modelRouter, contextManager, shell, buildRunner, gitService)
        engine.configure(projectPath, projectLanguage)
        val session = engine.startTask(prompt)

        return QueuedPromptResult(
            output = session.actions.lastOrNull()?.output ?: "Task completed",
            filesModified = session.filesModified,
            success = session.status == AgentSessionStatus.COMPLETED
        )
    }

    private suspend fun executeAsDebug(prompt: String): QueuedPromptResult {
        debugEngine.configure(projectPath, projectLanguage)
        val session = debugEngine.startDebug(prompt)

        return QueuedPromptResult(
            output = "Debug session started: ${session.hypotheses.size} hypotheses generated",
            success = true
        )
    }

    private suspend fun executeAsPlan(prompt: String): QueuedPromptResult {
        planEngine.configure(projectPath, projectLanguage)
        val session = planEngine.startPlan(prompt)

        return QueuedPromptResult(
            output = "Plan created with ${session.questions.size} clarifying questions",
            success = true
        )
    }

    private fun updateItem(item: QueuedPrompt) {
        val current = _state.value
        _state.value = current.copy(
            items = current.items.map { if (it.id == item.id) item else it }
        )
    }

    private fun markBlockedItems(failedId: String) {
        val current = _state.value
        _state.value = current.copy(
            items = current.items.map { item ->
                if (item.status == QueuedPromptStatus.PENDING &&
                    failedId in item.dependsOn) {
                    item.copy(status = QueuedPromptStatus.BLOCKED)
                } else item
            }
        )
    }

    private fun finishIfDone() {
        val current = _state.value
        val allDone = current.items.none {
            it.status in listOf(
                QueuedPromptStatus.PENDING,
                QueuedPromptStatus.RUNNING,
                QueuedPromptStatus.RETRYING
            )
        }

        if (allDone) {
            val anyFailed = current.items.any { it.status == QueuedPromptStatus.FAILED }
            _state.value = current.copy(
                status = if (anyFailed) QueueStatus.FAILED else QueueStatus.COMPLETED
            )
        }
    }
}
