package com.claudecontext.localdev.service.context

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.ai.ModelRouter
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
 * Manages the context window for AI interactions: tracks open files, project
 * structure, token budgets, and assembles optimized context for each request.
 */

// --- Data Models ---

data class ContextEntry(
    val id: String = UUID.randomUUID().toString(),
    val type: ContextType,
    val source: String,
    val content: String,
    val tokenEstimate: Int,
    val priority: ContextPriority = ContextPriority.NORMAL,
    val pinned: Boolean = false,
    val addedAt: Long = System.currentTimeMillis(),
    val lastAccessed: Long = System.currentTimeMillis(),
    val accessCount: Int = 0,
    val metadata: Map<String, String> = emptyMap()
)

enum class ContextType(val displayName: String) {
    FILE("File"),
    FILE_SNIPPET("Snippet"),
    DIRECTORY_TREE("Directory Tree"),
    GIT_DIFF("Git Diff"),
    GIT_LOG("Git Log"),
    TERMINAL_OUTPUT("Terminal Output"),
    ERROR_LOG("Error Log"),
    DOCUMENTATION("Documentation"),
    CONVERSATION_SUMMARY("Conversation Summary"),
    USER_NOTE("User Note"),
    PROJECT_CONFIG("Project Config"),
    DEPENDENCY_INFO("Dependencies"),
    SEARCH_RESULT("Search Result"),
    CUSTOM("Custom")
}

enum class ContextPriority(val weight: Int) {
    CRITICAL(4),
    HIGH(3),
    NORMAL(2),
    LOW(1),
    BACKGROUND(0)
}

data class ContextBudget(
    val maxTokens: Int = 100000,
    val reservedForResponse: Int = 4096,
    val reservedForSystem: Int = 2000,
    val usedTokens: Int = 0
) {
    val availableTokens: Int get() = maxTokens - reservedForResponse - reservedForSystem - usedTokens
    val usagePercent: Float get() = usedTokens.toFloat() / (maxTokens - reservedForResponse - reservedForSystem)
}

data class ContextManagerState(
    val entries: List<ContextEntry> = emptyList(),
    val budget: ContextBudget = ContextBudget(),
    val autoTrackFiles: Boolean = true,
    val autoIncludeGitDiff: Boolean = true,
    val autoIncludeErrors: Boolean = true,
    val maxFileSize: Int = 50000,
    val contextStrategy: ContextStrategy = ContextStrategy.SMART_PRIORITY,
    val activeFileContext: String? = null,
    val projectLanguage: ProjectLanguage? = null
)

enum class ContextStrategy(val displayName: String) {
    SMART_PRIORITY("Smart Priority"),
    RECENCY_FIRST("Recency First"),
    RELEVANCE_FIRST("Relevance First"),
    MANUAL("Manual Only"),
    FULL_PROJECT("Full Project")
}

data class AssembledContext(
    val systemPrompt: String,
    val entries: List<ContextEntry>,
    val totalTokens: Int,
    val truncatedEntries: List<String> = emptyList(),
    val droppedEntries: List<String> = emptyList()
)

@Singleton
class ContextManager @Inject constructor() {

    private val _state = MutableStateFlow(ContextManagerState())
    val state: StateFlow<ContextManagerState> = _state.asStateFlow()

    private var projectPath: String? = null

    fun configure(projectPath: String, language: ProjectLanguage? = null) {
        this.projectPath = projectPath
        _state.value = _state.value.copy(projectLanguage = language)
    }

    // --- Context Entry Management ---

    fun addEntry(entry: ContextEntry): ContextEntry {
        val existing = _state.value.entries.find {
            it.type == entry.type && it.source == entry.source
        }
        if (existing != null) {
            return updateEntry(existing.id) {
                it.copy(
                    content = entry.content,
                    tokenEstimate = entry.tokenEstimate,
                    lastAccessed = System.currentTimeMillis(),
                    accessCount = it.accessCount + 1
                )
            } ?: entry
        }

        val entries = _state.value.entries + entry
        recalculateBudget(entries)
        return entry
    }

    fun addFileContext(filePath: String, content: String? = null) {
        val fileContent = content ?: readFile(filePath) ?: return
        val tokens = estimateTokens(fileContent)

        if (tokens > _state.value.maxFileSize) {
            // Add as snippet instead
            val truncated = fileContent.take(_state.value.maxFileSize * 4) // rough char to token
            addEntry(ContextEntry(
                type = ContextType.FILE_SNIPPET,
                source = filePath,
                content = truncated + "\n... (truncated, ${tokens} tokens total)",
                tokenEstimate = _state.value.maxFileSize,
                priority = ContextPriority.NORMAL,
                metadata = mapOf("fullSize" to tokens.toString(), "language" to detectLanguage(filePath))
            ))
        } else {
            addEntry(ContextEntry(
                type = ContextType.FILE,
                source = filePath,
                content = fileContent,
                tokenEstimate = tokens,
                priority = ContextPriority.NORMAL,
                metadata = mapOf("language" to detectLanguage(filePath))
            ))
        }
    }

