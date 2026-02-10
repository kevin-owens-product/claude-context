package com.claudecontext.localdev.service.claude

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.ai.ModelRouter
import com.claudecontext.localdev.service.ai.MultiModelService
import com.claudecontext.localdev.service.ai.RoutingContext
import com.claudecontext.localdev.service.context.ContextManager
import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Hypothesis-driven debug engine that instruments code with logging,
 * analyzes runtime output, and produces minimal fixes. Mirrors Cursor's Debug mode.
 *
 * Three-phase cycle:
 *  1. DESCRIBE -> HYPOTHESIZE -> INSTRUMENT (add debug logging)
 *  2. REPRODUCE (user runs the app) -> ANALYZE (parse logs)
 *  3. FIX -> VERIFY -> CLEAN (remove instrumentation)
 */
@Singleton
class DebugEngine @Inject constructor(
    private val claudeApi: ClaudeApiService,
    private val multiModelService: MultiModelService,
    private val modelRouter: ModelRouter,
    private val contextManager: ContextManager,
    private val shell: ShellExecutor
) {

    private val _session = MutableStateFlow<DebugSession?>(null)
    val session: StateFlow<DebugSession?> = _session.asStateFlow()

    private var projectPath = ""
    private var projectLanguage = ProjectLanguage.OTHER

    companion object {
        private const val HYPOTHESIS_PROMPT = """You are a senior debugging expert. Given a bug description and relevant code, generate hypotheses about the root cause.

Respond with valid JSON:
{
  "hypotheses": [
    {"description": "...", "likelihood": "HIGH|MEDIUM|LOW", "files_to_check": ["path1", "path2"]},
    ...
  ]
}

Generate 3-5 hypotheses ordered by likelihood. Consider:
- Logic errors, off-by-one, null/undefined references
- Race conditions, async issues, state management bugs
- Wrong assumptions about API behavior
- Edge cases in input handling"""

        private const val INSTRUMENT_PROMPT = """You are a debugging expert. Given hypotheses about a bug, instrument the relevant code with logging statements to test each hypothesis.

For each file, respond with valid JSON:
{
  "instrumented_files": [
    {
      "path": "file/path",
      "logs": [
        {"line": 10, "statement": "console.log('[DEBUG H1] variable=', variable);", "purpose": "Test if variable has expected value"}
      ]
    }
  ]
}

Rules:
- Use the language-appropriate logging (print/console.log/println/log.debug etc.)
- Prefix all debug statements with [DEBUG H<n>] where n is the hypothesis number
- Log variable values, execution paths, and timing
- Keep instrumentation minimal and targeted"""

        private const val ANALYZE_PROMPT = """You are a debugging expert. Analyze the runtime logs collected from instrumented code to determine the root cause of the bug.

Based on the evidence, respond with valid JSON:
{
  "root_cause": "Clear description of the root cause",
  "confirmed_hypothesis": "H1|H2|...|NONE",
  "evidence": "Specific log lines that prove this",
  "fix": {
    "description": "What the fix should do",
    "changes": [
      {
        "path": "file/path",
        "description": "What to change",
        "old_code": "the buggy code",
        "new_code": "the fixed code"
      }
    ]
  },
  "needs_more_data": false
}

If the logs are insufficient, set needs_more_data to true and suggest additional instrumentation."""

        private const val FIX_PROMPT = """You are a debugging expert. Apply the minimal fix to resolve the bug.
Only change what is necessary. Remove all debug instrumentation logging (lines prefixed with [DEBUG]).
Return the clean, fixed file content.

Respond with JSON:
{
  "fixed_files": [
    {"path": "file/path", "content": "...full clean file content..."}
  ]
}"""
    }

    fun configure(path: String, language: ProjectLanguage) {
        projectPath = path
        projectLanguage = language
    }

    suspend fun startDebug(bugDescription: String): DebugSession {
        val session = DebugSession(
            bugDescription = bugDescription,
            phase = DebugPhase.DESCRIBE
        )
        _session.value = session
        return generateHypotheses(session)
    }

    suspend fun generateHypotheses(session: DebugSession): DebugSession {
        val updated = session.copy(phase = DebugPhase.HYPOTHESIZE)
        _session.value = updated

        val relevantFiles = findRelevantFiles(session.bugDescription)
        val codeContext = relevantFiles.take(5).joinToString("\n\n") { path ->
            val file = File(resolvePath(path))
            if (file.exists()) "=== $path ===\n${file.readText().take(3000)}" else ""
        }

        val assembled = contextManager.assembleContext(userPrompt = session.bugDescription)
        val routingCtx = RoutingContext(activeMode = AiMode.DEBUG, projectLanguage = projectLanguage)
        val response = modelRouter.routeAndSend(
            messages = listOf(
                ClaudeMessage(
                    role = MessageRole.USER,
                    content = "Bug: ${session.bugDescription}\n\nRelevant code:\n$codeContext"
                )
            ),
            systemPrompt = HYPOTHESIS_PROMPT + "\n\n" + assembled.systemPrompt,
            context = routingCtx
        )

        val hypotheses = parseHypotheses(response.content)
        val result = updated.copy(
            hypotheses = hypotheses,
            messages = updated.messages + response
        )
        _session.value = result
        return result
    }

    suspend fun instrumentCode(session: DebugSession): DebugSession {
        val updated = session.copy(phase = DebugPhase.INSTRUMENT)
        _session.value = updated

        val hypothesesText = session.hypotheses.mapIndexed { i, h ->
            "H${i + 1} [${h.likelihood}]: ${h.description}"
        }.joinToString("\n")

        val relevantFiles = findRelevantFiles(session.bugDescription)
        val codeContext = relevantFiles.take(5).joinToString("\n\n") { path ->
            val file = File(resolvePath(path))
            if (file.exists()) "=== $path ===\n${file.readText()}" else ""
        }

        val response = modelRouter.routeAndSend(
            messages = listOf(
                ClaudeMessage(
                    role = MessageRole.USER,
                    content = "Hypotheses:\n$hypothesesText\n\nCode:\n$codeContext\n\nBug: ${session.bugDescription}"
                )
            ),
            systemPrompt = INSTRUMENT_PROMPT,
            context = RoutingContext(activeMode = AiMode.DEBUG, projectLanguage = projectLanguage)
        )

        val instrumentedFiles = applyInstrumentation(response.content)
        val result = updated.copy(
            instrumentedFiles = instrumentedFiles,
            phase = DebugPhase.REPRODUCE,
            messages = updated.messages + response
        )
        _session.value = result
        return result
    }

    suspend fun submitRuntimeLogs(session: DebugSession, logs: String): DebugSession {
        val updated = session.copy(
            phase = DebugPhase.ANALYZE,
            runtimeLogs = session.runtimeLogs + logs
        )
        _session.value = updated

        val hypothesesText = session.hypotheses.mapIndexed { i, h ->
            "H${i + 1}: ${h.description}"
        }.joinToString("\n")

        val response = modelRouter.routeAndSend(
            messages = listOf(
                ClaudeMessage(
                    role = MessageRole.USER,
                    content = "Bug: ${session.bugDescription}\n\nHypotheses:\n$hypothesesText\n\nRuntime logs:\n$logs"
                )
            ),
            systemPrompt = ANALYZE_PROMPT,
            context = RoutingContext(activeMode = AiMode.DEBUG, projectLanguage = projectLanguage)
        )

        val analysis = parseAnalysis(response.content, session)
        _session.value = analysis
        return analysis
    }

    suspend fun applyFix(session: DebugSession): DebugSession {
        val fix = session.proposedFix ?: return session
        val updated = session.copy(phase = DebugPhase.FIX)
        _session.value = updated

        for (change in fix.changes) {
            val file = File(resolvePath(change.path))
            file.writeText(change.newContent)
        }

        val result = updated.copy(phase = DebugPhase.VERIFY)
        _session.value = result
        return result
    }

    suspend fun verifyAndClean(session: DebugSession, bugFixed: Boolean): DebugSession {
        if (bugFixed) {
            val cleaned = session.copy(phase = DebugPhase.CLEAN)
            _session.value = cleaned

            // Remove any remaining debug instrumentation
            for (instrumented in session.instrumentedFiles) {
                val file = File(resolvePath(instrumented.path))
                if (file.exists()) {
                    val content = file.readText()
                    val cleanedContent = content.lines()
                        .filter { !it.contains("[DEBUG H") }
                        .joinToString("\n")
                    file.writeText(cleanedContent)
                }
            }

            val done = cleaned.copy(phase = DebugPhase.DONE, verified = true)
            _session.value = done
            return done
        } else {
            // Bug not fixed - add more instrumentation and retry
            val retry = session.copy(
                phase = DebugPhase.HYPOTHESIZE,
                iterations = session.iterations + 1
            )
            _session.value = retry
            return generateHypotheses(retry)
        }
    }

    fun reset() {
        _session.value = null
    }

    private suspend fun findRelevantFiles(query: String): List<String> {
        val keywords = query.split(" ")
            .filter { it.length > 3 }
            .take(5)

        val files = mutableSetOf<String>()
        for (keyword in keywords) {
            val result = shell.execute(
                "grep -rl --include='*.{kt,java,py,js,ts,go,rs}' '$keyword' . | head -10",
                projectPath
            )
            if (result.isSuccess) {
                files.addAll(result.stdout.lines().filter { it.isNotBlank() })
            }
        }
        return files.toList().take(10)
    }

    private fun parseHypotheses(content: String): List<DebugHypothesis> {
        val descRegex = Regex(""""description"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        val likelihoodRegex = Regex(""""likelihood"\s*:\s*"(HIGH|MEDIUM|LOW)"""")

        val descriptions = descRegex.findAll(content).map { it.groupValues[1] }.toList()
        val likelihoods = likelihoodRegex.findAll(content).map {
            when (it.groupValues[1]) {
                "HIGH" -> HypothesisLikelihood.HIGH
                "LOW" -> HypothesisLikelihood.LOW
                else -> HypothesisLikelihood.MEDIUM
            }
        }.toList()

        return descriptions.mapIndexed { i, desc ->
            DebugHypothesis(
                description = desc,
                likelihood = likelihoods.getOrElse(i) { HypothesisLikelihood.MEDIUM }
            )
        }
    }

    private suspend fun applyInstrumentation(content: String): List<InstrumentedFile> {
        // Parse instrumentation response and apply to files
        val pathRegex = Regex(""""path"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        val paths = pathRegex.findAll(content).map { it.groupValues[1] }.toList()

        return paths.mapNotNull { path ->
            val file = File(resolvePath(path))
            if (!file.exists()) return@mapNotNull null

            val original = file.readText()
            // For now, store the original and mark it as instrumented
            // The actual instrumentation comes from Claude's response
            InstrumentedFile(
                path = path,
                originalContent = original,
                instrumentedContent = original, // Will be updated by Claude
                logStatements = emptyList()
            )
        }
    }

    private fun parseAnalysis(content: String, session: DebugSession): DebugSession {
        val rootCauseRegex = Regex(""""root_cause"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        val needsMoreRegex = Regex(""""needs_more_data"\s*:\s*(true|false)""")
        val descRegex = Regex(""""description"\s*:\s*"((?:[^"\\]|\\.)*)"""")

        val rootCause = rootCauseRegex.find(content)?.groupValues?.get(1)
        val needsMore = needsMoreRegex.find(content)?.groupValues?.get(1) == "true"

        return if (needsMore) {
            session.copy(
                phase = DebugPhase.INSTRUMENT,
                iterations = session.iterations + 1
            )
        } else {
            val fixDesc = descRegex.findAll(content).firstOrNull()?.groupValues?.get(1)
            session.copy(
                phase = DebugPhase.FIX,
                proposedFix = ProposedFix(
                    description = rootCause ?: fixDesc ?: "Fix identified from log analysis",
                    changes = emptyList(), // Parsed from Claude's structured response
                    linesChanged = 0
                )
            )
        }
    }

    private fun resolvePath(path: String): String {
        return if (path.startsWith("/")) path
        else "$projectPath/${path.removePrefix("./")}"
    }
}
