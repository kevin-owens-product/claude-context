package com.claudecontext.localdev.ui.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.data.repository.ProjectRepository
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.claude.AgentEngine
import com.claudecontext.localdev.service.claude.ClaudeApiService
import com.claudecontext.localdev.service.claude.DebugEngine
import com.claudecontext.localdev.service.claude.PlanEngine
import com.claudecontext.localdev.service.shell.ShellExecutor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

data class EditorUiState(
    val project: Project? = null,
    val content: String = "",
    val currentFilePath: String? = null,
    val currentFileName: String? = null,
    val currentLanguage: ProjectLanguage? = null,
    val openFiles: List<String> = emptyList(),
    val isModified: Boolean = false,
    val cursorLine: Int = 1,
    val cursorColumn: Int = 1,
    val showAiAssistant: Boolean = false,
    val aiMode: AiMode = AiMode.AGENT,
    val agentSession: AgentSession? = null,
    val debugSession: DebugSession? = null,
    val planSession: PlanSession? = null,
    val buildOutput: String? = null
)

@HiltViewModel
class EditorViewModel @Inject constructor(
    private val projectRepository: ProjectRepository,
    private val claudeApi: ClaudeApiService,
    private val shell: ShellExecutor,
    private val buildRunner: BuildRunner,
    private val agentEngine: AgentEngine,
    private val debugEngine: DebugEngine,
    private val planEngine: PlanEngine
) : ViewModel() {

    private val _uiState = MutableStateFlow(EditorUiState())
    val uiState: StateFlow<EditorUiState> = _uiState.asStateFlow()

    private var originalContent = ""

    init {
        viewModelScope.launch {
            agentEngine.session.collect { session ->
                _uiState.value = _uiState.value.copy(agentSession = session)
            }
        }
        viewModelScope.launch {
            debugEngine.session.collect { session ->
                _uiState.value = _uiState.value.copy(debugSession = session)
            }
        }
        viewModelScope.launch {
            planEngine.session.collect { session ->
                _uiState.value = _uiState.value.copy(planSession = session)
            }
        }
    }

    fun loadProject(projectId: Long) {
        viewModelScope.launch {
            val project = projectRepository.getProject(projectId) ?: return@launch
            projectRepository.markOpened(projectId)
            _uiState.value = _uiState.value.copy(project = project)

            agentEngine.configure(project.path, project.language)
            debugEngine.configure(project.path, project.language)
            planEngine.configure(project.path, project.language)

            val mainFile = findMainFile(project.path, project.language)
            mainFile?.let { openFile(it) }
        }
    }

    fun openFile(path: String) {
        viewModelScope.launch {
            val file = File(path)
            if (!file.exists() || !file.isFile) return@launch

            val content = file.readText()
            originalContent = content

            val openFiles = _uiState.value.openFiles.toMutableList()
            if (path !in openFiles) openFiles.add(path)

            _uiState.value = _uiState.value.copy(
                content = content,
                currentFilePath = path,
                currentFileName = file.name,
                currentLanguage = ProjectLanguage.fromExtension(file.extension),
                openFiles = openFiles,
                isModified = false
            )
        }
    }

    fun closeFile(path: String) {
        val openFiles = _uiState.value.openFiles.toMutableList()
        openFiles.remove(path)

        if (path == _uiState.value.currentFilePath) {
            val nextFile = openFiles.lastOrNull()
            if (nextFile != null) {
                openFile(nextFile)
            } else {
                _uiState.value = _uiState.value.copy(
                    content = "", currentFilePath = null, currentFileName = null,
                    openFiles = openFiles, isModified = false
                )
            }
        } else {
            _uiState.value = _uiState.value.copy(openFiles = openFiles)
        }
    }

    fun updateContent(newContent: String) {
        _uiState.value = _uiState.value.copy(
            content = newContent, isModified = newContent != originalContent
        )
    }

    fun saveFile() {
        viewModelScope.launch {
            val path = _uiState.value.currentFilePath ?: return@launch
            File(path).writeText(_uiState.value.content)
            originalContent = _uiState.value.content
            _uiState.value = _uiState.value.copy(isModified = false)
        }
    }

    fun toggleAiAssistant() {
        _uiState.value = _uiState.value.copy(showAiAssistant = !_uiState.value.showAiAssistant)
    }

    fun setAiMode(mode: AiMode) {
        _uiState.value = _uiState.value.copy(aiMode = mode)
    }

    // --- Agent Mode ---
    fun startAgentTask(task: String) {
        viewModelScope.launch {
            agentEngine.startTask(task)
            reloadCurrentFile()
        }
    }

    fun stopAgent() = agentEngine.stop()

    fun approveAgentAction() {
        viewModelScope.launch {
            agentEngine.continueAfterApproval()
            reloadCurrentFile()
        }
    }

    // --- Debug Mode ---
    fun startDebug(bugDescription: String) {
        viewModelScope.launch { debugEngine.startDebug(bugDescription) }
    }

    fun instrumentCode() {
        viewModelScope.launch {
            val s = _uiState.value.debugSession ?: return@launch
            debugEngine.instrumentCode(s)
            reloadCurrentFile()
        }
    }

    fun submitDebugLogs(logs: String) {
        viewModelScope.launch {
            val s = _uiState.value.debugSession ?: return@launch
            debugEngine.submitRuntimeLogs(s, logs)
        }
    }

    fun applyDebugFix() {
        viewModelScope.launch {
            val s = _uiState.value.debugSession ?: return@launch
            debugEngine.applyFix(s)
            reloadCurrentFile()
        }
    }

    fun verifyDebugFix(fixed: Boolean) {
        viewModelScope.launch {
            val s = _uiState.value.debugSession ?: return@launch
            debugEngine.verifyAndClean(s, fixed)
            reloadCurrentFile()
        }
    }

    // --- Plan Mode ---
    fun startPlan(goal: String) {
        viewModelScope.launch { planEngine.startPlan(goal) }
    }

    fun answerPlanQuestions(answers: Map<String, String>) {
        viewModelScope.launch {
            val s = _uiState.value.planSession ?: return@launch
            planEngine.answerQuestions(s, answers)
        }
    }

    fun executePlan() {
        viewModelScope.launch {
            val s = _uiState.value.planSession ?: return@launch
            planEngine.executePlan(s)
            reloadCurrentFile()
        }
    }

    fun executePlanStep(stepId: String) {
        viewModelScope.launch {
            val s = _uiState.value.planSession ?: return@launch
            planEngine.executeSingleStep(s, stepId)
            reloadCurrentFile()
        }
    }

    fun savePlan() {
        viewModelScope.launch {
            val s = _uiState.value.planSession ?: return@launch
            planEngine.savePlanToFile(s)
        }
    }

    // --- Common ---
    fun runCurrentFile() {
        viewModelScope.launch {
            val project = _uiState.value.project ?: return@launch
            val config = buildRunner.detectBuildConfig(project.path, project.language)
            val result = buildRunner.build(project.path, config)
            _uiState.value = _uiState.value.copy(buildOutput = result.output)
        }
    }

    private fun reloadCurrentFile() {
        val path = _uiState.value.currentFilePath ?: return
        val file = File(path)
        if (file.exists()) {
            val content = file.readText()
            originalContent = content
            _uiState.value = _uiState.value.copy(content = content, isModified = false)
        }
    }

    private fun findMainFile(projectPath: String, language: ProjectLanguage): String? {
        val dir = File(projectPath)
        if (!dir.exists()) return null

        val mainFileNames = when (language) {
            ProjectLanguage.PYTHON -> listOf("main.py", "app.py", "__main__.py")
            ProjectLanguage.JAVASCRIPT -> listOf("index.js", "app.js", "main.js")
            ProjectLanguage.TYPESCRIPT -> listOf("index.ts", "app.ts", "main.ts", "src/index.ts")
            ProjectLanguage.KOTLIN -> listOf("Main.kt", "src/main/kotlin/Main.kt")
            ProjectLanguage.JAVA -> listOf("Main.java", "src/main/java/Main.java")
            ProjectLanguage.RUST -> listOf("src/main.rs", "main.rs")
            ProjectLanguage.GO -> listOf("main.go", "cmd/main.go")
            ProjectLanguage.DART -> listOf("lib/main.dart", "main.dart")
            ProjectLanguage.RUBY -> listOf("main.rb", "app.rb")
            ProjectLanguage.PHP -> listOf("index.php", "app.php")
            else -> listOf("README.md")
        }

        for (name in mainFileNames) {
            val file = File(projectPath, name)
            if (file.exists()) return file.absolutePath
        }

        return dir.listFiles()
            ?.filter { it.isFile && it.extension in (language.extensions) }
            ?.firstOrNull()?.absolutePath
    }
}
