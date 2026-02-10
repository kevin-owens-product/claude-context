package com.claudecontext.localdev.service.claude

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.git.GitService
import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Orchestrates multiple agent workers running in parallel to complete a complex goal.
 * Supports four strategies: Divide & Conquer, Pipeline, Review Chain, and Specialist.
 */
@Singleton
class SwarmEngine @Inject constructor(
    private val claudeApi: ClaudeApiService,
    private val shell: ShellExecutor,
    private val buildRunner: BuildRunner,
    private val gitService: GitService
) {

    private val _session = MutableStateFlow<SwarmSession?>(null)
    val session: StateFlow<SwarmSession?> = _session.asStateFlow()

    private var projectPath = ""
    private var projectLanguage = ProjectLanguage.OTHER
    private var activeJobs = mutableMapOf<String, Job>()
    private var scope: CoroutineScope? = null

    companion object {
        private const val DECOMPOSE_PROMPT = """You are a task decomposition expert. Given a high-level goal, break it down into independent subtasks that can be worked on in parallel by different agents.

Respond with JSON:
{
  "subtasks": [
    {
      "title": "Short title",
      "description": "Detailed description of what to do",
      "files": ["expected/files/to/modify.kt"],
      "depends_on": [],
      "priority": 0,
      "role": "backend|frontend|testing|devops|general"
    }
  ]
}

Rules:
1. Each subtask should be independently completable
2. Minimize file overlap between subtasks to avoid merge conflicts
3. Mark dependencies between subtasks using the "depends_on" field (reference by index)
4. Assign priority 0 (highest) to critical-path tasks
5. Assign specialist roles when the task clearly belongs to a domain
6. Aim for 2-5 subtasks, not more"""

        private const val MERGE_REVIEW_PROMPT = """You are a code integration reviewer. Multiple agents worked on subtasks in parallel. Review the combined changes for:
1. Conflicts or contradictions between agent outputs
2. Missing integration points (imports, wiring, etc.)
3. Consistency of naming, patterns, and style

If there are conflicts, describe each one and how to resolve it.

Respond with JSON:
{
  "conflicts": [
    {"file": "path", "description": "what conflicts", "resolution": "how to fix"}
  ],
  "integration_fixes": [
    {"file": "path", "description": "what needs to be added/changed for integration"}
  ],
  "summary": "Overall assessment"
}"""
    }

    fun configure(path: String, language: ProjectLanguage) {
        projectPath = path
        projectLanguage = language
    }

    fun reset() {
        stopAll()
        _session.value = null
    }

    suspend fun startSwarm(goal: String, strategy: SwarmStrategy = SwarmStrategy.DIVIDE_AND_CONQUER): SwarmSession {
        stopAll()

        val session = SwarmSession(
            goal = goal,
            strategy = strategy,
            status = SwarmStatus.PLANNING
        )
        _session.value = session

        return when (strategy) {
            SwarmStrategy.DIVIDE_AND_CONQUER -> runDivideAndConquer(session)
            SwarmStrategy.PIPELINE -> runPipeline(session)
            SwarmStrategy.REVIEW_CHAIN -> runReviewChain(session)
            SwarmStrategy.SPECIALIST -> runSpecialist(session)
        }
    }

    fun stop() {
        stopAll()
        _session.value = _session.value?.copy(status = SwarmStatus.STOPPED)
    }

    private fun stopAll() {
        activeJobs.values.forEach { it.cancel() }
        activeJobs.clear()
        scope?.cancel()
        scope = null
    }

    // --- Divide & Conquer Strategy ---

    private suspend fun runDivideAndConquer(initialSession: SwarmSession): SwarmSession {
        var session = initialSession.copy(status = SwarmStatus.DECOMPOSING)
        _session.value = session

        // Step 1: Decompose the goal into subtasks
        val subtasks = decomposeGoal(session.goal)
        val workers = subtasks.mapIndexed { index, subtask ->
            SwarmWorker(
                name = "Agent ${index + 1}",
                role = extractRole(subtask.description),
                subtaskId = subtask.id
            )
        }

        session = session.copy(
            subtasks = subtasks,
            workers = workers,
            status = SwarmStatus.RUNNING
        )
        _session.value = session

        // Step 2: Run independent agents in parallel
        scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        val results = mutableMapOf<String, AgentSession>()

        val readySubtasks = subtasks.filter { it.dependsOn.isEmpty() }
        val deferredSubtasks = subtasks.filter { it.dependsOn.isNotEmpty() }

        // Launch independent subtasks
        val jobs = readySubtasks.map { subtask ->
            val worker = workers.first { it.subtaskId == subtask.id }
            launchWorker(worker, subtask, session, results)
        }

        // Wait for independent tasks
        jobs.forEach { it.join() }

        // Launch dependent tasks
        for (subtask in deferredSubtasks) {
            val worker = workers.first { it.subtaskId == subtask.id }
            val depOutputs = subtask.dependsOn.mapNotNull { depId ->
                results[depId]?.let { s ->
                    "Previous step result: ${s.actions.lastOrNull()?.output ?: "completed"}"
                }
            }.joinToString("\n")

            val enrichedSubtask = subtask.copy(
                description = "${subtask.description}\n\nContext from prior steps:\n$depOutputs"
            )
            launchWorker(worker, enrichedSubtask, session, results).join()
        }

        // Step 3: Merge and review
        session = _session.value ?: session
        session = session.copy(status = SwarmStatus.MERGING)
        _session.value = session

        val mergeResult = mergeResults(session)
        session = session.copy(
            mergeResult = mergeResult,
            status = if (mergeResult.success) SwarmStatus.COMPLETED else SwarmStatus.REVIEWING
        )
        _session.value = session
        return session
    }

    private fun launchWorker(
        worker: SwarmWorker,
        subtask: SwarmSubtask,
        session: SwarmSession,
        results: MutableMap<String, AgentSession>
    ): Job {
        val job = scope!!.launch {
            val updatedWorker = worker.copy(
                status = SwarmWorkerStatus.RUNNING,
                startedAt = System.currentTimeMillis()
            )
            updateWorker(updatedWorker)
            updateSubtask(subtask.copy(status = PlanStepStatus.IN_PROGRESS))

            try {
                val agentEngine = AgentEngine(claudeApi, shell, buildRunner, gitService)
                agentEngine.configure(projectPath, projectLanguage)
                val agentResult = agentEngine.startTask(subtask.description)

                results[subtask.id] = agentResult

                val finalWorker = updatedWorker.copy(
                    status = if (agentResult.status == AgentSessionStatus.COMPLETED)
                        SwarmWorkerStatus.COMPLETED else SwarmWorkerStatus.FAILED,
                    agentSession = agentResult,
                    output = agentResult.actions.lastOrNull()?.output ?: "",
                    filesModified = agentResult.filesModified,
                    completedAt = System.currentTimeMillis()
                )
                updateWorker(finalWorker)
                updateSubtask(subtask.copy(
                    status = if (agentResult.status == AgentSessionStatus.COMPLETED)
                        PlanStepStatus.COMPLETED else PlanStepStatus.FAILED
                ))
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                updateWorker(updatedWorker.copy(
                    status = SwarmWorkerStatus.FAILED,
                    output = "Error: ${e.message}",
                    completedAt = System.currentTimeMillis()
                ))
                updateSubtask(subtask.copy(status = PlanStepStatus.FAILED))
            }
        }
        activeJobs[worker.id] = job
        return job
    }

    // --- Pipeline Strategy ---

    private suspend fun runPipeline(initialSession: SwarmSession): SwarmSession {
        var session = initialSession.copy(status = SwarmStatus.DECOMPOSING)
        _session.value = session

        val subtasks = decomposeGoal(session.goal)
        val workers = subtasks.mapIndexed { index, subtask ->
            SwarmWorker(
                name = "Stage ${index + 1}",
                role = "pipeline-stage-${index + 1}",
                subtaskId = subtask.id
            )
        }

        session = session.copy(
            subtasks = subtasks,
            workers = workers,
            status = SwarmStatus.RUNNING
        )
        _session.value = session

        // Run each stage sequentially, passing output forward
        var previousOutput = ""
        for (i in subtasks.indices) {
            val subtask = subtasks[i]
            val worker = workers[i]

            val enrichedDescription = if (previousOutput.isNotEmpty()) {
                "${subtask.description}\n\nPrevious stage output:\n$previousOutput"
            } else subtask.description

            updateWorker(worker.copy(status = SwarmWorkerStatus.RUNNING, startedAt = System.currentTimeMillis()))
            updateSubtask(subtask.copy(status = PlanStepStatus.IN_PROGRESS))

            try {
                val agentEngine = AgentEngine(claudeApi, shell, buildRunner, gitService)
                agentEngine.configure(projectPath, projectLanguage)
                val result = agentEngine.startTask(enrichedDescription)

                previousOutput = result.actions
                    .filter { it.status == AgentActionStatus.SUCCESS }
                    .joinToString("\n") { "${it.description}: ${it.output?.take(200) ?: ""}" }

                updateWorker(worker.copy(
                    status = if (result.status == AgentSessionStatus.COMPLETED)
                        SwarmWorkerStatus.COMPLETED else SwarmWorkerStatus.FAILED,
                    agentSession = result,
                    output = previousOutput,
                    filesModified = result.filesModified,
                    completedAt = System.currentTimeMillis()
                ))
                updateSubtask(subtask.copy(
                    status = if (result.status == AgentSessionStatus.COMPLETED)
                        PlanStepStatus.COMPLETED else PlanStepStatus.FAILED
                ))

                if (result.status != AgentSessionStatus.COMPLETED) {
                    session = (_session.value ?: session).copy(status = SwarmStatus.FAILED)
                    _session.value = session
                    return session
                }
            } catch (e: Exception) {
                updateWorker(worker.copy(status = SwarmWorkerStatus.FAILED, output = "Error: ${e.message}"))
                updateSubtask(subtask.copy(status = PlanStepStatus.FAILED))
                session = (_session.value ?: session).copy(status = SwarmStatus.FAILED)
                _session.value = session
                return session
            }
        }

        session = (_session.value ?: session).copy(status = SwarmStatus.COMPLETED)
        _session.value = session
        return session
    }

    // --- Review Chain Strategy ---

    private suspend fun runReviewChain(initialSession: SwarmSession): SwarmSession {
        var session = initialSession.copy(status = SwarmStatus.RUNNING)
        _session.value = session

        // Worker 1: Implementer
        val implementer = SwarmWorker(name = "Implementer", role = "implement", subtaskId = "impl")
        val reviewer1 = SwarmWorker(name = "Reviewer 1", role = "review", subtaskId = "review-1")
        val reviewer2 = SwarmWorker(name = "Reviewer 2", role = "review", subtaskId = "review-2")

        val implSubtask = SwarmSubtask(id = "impl", title = "Implement", description = session.goal)
        val review1Subtask = SwarmSubtask(id = "review-1", title = "Review 1", description = "Review implementation", dependsOn = listOf("impl"))
        val review2Subtask = SwarmSubtask(id = "review-2", title = "Review 2", description = "Final review", dependsOn = listOf("review-1"))

        session = session.copy(
            workers = listOf(implementer, reviewer1, reviewer2),
            subtasks = listOf(implSubtask, review1Subtask, review2Subtask)
        )
        _session.value = session

        // Step 1: Implement
        updateWorker(implementer.copy(status = SwarmWorkerStatus.RUNNING, startedAt = System.currentTimeMillis()))
        updateSubtask(implSubtask.copy(status = PlanStepStatus.IN_PROGRESS))

        val implEngine = AgentEngine(claudeApi, shell, buildRunner, gitService)
        implEngine.configure(projectPath, projectLanguage)
        val implResult = implEngine.startTask(session.goal)

        updateWorker(implementer.copy(
            status = SwarmWorkerStatus.COMPLETED,
            agentSession = implResult,
            filesModified = implResult.filesModified,
            completedAt = System.currentTimeMillis()
        ))
        updateSubtask(implSubtask.copy(status = PlanStepStatus.COMPLETED))

        // Step 2: First review
        val reviewPrompt = buildString {
            appendLine("Review the following changes made by another agent.")
            appendLine("Files modified: ${implResult.filesModified.joinToString(", ")}")
            appendLine("Check for: bugs, edge cases, style issues, missing tests.")
            appendLine("If you find issues, fix them directly. If the code is good, say so.")
        }

        updateWorker(reviewer1.copy(status = SwarmWorkerStatus.RUNNING, startedAt = System.currentTimeMillis()))
        updateSubtask(review1Subtask.copy(status = PlanStepStatus.IN_PROGRESS))

        val reviewEngine1 = AgentEngine(claudeApi, shell, buildRunner, gitService)
        reviewEngine1.configure(projectPath, projectLanguage)
        val reviewResult1 = reviewEngine1.startTask(reviewPrompt)

        updateWorker(reviewer1.copy(
            status = SwarmWorkerStatus.COMPLETED,
            agentSession = reviewResult1,
            filesModified = reviewResult1.filesModified,
            completedAt = System.currentTimeMillis()
        ))
        updateSubtask(review1Subtask.copy(status = PlanStepStatus.COMPLETED))

        // Step 3: Second review (final)
        val finalReviewPrompt = buildString {
            appendLine("Do a final review of the code. Run tests and build to verify everything works.")
            appendLine("Files to check: ${(implResult.filesModified + reviewResult1.filesModified).distinct().joinToString(", ")}")
            appendLine("Fix any remaining issues. Ensure the code compiles and tests pass.")
        }

        updateWorker(reviewer2.copy(status = SwarmWorkerStatus.RUNNING, startedAt = System.currentTimeMillis()))
        updateSubtask(review2Subtask.copy(status = PlanStepStatus.IN_PROGRESS))

        val reviewEngine2 = AgentEngine(claudeApi, shell, buildRunner, gitService)
        reviewEngine2.configure(projectPath, projectLanguage)
        val reviewResult2 = reviewEngine2.startTask(finalReviewPrompt)

        updateWorker(reviewer2.copy(
            status = SwarmWorkerStatus.COMPLETED,
            agentSession = reviewResult2,
            filesModified = reviewResult2.filesModified,
            completedAt = System.currentTimeMillis()
        ))
        updateSubtask(review2Subtask.copy(status = PlanStepStatus.COMPLETED))

        session = (_session.value ?: session).copy(
            status = SwarmStatus.COMPLETED,
            mergeResult = SwarmMergeResult(
                filesModified = (implResult.filesModified + reviewResult1.filesModified + reviewResult2.filesModified).distinct(),
                summary = "Implementation completed with 2 review passes",
                success = true
            )
        )
        _session.value = session
        return session
    }

    // --- Specialist Strategy ---

    private suspend fun runSpecialist(initialSession: SwarmSession): SwarmSession {
        // Same as divide-and-conquer but with explicit specialist role assignment
        return runDivideAndConquer(initialSession)
    }

    // --- Helpers ---

    private suspend fun decomposeGoal(goal: String): List<SwarmSubtask> {
        val contextMessage = ClaudeMessage(
            role = MessageRole.USER,
            content = "Project: $projectPath\nLanguage: ${projectLanguage.displayName}\n\nGoal: $goal"
        )

        return try {
            val response = claudeApi.sendMessage(
                messages = listOf(contextMessage),
                systemPrompt = DECOMPOSE_PROMPT,
                model = "claude-sonnet-4-20250514"
            )

            parseSubtasks(response.content)
        } catch (e: Exception) {
            // Fallback: single subtask
            listOf(SwarmSubtask(title = "Complete task", description = goal))
        }
    }

    private fun parseSubtasks(content: String): List<SwarmSubtask> {
        val subtasks = mutableListOf<SwarmSubtask>()
        val subtasksRegex = Regex(""""subtasks"\s*:\s*\[([\s\S]*?)\]""")
        val arrayContent = subtasksRegex.find(content)?.groupValues?.get(1) ?: return listOf(
            SwarmSubtask(title = "Complete task", description = content)
        )

        val itemRegex = Regex("""\{[^{}]*\}""")
        itemRegex.findAll(arrayContent).forEach { match ->
            val json = match.value
            val title = extractJsonString(json, "title") ?: return@forEach
            val description = extractJsonString(json, "description") ?: title
            val role = extractJsonString(json, "role") ?: "general"
            val filesJson = Regex(""""files"\s*:\s*\[(.*?)\]""").find(json)?.groupValues?.get(1) ?: ""
            val files = Regex(""""([^"]+)"""").findAll(filesJson).map { it.groupValues[1] }.toList()
            val depsJson = Regex(""""depends_on"\s*:\s*\[(.*?)\]""").find(json)?.groupValues?.get(1) ?: ""
            val deps = Regex("""(\d+)""").findAll(depsJson).map { it.groupValues[1] }.toList()
            val priority = Regex(""""priority"\s*:\s*(\d+)""").find(json)?.groupValues?.get(1)?.toIntOrNull() ?: 0

            subtasks.add(SwarmSubtask(
                title = title,
                description = "$description\n[Role: $role]",
                files = files,
                dependsOn = deps,
                priority = priority
            ))
        }

        // Resolve depends_on indices to actual IDs
        if (subtasks.isNotEmpty()) {
            val indexed = subtasks.toList()
            return indexed.map { subtask ->
                subtask.copy(
                    dependsOn = subtask.dependsOn.mapNotNull { depIndex ->
                        depIndex.toIntOrNull()?.let { idx ->
                            if (idx in indexed.indices) indexed[idx].id else null
                        }
                    }
                )
            }
        }

        return subtasks.ifEmpty {
            listOf(SwarmSubtask(title = "Complete task", description = content))
        }
    }

    private fun extractJsonString(json: String, key: String): String? {
        val regex = Regex(""""$key"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        return regex.find(json)?.groupValues?.get(1)
            ?.replace("\\n", "\n")
            ?.replace("\\\"", "\"")
            ?.replace("\\\\", "\\")
    }

    private fun extractRole(description: String): String {
        val roleRegex = Regex("""\[Role:\s*(\w+)\]""")
        return roleRegex.find(description)?.groupValues?.get(1) ?: "general"
    }

    private suspend fun mergeResults(session: SwarmSession): SwarmMergeResult {
        val allFiles = session.workers.flatMap { it.filesModified }.distinct()

        if (allFiles.isEmpty()) {
            return SwarmMergeResult(summary = "No files were modified", success = true)
        }

        // Check for file overlaps (potential conflicts)
        val fileWorkerMap = mutableMapOf<String, MutableList<String>>()
        session.workers.forEach { worker ->
            worker.filesModified.forEach { file ->
                fileWorkerMap.getOrPut(file) { mutableListOf() }.add(worker.name)
            }
        }

        val overlaps = fileWorkerMap.filter { it.value.size > 1 }

        if (overlaps.isEmpty()) {
            return SwarmMergeResult(
                filesModified = allFiles,
                summary = "${session.workers.count { it.status == SwarmWorkerStatus.COMPLETED }} workers completed, ${allFiles.size} files modified, no conflicts",
                success = true
            )
        }

        // Ask Claude to review overlapping files
        val conflicts = mutableListOf<SwarmConflict>()
        try {
            val reviewMessage = ClaudeMessage(
                role = MessageRole.USER,
                content = buildString {
                    appendLine("The following files were modified by multiple agents:")
                    overlaps.forEach { (file, workers) ->
                        appendLine("- $file: modified by ${workers.joinToString(", ")}")
                    }
                    appendLine("\nReview these files for conflicts.")
                }
            )

            val reviewResponse = claudeApi.sendMessage(
                messages = listOf(reviewMessage),
                systemPrompt = MERGE_REVIEW_PROMPT,
                model = "claude-sonnet-4-20250514"
            )

            // Parse conflict response
            val conflictRegex = Regex(""""file"\s*:\s*"([^"]+)"[\s\S]*?"description"\s*:\s*"([^"]+)"[\s\S]*?"resolution"\s*:\s*"([^"]+)"""")
            conflictRegex.findAll(reviewResponse.content).forEach { match ->
                val workers = overlaps[match.groupValues[1]] ?: emptyList()
                conflicts.add(SwarmConflict(
                    file = match.groupValues[1],
                    workerA = workers.getOrElse(0) { "" },
                    workerB = workers.getOrElse(1) { "" },
                    description = match.groupValues[2],
                    resolution = match.groupValues[3]
                ))
            }
        } catch (_: Exception) {
            overlaps.forEach { (file, workers) ->
                conflicts.add(SwarmConflict(
                    file = file,
                    workerA = workers[0],
                    workerB = workers.getOrElse(1) { "" },
                    description = "Both workers modified this file"
                ))
            }
        }

        return SwarmMergeResult(
            conflicts = conflicts,
            filesModified = allFiles,
            summary = "${allFiles.size} files modified, ${conflicts.size} potential conflicts found",
            success = conflicts.isEmpty() || conflicts.all { it.resolved }
        )
    }

    private fun updateWorker(worker: SwarmWorker) {
        val session = _session.value ?: return
        _session.value = session.copy(
            workers = session.workers.map { if (it.id == worker.id) worker else it }
        )
    }

    private fun updateSubtask(subtask: SwarmSubtask) {
        val session = _session.value ?: return
        _session.value = session.copy(
            subtasks = session.subtasks.map { if (it.id == subtask.id) subtask else it }
        )
    }
}