    fun addDirectoryTree(dirPath: String? = null, maxDepth: Int = 3) {
        val targetPath = dirPath ?: projectPath ?: return
        val tree = buildDirectoryTree(File(targetPath), maxDepth)
        addEntry(ContextEntry(
            type = ContextType.DIRECTORY_TREE,
            source = targetPath,
            content = tree,
            tokenEstimate = estimateTokens(tree),
            priority = ContextPriority.LOW
        ))
    }

    fun addGitDiff(diff: String) {
        addEntry(ContextEntry(
            type = ContextType.GIT_DIFF,
            source = "git diff",
            content = diff,
            tokenEstimate = estimateTokens(diff),
            priority = ContextPriority.HIGH
        ))
    }

    fun addErrorLog(error: String, source: String = "build") {
        addEntry(ContextEntry(
            type = ContextType.ERROR_LOG,
            source = source,
            content = error,
            tokenEstimate = estimateTokens(error),
            priority = ContextPriority.CRITICAL
        ))
    }

    fun addTerminalOutput(output: String, command: String) {
        addEntry(ContextEntry(
            type = ContextType.TERMINAL_OUTPUT,
            source = command,
            content = output,
            tokenEstimate = estimateTokens(output),
            priority = ContextPriority.NORMAL,
            metadata = mapOf("command" to command)
        ))
    }

    fun addUserNote(note: String, title: String = "Note") {
        addEntry(ContextEntry(
            type = ContextType.USER_NOTE,
            source = title,
            content = note,
            tokenEstimate = estimateTokens(note),
            priority = ContextPriority.HIGH,
            pinned = true
        ))
    }

    fun addConversationSummary(summary: String, sessionId: String) {
        addEntry(ContextEntry(
            type = ContextType.CONVERSATION_SUMMARY,
            source = sessionId,
            content = summary,
            tokenEstimate = estimateTokens(summary),
            priority = ContextPriority.NORMAL
        ))
    }

    fun removeEntry(entryId: String) {
        val entries = _state.value.entries.filter { it.id != entryId }
        recalculateBudget(entries)
    }

    fun pinEntry(entryId: String, pinned: Boolean) {
        updateEntry(entryId) { it.copy(pinned = pinned) }
    }

    fun setPriority(entryId: String, priority: ContextPriority) {
        updateEntry(entryId) { it.copy(priority = priority) }
    }

    fun clearAll() {
        _state.value = _state.value.copy(
            entries = _state.value.entries.filter { it.pinned },
            budget = _state.value.budget.copy(usedTokens = _state.value.entries.filter { it.pinned }.sumOf { it.tokenEstimate })
        )
    }

    fun clearByType(type: ContextType) {
        val entries = _state.value.entries.filter { it.type != type || it.pinned }
        recalculateBudget(entries)
    }

    // --- Context Assembly ---

    fun assembleContext(
        userPrompt: String? = null,
        taskCategory: ModelRouter.TaskCategory? = null,
        budgetOverride: Int? = null
    ): AssembledContext {
        val maxTokens = budgetOverride ?: _state.value.budget.availableTokens
        val entries = _state.value.entries
        val strategy = _state.value.contextStrategy

        val sorted = when (strategy) {
            ContextStrategy.SMART_PRIORITY -> smartPrioritySort(entries, taskCategory)
            ContextStrategy.RECENCY_FIRST -> entries.sortedByDescending { it.lastAccessed }
            ContextStrategy.RELEVANCE_FIRST -> relevanceSort(entries, userPrompt)
            ContextStrategy.MANUAL -> entries.sortedByDescending { it.pinned }
            ContextStrategy.FULL_PROJECT -> entries.sortedByDescending { it.priority.weight }
        }

        val included = mutableListOf<ContextEntry>()
        val truncated = mutableListOf<String>()
        val dropped = mutableListOf<String>()
        var usedTokens = 0

        for (entry in sorted) {
            when {
                entry.pinned -> {
                    included.add(entry)
                    usedTokens += entry.tokenEstimate
                }
                usedTokens + entry.tokenEstimate <= maxTokens -> {
                    included.add(entry)
                    usedTokens += entry.tokenEstimate
                }
                usedTokens + 500 <= maxTokens && entry.tokenEstimate > 500 -> {
                    // Truncate to fit
                    val availableTokens = maxTokens - usedTokens
                    val truncatedContent = entry.content.take(availableTokens * 4)
                    included.add(entry.copy(
                        content = truncatedContent + "\n... (truncated)",
                        tokenEstimate = availableTokens
                    ))
                    usedTokens += availableTokens
                    truncated.add(entry.source)
                }
                else -> {
                    dropped.add(entry.source)
                }
            }
        }

        val systemPrompt = buildSystemPrompt(included)

        return AssembledContext(
            systemPrompt = systemPrompt,
            entries = included,
            totalTokens = usedTokens,
            truncatedEntries = truncated,
            droppedEntries = dropped
        )
    }

