package com.claudecontext.localdev.ui.terminal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.claudecontext.localdev.data.models.LineType
import com.claudecontext.localdev.data.models.TerminalLine
import com.claudecontext.localdev.data.repository.ProjectRepository
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.shell.ShellExecutor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TerminalUiState(
    val lines: List<TerminalLine> = listOf(
        TerminalLine("Claude Local Dev Terminal", LineType.SYSTEM),
        TerminalLine("Type commands to execute locally on your device.", LineType.SYSTEM),
        TerminalLine("", LineType.SYSTEM)
    ),
    val currentInput: String = "",
    val workingDirectory: String = "",
    val isRunning: Boolean = false,
    val commandHistory: List<String> = emptyList(),
    val historyIndex: Int = -1
)

@HiltViewModel
class TerminalViewModel @Inject constructor(
    private val shell: ShellExecutor,
    private val projectRepository: ProjectRepository,
    private val buildRunner: BuildRunner
) : ViewModel() {

    private val _uiState = MutableStateFlow(TerminalUiState())
    val uiState: StateFlow<TerminalUiState> = _uiState.asStateFlow()

    private var projectPath = ""

    fun initialize(projectId: Long) {
        viewModelScope.launch {
            val project = projectRepository.getProject(projectId) ?: return@launch
            projectPath = project.path
            _uiState.value = _uiState.value.copy(workingDirectory = project.path)
        }
    }

    fun updateInput(input: String) {
        _uiState.value = _uiState.value.copy(currentInput = input)
    }

    fun executeInput() {
        val command = _uiState.value.currentInput.trim()
        if (command.isBlank()) return

        _uiState.value = _uiState.value.copy(currentInput = "")
        runCommand(command)
    }

    fun runCommand(command: String) {
        if (command == "clear") {
            _uiState.value = _uiState.value.copy(lines = emptyList())
            return
        }

        viewModelScope.launch {
            val history = _uiState.value.commandHistory.toMutableList()
            history.add(command)

            val lines = _uiState.value.lines.toMutableList()
            lines.add(TerminalLine("$ $command", LineType.INPUT))

            _uiState.value = _uiState.value.copy(
                lines = lines,
                isRunning = true,
                commandHistory = history
            )

            try {
                val result = shell.execute(command, projectPath)
                val outputLines = lines.toMutableList()

                if (result.stdout.isNotBlank()) {
                    result.stdout.lines().forEach { line ->
                        outputLines.add(TerminalLine(line, LineType.OUTPUT))
                    }
                }
                if (result.stderr.isNotBlank()) {
                    result.stderr.lines().forEach { line ->
                        outputLines.add(TerminalLine(line, LineType.ERROR))
                    }
                }
                if (!result.isSuccess) {
                    outputLines.add(
                        TerminalLine("Exit code: ${result.exitCode}", LineType.ERROR)
                    )
                }

                // Handle cd command to update working directory
                if (command.startsWith("cd ")) {
                    val newDir = shell.execute("pwd", projectPath)
                    if (newDir.isSuccess) {
                        projectPath = newDir.stdout.trim()
                        _uiState.value = _uiState.value.copy(
                            workingDirectory = projectPath
                        )
                    }
                }

                _uiState.value = _uiState.value.copy(
                    lines = outputLines,
                    isRunning = false
                )
            } catch (e: Exception) {
                val errorLines = lines.toMutableList()
                errorLines.add(TerminalLine("Error: ${e.message}", LineType.ERROR))
                _uiState.value = _uiState.value.copy(
                    lines = errorLines,
                    isRunning = false
                )
            }
        }
    }

    fun runBuild() {
        viewModelScope.launch {
            val project = projectRepository.getProject(0) ?: return@launch
            val config = buildRunner.detectBuildConfig(project.path, project.language)
            runCommand(config.buildCommand)
        }
    }

    fun runTests() {
        viewModelScope.launch {
            val project = projectRepository.getProject(0) ?: return@launch
            val config = buildRunner.detectBuildConfig(project.path, project.language)
            runCommand(config.testCommand)
        }
    }
}
