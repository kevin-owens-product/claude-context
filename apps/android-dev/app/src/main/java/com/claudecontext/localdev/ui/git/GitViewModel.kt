package com.claudecontext.localdev.ui.git

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.data.repository.ProjectRepository
import com.claudecontext.localdev.service.git.GitService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class GitUiState(
    val status: GitStatus? = null,
    val commits: List<GitCommit> = emptyList(),
    val branches: List<GitBranch> = emptyList(),
    val operationOutput: String? = null,
    val operationSuccess: Boolean = true,
    val isLoading: Boolean = false
)

@HiltViewModel
class GitViewModel @Inject constructor(
    private val gitService: GitService,
    private val projectRepository: ProjectRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(GitUiState())
    val uiState: StateFlow<GitUiState> = _uiState.asStateFlow()

    private var projectPath = ""

    fun loadProject(projectId: Long) {
        viewModelScope.launch {
            val project = projectRepository.getProject(projectId) ?: return@launch
            projectPath = project.path
            refresh()
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            val status = gitService.status(projectPath)
            val commits = gitService.log(projectPath)
            val branches = gitService.branches(projectPath)

            _uiState.value = _uiState.value.copy(
                status = status,
                commits = commits,
                branches = branches,
                isLoading = false
            )
        }
    }

    fun stageAll() {
        viewModelScope.launch {
            val result = gitService.add(projectPath)
            _uiState.value = _uiState.value.copy(
                operationOutput = if (result.isSuccess) "All files staged" else result.stderr,
                operationSuccess = result.isSuccess
            )
            refresh()
        }
    }

    fun commit(message: String) {
        viewModelScope.launch {
            val result = gitService.commit(projectPath, message)
            _uiState.value = _uiState.value.copy(
                operationOutput = if (result.isSuccess) "Committed: $message" else result.stderr,
                operationSuccess = result.isSuccess
            )
            refresh()
        }
    }

    fun push() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(operationOutput = "Pushing...")
            val result = gitService.push(projectPath)
            _uiState.value = _uiState.value.copy(
                operationOutput = if (result.isSuccess) "Pushed successfully" else result.output,
                operationSuccess = result.isSuccess
            )
            refresh()
        }
    }

    fun pull() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(operationOutput = "Pulling...")
            val result = gitService.pull(projectPath)
            // Flow result - handle as streaming
            _uiState.value = _uiState.value.copy(
                operationOutput = "Pull complete",
                operationSuccess = true
            )
            refresh()
        }
    }

    fun stash() {
        viewModelScope.launch {
            val result = gitService.stash(projectPath)
            _uiState.value = _uiState.value.copy(
                operationOutput = if (result.isSuccess) "Changes stashed" else result.stderr,
                operationSuccess = result.isSuccess
            )
            refresh()
        }
    }

    fun createBranch(name: String) {
        viewModelScope.launch {
            val result = gitService.createBranch(projectPath, name)
            _uiState.value = _uiState.value.copy(
                operationOutput = if (result.isSuccess) "Branch '$name' created" else result.stderr,
                operationSuccess = result.isSuccess
            )
            refresh()
        }
    }

    fun checkout(branch: String) {
        viewModelScope.launch {
            val result = gitService.checkout(projectPath, branch)
            _uiState.value = _uiState.value.copy(
                operationOutput = if (result.isSuccess) "Switched to $branch" else result.stderr,
                operationSuccess = result.isSuccess
            )
            refresh()
        }
    }
}