    // --- Configuration ---

    fun setStrategy(strategy: ContextStrategy) {
        _state.value = _state.value.copy(contextStrategy = strategy)
    }

    fun setMaxTokenBudget(maxTokens: Int) {
        _state.value = _state.value.copy(
            budget = _state.value.budget.copy(maxTokens = maxTokens)
        )
    }

    fun setAutoTrackFiles(enabled: Boolean) {
        _state.value = _state.value.copy(autoTrackFiles = enabled)
    }

    fun setAutoIncludeGitDiff(enabled: Boolean) {
        _state.value = _state.value.copy(autoIncludeGitDiff = enabled)
    }

    fun setAutoIncludeErrors(enabled: Boolean) {
        _state.value = _state.value.copy(autoIncludeErrors = enabled)
    }

    fun setMaxFileSize(maxTokens: Int) {
        _state.value = _state.value.copy(maxFileSize = maxTokens)
    }

    // --- Auto-tracking ---

    fun onFileOpened(filePath: String) {
        if (!_state.value.autoTrackFiles) return
        _state.value = _state.value.copy(activeFileContext = filePath)
        addFileContext(filePath)
    }

    fun onFileSaved(filePath: String) {
        if (!_state.value.autoTrackFiles) return
        addFileContext(filePath)
    }

    fun onBuildError(error: String) {
        if (!_state.value.autoIncludeErrors) return
        addErrorLog(error, "build")
    }

    fun onTestFailure(error: String) {
        if (!_state.value.autoIncludeErrors) return
        addErrorLog(error, "test")
    }

    // --- Internal Helpers ---

    private fun smartPrioritySort(
        entries: List<ContextEntry>,
        taskCategory: ModelRouter.TaskCategory?
    ): List<ContextEntry> {
        return entries.sortedWith(compareByDescending<ContextEntry> { it.pinned }
            .thenByDescending { entry ->
                var score = entry.priority.weight * 10.0

                // Boost by relevance to task category
                when (taskCategory) {
                    ModelRouter.TaskCategory.DEBUGGING -> {
                        if (entry.type == ContextType.ERROR_LOG) score += 20
                        if (entry.type == ContextType.TERMINAL_OUTPUT) score += 10
                    }
                    ModelRouter.TaskCategory.CODE_GENERATION, ModelRouter.TaskCategory.CODE_EDITING -> {
                        if (entry.type == ContextType.FILE) score += 15
                        if (entry.type == ContextType.DIRECTORY_TREE) score += 5
                    }
                    ModelRouter.TaskCategory.CODE_REVIEW -> {
                        if (entry.type == ContextType.GIT_DIFF) score += 20
                        if (entry.type == ContextType.FILE) score += 10
                    }
                    ModelRouter.TaskCategory.PLANNING -> {
                        if (entry.type == ContextType.DIRECTORY_TREE) score += 15
                        if (entry.type == ContextType.PROJECT_CONFIG) score += 10
                    }
                    else -> {}
                }

                // Recency boost (decay over 1 hour)
                val ageMs = System.currentTimeMillis() - entry.lastAccessed
                val hourDecay = (ageMs.toDouble() / 3_600_000).coerceAtMost(10.0)
                score -= hourDecay

                // Access frequency boost
                score += (entry.accessCount * 0.5).coerceAtMost(5.0)

                score
            }
        )
    }

    private fun relevanceSort(entries: List<ContextEntry>, prompt: String?): List<ContextEntry> {
        if (prompt == null) return entries.sortedByDescending { it.priority.weight }

        val keywords = prompt.lowercase().split(Regex("\\s+")).filter { it.length > 3 }.toSet()

        return entries.sortedWith(compareByDescending<ContextEntry> { it.pinned }
            .thenByDescending { entry ->
                val contentLower = entry.content.lowercase()
                val matchCount = keywords.count { contentLower.contains(it) }
                matchCount * 10 + entry.priority.weight
            }
        )
    }

