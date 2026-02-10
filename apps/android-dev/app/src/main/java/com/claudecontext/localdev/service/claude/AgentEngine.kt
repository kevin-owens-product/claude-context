package com.claudecontext.localdev.service.claude

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.git.GitService
import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Autonomous agent that can read/edit files, run shell commands, search the codebase,
 * build, test, and iterate until the task is complete. Mirrors Cursor's Agent mode.
 */
@Singleton
class AgentEngine @Inject constructor(
    private val claudeApi: ClaudeApiService,
    private val shell: ShellExecutor,
    private val buildRunner: BuildRunner,
    private val gitService: GitService
) {

    private val _session = MutableStateFlow<AgentSession?>(null)
    val session: StateFlow<AgentSession?> = _session.asStateFlow()

    private var projectPath = ""
    private var projectLanguage = ProjectLanguage.OTHER

    companion object {
        private const val SYSTEM_PROMPT = """You are an autonomous coding agent running inside a local Android development environment. You have full access to the project filesystem and shell.

When given a task, work autonomously to complete it. You MUST respond with structured JSON tool calls.

Available tools:
- read_file: {"tool": "read_file", "path": "<file_path>"}
- edit_file: {"tool": "edit_file", "path": "<file_path>", "content": "<new_full_content>"}
- create_file: {"tool": "create_file", "path": "<file_path>", "content": "<content>"}
- delete_file: {"tool": "delete_file", "path": "<file_path>"}
- shell: {"tool": "shell", "command": "<command>"}
- search: {"tool": "search", "query": "<grep_pattern>", "path": "<optional_dir>"}
- list_dir: {"tool": "list_dir", "path": "<directory>"}
- build: {"tool": "build"}
- test: {"tool": "test"}
- lint: {"tool": "lint"}
- done: {"tool": "done", "summary": "<what_you_did>"}

Rules:
1. Read files BEFORE editing them to understand context.
2. After making changes, build/test to verify they work.
3. If tests fail, iterate: read the error, fix the code, test again.
4. Use search to find relevant files before making changes.
5. Respond with ONE tool call per message as a JSON object.
6. When finished, use the "done" tool with a summary.
7. Never leave the project in a broken state."""
    }

    fun configure(path: String, language: ProjectLanguage) {
        projectPath = path
        projectLanguage = language
    }

    suspend fun startTask(task: String): AgentSession {
        val session = AgentSession(task = task, status = AgentSessionStatus.THINKING)
        _session.value = session

        val userMessage = ClaudeMessage(
            role = MessageRole.USER,
            content = "Project path: $projectPath\nLanguage: ${projectLanguage.displayName}\n\nTask: $task"
        )

        _session.value = session.copy(messages = listOf(userMessage))
        return runAgentLoop(session.copy(messages = listOf(userMessage)))
    }

    suspend fun continueAfterApproval(): AgentSession? {
        val current = _session.value ?: return null
        if (current.status != AgentSessionStatus.WAITING_APPROVAL) return current
        return runAgentLoop(current.copy(status = AgentSessionStatus.THINKING))
    }

    fun stop() {
        _session.value = _session.value?.copy(status = AgentSessionStatus.STOPPED)
    }

    private suspend fun runAgentLoop(initialSession: AgentSession): AgentSession {
        var session = initialSession

        while (session.status != AgentSessionStatus.COMPLETED &&
            session.status != AgentSessionStatus.FAILED &&
            session.status != AgentSessionStatus.STOPPED &&
            session.iterations < session.maxIterations
        ) {
            session = session.copy(
                status = AgentSessionStatus.THINKING,
                iterations = session.iterations + 1
            )
            _session.value = session

            try {
                val response = claudeApi.sendMessage(
                    messages = session.messages,
                    systemPrompt = SYSTEM_PROMPT,
                    model = "claude-sonnet-4-20250514"
                )

                session = session.copy(
                    messages = session.messages + response
                )

                val toolCall = parseToolCall(response.content)
                if (toolCall == null) {
                    session = session.copy(
                        messages = session.messages + ClaudeMessage(
                            role = MessageRole.USER,
                            content = "Please respond with a JSON tool call. Available tools: read_file, edit_file, create_file, shell, search, list_dir, build, test, lint, done."
                        )
                    )
                    _session.value = session
                    continue
                }

                if (toolCall.tool == AgentToolType.DELETE_FILE) {
                    session = session.copy(status = AgentSessionStatus.WAITING_APPROVAL)
                    _session.value = session
                    return session
                }

                session = session.copy(status = AgentSessionStatus.EXECUTING)
                _session.value = session

                val action = executeToolCall(toolCall)
                session = session.copy(
                    actions = session.actions + action,
                    filesModified = if (action.tool in listOf(
                            AgentToolType.EDIT_FILE, AgentToolType.CREATE_FILE, AgentToolType.DELETE_FILE
                        )
                    ) {
                        (session.filesModified + (action.input["path"] ?: "")).distinct()
                    } else session.filesModified,
                    commandsRun = if (action.tool == AgentToolType.SHELL_COMMAND) {
                        session.commandsRun + (action.input["command"] ?: "")
                    } else session.commandsRun
                )

                if (action.tool == AgentToolType.BUILD || action.tool == AgentToolType.TEST) {
                    // done tool signals completion
                }

                val resultMessage = ClaudeMessage(
                    role = MessageRole.USER,
                    content = buildToolResultMessage(action)
                )
                session = session.copy(messages = session.messages + resultMessage)

                if (toolCall.isDone) {
                    session = session.copy(status = AgentSessionStatus.COMPLETED)
                }

                _session.value = session

            } catch (e: Exception) {
                session = session.copy(
                    status = AgentSessionStatus.FAILED,
                    messages = session.messages + ClaudeMessage(
                        role = MessageRole.SYSTEM,
                        content = "Agent error: ${e.message}"
                    )
                )
                _session.value = session
            }
        }

        if (session.iterations >= session.maxIterations &&
            session.status != AgentSessionStatus.COMPLETED
        ) {
            session = session.copy(status = AgentSessionStatus.FAILED)
        }

        _session.value = session
        return session
    }

    private data class ParsedToolCall(
        val tool: AgentToolType,
        val params: Map<String, String>,
        val isDone: Boolean = false
    )

    private fun parseToolCall(content: String): ParsedToolCall? {
        val jsonRegex = Regex("""\{[^{}]*"tool"\s*:\s*"(\w+)"[^{}]*\}""")
        val match = jsonRegex.find(content) ?: return null
        val json = match.value
        val toolName = match.groupValues[1]

        fun extractParam(key: String): String? {
            val paramRegex = Regex(""""$key"\s*:\s*"((?:[^"\\]|\\.)*)"""")
            return paramRegex.find(json)?.groupValues?.get(1)
                ?.replace("\\n", "\n")
                ?.replace("\\\"", "\"")
                ?.replace("\\\\", "\\")
        }

        return when (toolName) {
            "read_file" -> ParsedToolCall(
                AgentToolType.READ_FILE,
                mapOfNotNull("path" to extractParam("path"))
            )
            "edit_file" -> ParsedToolCall(
                AgentToolType.EDIT_FILE,
                mapOfNotNull("path" to extractParam("path"), "content" to extractParam("content"))
            )
            "create_file" -> ParsedToolCall(
                AgentToolType.CREATE_FILE,
                mapOfNotNull("path" to extractParam("path"), "content" to extractParam("content"))
            )
            "delete_file" -> ParsedToolCall(
                AgentToolType.DELETE_FILE,
                mapOfNotNull("path" to extractParam("path"))
            )
            "shell" -> ParsedToolCall(
                AgentToolType.SHELL_COMMAND,
                mapOfNotNull("command" to extractParam("command"))
            )
            "search" -> ParsedToolCall(
                AgentToolType.SEARCH_CODEBASE,
                mapOfNotNull("query" to extractParam("query"), "path" to extractParam("path"))
            )
            "list_dir" -> ParsedToolCall(
                AgentToolType.LIST_DIRECTORY,
                mapOfNotNull("path" to extractParam("path"))
            )
            "build" -> ParsedToolCall(AgentToolType.BUILD, emptyMap())
            "test" -> ParsedToolCall(AgentToolType.TEST, emptyMap())
            "lint" -> ParsedToolCall(AgentToolType.LINT, emptyMap())
            "done" -> ParsedToolCall(
                AgentToolType.SHELL_COMMAND,
                mapOfNotNull("summary" to extractParam("summary")),
                isDone = true
            )
            else -> null
        }
    }

    private fun mapOfNotNull(vararg pairs: Pair<String, String?>): Map<String, String> {
        return pairs.filter { it.second != null }.associate { it.first to it.second!! }
    }

    private suspend fun executeToolCall(call: ParsedToolCall): AgentAction {
        val startTime = System.currentTimeMillis()
        val action = AgentAction(
            tool = call.tool,
            description = describeAction(call),
            input = call.params,
            status = AgentActionStatus.RUNNING
        )

        return try {
            val output = when (call.tool) {
                AgentToolType.READ_FILE -> {
                    val path = resolvePath(call.params["path"] ?: "")
                    val file = File(path)
                    if (file.exists() && file.isFile) {
                        val content = file.readText()
                        if (content.length > 10000) content.take(10000) + "\n... (truncated)"
                        else content
                    } else {
                        "Error: File not found: $path"
                    }
                }
                AgentToolType.EDIT_FILE -> {
                    val path = resolvePath(call.params["path"] ?: "")
                    val content = call.params["content"] ?: ""
                    File(path).writeText(content)
                    "File updated: $path (${content.lines().size} lines)"
                }
                AgentToolType.CREATE_FILE -> {
                    val path = resolvePath(call.params["path"] ?: "")
                    val content = call.params["content"] ?: ""
                    val file = File(path)
                    file.parentFile?.mkdirs()
                    file.writeText(content)
                    "File created: $path (${content.lines().size} lines)"
                }
                AgentToolType.DELETE_FILE -> {
                    val path = resolvePath(call.params["path"] ?: "")
                    File(path).delete()
                    "File deleted: $path"
                }
                AgentToolType.SHELL_COMMAND -> {
                    val command = call.params["command"] ?: call.params["summary"] ?: ""
                    if (call.isDone) {
                        "Task completed: $command"
                    } else {
                        val result = shell.execute(command, projectPath)
                        val output = result.output
                        if (output.length > 5000) output.take(5000) + "\n... (truncated)"
                        else output.ifEmpty { "(no output, exit code: ${result.exitCode})" }
                    }
                }
                AgentToolType.SEARCH_CODEBASE -> {
                    val query = call.params["query"] ?: ""
                    val searchPath = call.params["path"]?.let { resolvePath(it) } ?: projectPath
                    val result = shell.execute("grep -rn --include='*.{kt,java,py,js,ts,go,rs,rb,php,c,cpp,h}' '$query' . | head -50", searchPath)
                    result.stdout.ifEmpty { "No matches found for: $query" }
                }
                AgentToolType.LIST_DIRECTORY -> {
                    val path = resolvePath(call.params["path"] ?: ".")
                    val result = shell.execute("ls -la $path", projectPath)
                    result.stdout
                }
                AgentToolType.BUILD -> {
                    val config = buildRunner.detectBuildConfig(projectPath, projectLanguage)
                    val result = buildRunner.build(projectPath, config)
                    val output = result.output
                    if (result.success) "Build succeeded.\n$output"
                    else "Build failed.\n$output"
                }
                AgentToolType.TEST -> {
                    val config = buildRunner.detectBuildConfig(projectPath, projectLanguage)
                    val result = buildRunner.runTests(projectPath, config)
                    if (result.success) "All tests passed.\n${result.output}"
                    else "Tests failed.\n${result.output}"
                }
                AgentToolType.LINT -> {
                    val config = buildRunner.detectBuildConfig(projectPath, projectLanguage)
                    val result = buildRunner.lint(projectPath, config)
                    result?.output ?: "No lint command configured."
                }
                AgentToolType.GIT_OPERATION -> "Git operations handled via shell."
            }

            action.copy(
                output = output,
                status = AgentActionStatus.SUCCESS,
                durationMs = System.currentTimeMillis() - startTime
            )
        } catch (e: Exception) {
            action.copy(
                output = "Error: ${e.message}",
                status = AgentActionStatus.FAILED,
                durationMs = System.currentTimeMillis() - startTime
            )
        }
    }

    private fun resolvePath(path: String): String {
        return if (path.startsWith("/")) path
        else "$projectPath/$path"
    }

    private fun describeAction(call: ParsedToolCall): String {
        return when (call.tool) {
            AgentToolType.READ_FILE -> "Reading ${call.params["path"]}"
            AgentToolType.EDIT_FILE -> "Editing ${call.params["path"]}"
            AgentToolType.CREATE_FILE -> "Creating ${call.params["path"]}"
            AgentToolType.DELETE_FILE -> "Deleting ${call.params["path"]}"
            AgentToolType.SHELL_COMMAND -> "Running: ${call.params["command"]?.take(60)}"
            AgentToolType.SEARCH_CODEBASE -> "Searching for: ${call.params["query"]}"
            AgentToolType.LIST_DIRECTORY -> "Listing ${call.params["path"]}"
            AgentToolType.BUILD -> "Building project"
            AgentToolType.TEST -> "Running tests"
            AgentToolType.LINT -> "Running linter"
            AgentToolType.GIT_OPERATION -> "Git operation"
        }
    }

    private fun buildToolResultMessage(action: AgentAction): String {
        return buildString {
            appendLine("[Tool Result: ${action.tool.name}]")
            if (action.status == AgentActionStatus.SUCCESS) {
                appendLine(action.output ?: "(no output)")
            } else {
                appendLine("FAILED: ${action.output}")
            }
        }
    }
}