    private fun buildSystemPrompt(entries: List<ContextEntry>): String {
        return buildString {
            appendLine("You are a coding assistant in a local development environment.")
            appendLine()

            val files = entries.filter { it.type == ContextType.FILE || it.type == ContextType.FILE_SNIPPET }
            val trees = entries.filter { it.type == ContextType.DIRECTORY_TREE }
            val errors = entries.filter { it.type == ContextType.ERROR_LOG }
            val diffs = entries.filter { it.type == ContextType.GIT_DIFF }
            val notes = entries.filter { it.type == ContextType.USER_NOTE }
            val terminal = entries.filter { it.type == ContextType.TERMINAL_OUTPUT }
            val summaries = entries.filter { it.type == ContextType.CONVERSATION_SUMMARY }

            if (trees.isNotEmpty()) {
                appendLine("## Project Structure")
                trees.forEach { appendLine(it.content) }
                appendLine()
            }

            if (files.isNotEmpty()) {
                appendLine("## Open Files")
                files.forEach { entry ->
                    val lang = entry.metadata["language"] ?: ""
                    appendLine("### ${entry.source}")
                    appendLine("```$lang")
                    appendLine(entry.content)
                    appendLine("```")
                    appendLine()
                }
            }

            if (diffs.isNotEmpty()) {
                appendLine("## Recent Changes (Git Diff)")
                diffs.forEach { appendLine("```diff\n${it.content}\n```") }
                appendLine()
            }

            if (errors.isNotEmpty()) {
                appendLine("## Active Errors")
                errors.forEach { appendLine("### ${it.source}\n```\n${it.content}\n```") }
                appendLine()
            }

            if (terminal.isNotEmpty()) {
                appendLine("## Recent Terminal Output")
                terminal.forEach {
                    appendLine("$ ${it.metadata["command"] ?: it.source}")
                    appendLine("```\n${it.content}\n```")
                }
                appendLine()
            }

            if (notes.isNotEmpty()) {
                appendLine("## User Notes")
                notes.forEach { appendLine("- **${it.source}**: ${it.content}") }
                appendLine()
            }

            if (summaries.isNotEmpty()) {
                appendLine("## Previous Conversation Context")
                summaries.forEach { appendLine(it.content) }
                appendLine()
            }
        }
    }

    private fun updateEntry(entryId: String, transform: (ContextEntry) -> ContextEntry): ContextEntry? {
        val entries = _state.value.entries.toMutableList()
        val index = entries.indexOfFirst { it.id == entryId }
        if (index < 0) return null

        val updated = transform(entries[index])
        entries[index] = updated
        recalculateBudget(entries)
        return updated
    }

    private fun recalculateBudget(entries: List<ContextEntry>) {
        val usedTokens = entries.sumOf { it.tokenEstimate }
        _state.value = _state.value.copy(
            entries = entries,
            budget = _state.value.budget.copy(usedTokens = usedTokens)
        )
    }

    private fun estimateTokens(text: String): Int {
        // Rough estimate: ~4 characters per token
        return text.length / 4
    }

    private fun readFile(path: String): String? {
        return try {
            File(path).readText()
        } catch (e: Exception) {
            null
        }
    }

    private fun detectLanguage(path: String): String {
        val ext = path.substringAfterLast(".", "")
        return when (ext) {
            "kt", "kts" -> "kotlin"
            "java" -> "java"
            "py" -> "python"
            "js", "jsx", "mjs" -> "javascript"
            "ts", "tsx" -> "typescript"
            "swift" -> "swift"
            "rs" -> "rust"
            "go" -> "go"
            "rb" -> "ruby"
            "cpp", "cc", "cxx" -> "cpp"
            "c", "h" -> "c"
            "json" -> "json"
            "yaml", "yml" -> "yaml"
            "md" -> "markdown"
            "xml" -> "xml"
            "sh", "bash" -> "bash"
            "sql" -> "sql"
            else -> ext
        }
    }

    private fun buildDirectoryTree(dir: File, maxDepth: Int, indent: String = "", depth: Int = 0): String {
        if (depth >= maxDepth || !dir.exists()) return ""

        val ignoreDirs = setOf(".git", "node_modules", "build", ".gradle", "__pycache__",
            ".idea", ".vscode", "target", "dist", ".next", "venv", ".env")

        return buildString {
            if (depth == 0) appendLine(dir.name + "/")

            val children = dir.listFiles()
                ?.filter { it.name !in ignoreDirs && !it.name.startsWith(".") }
                ?.sortedWith(compareByDescending<File> { it.isDirectory }.thenBy { it.name })
                ?: return@buildString

            children.forEachIndexed { index, child ->
                val isLast = index == children.lastIndex
                val prefix = if (isLast) "└── " else "├── "
                val childIndent = if (isLast) "    " else "│   "

                if (child.isDirectory) {
                    appendLine("$indent$prefix${child.name}/")
                    append(buildDirectoryTree(child, maxDepth, indent + childIndent, depth + 1))
                } else {
                    appendLine("$indent$prefix${child.name}")
                }
            }
        }
    }
}
