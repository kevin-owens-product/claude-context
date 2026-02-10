package com.claudecontext.localdev.ui.files

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.claudecontext.localdev.data.models.FileNode
import com.claudecontext.localdev.data.repository.ProjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject

data class FileManagerUiState(
    val currentPath: String = "",
    val rootPath: String = "",
    val files: List<FileNode> = emptyList(),
    val breadcrumbs: List<String> = emptyList(),
    val canGoUp: Boolean = false,
    val showCreateDialog: Boolean = false,
    val selectedFile: FileNode? = null
)

@HiltViewModel
class FileManagerViewModel @Inject constructor(
    private val projectRepository: ProjectRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FileManagerUiState())
    val uiState: StateFlow<FileManagerUiState> = _uiState.asStateFlow()

    fun loadProject(projectId: Long) {
        viewModelScope.launch {
            val project = projectRepository.getProject(projectId) ?: return@launch
            navigateToDirectory(project.path)
            _uiState.value = _uiState.value.copy(rootPath = project.path)
        }
    }

    fun navigateToDirectory(path: String) {
        viewModelScope.launch {
            val dir = File(path)
            if (!dir.exists() || !dir.isDirectory) return@launch

            val files = withContext(Dispatchers.IO) {
                dir.listFiles()
                    ?.filter { !it.name.startsWith(".") || it.name == ".gitignore" }
                    ?.sortedWith(compareBy<File> { !it.isDirectory }.thenBy { it.name })
                    ?.map { FileNode.fromFile(it) }
                    ?: emptyList()
            }

            val rootPath = _uiState.value.rootPath
            val breadcrumbs = if (rootPath.isNotEmpty() && path.startsWith(rootPath)) {
                val relative = path.removePrefix(rootPath)
                listOf(File(rootPath).name) + relative.split("/").filter { it.isNotEmpty() }
            } else {
                path.split("/").filter { it.isNotEmpty() }
            }

            _uiState.value = _uiState.value.copy(
                currentPath = path,
                files = files,
                breadcrumbs = breadcrumbs,
                canGoUp = path != _uiState.value.rootPath
            )
        }
    }

    fun navigateUp() {
        val parent = File(_uiState.value.currentPath).parent ?: return
        if (_uiState.value.rootPath.isNotEmpty() && !parent.startsWith(_uiState.value.rootPath)) {
            return
        }
        navigateToDirectory(parent)
    }

    fun navigateToBreadcrumb(index: Int) {
        val rootPath = _uiState.value.rootPath
        if (index == 0) {
            navigateToDirectory(rootPath)
            return
        }
        val parts = _uiState.value.currentPath.removePrefix(rootPath)
            .split("/")
            .filter { it.isNotEmpty() }
            .take(index)
        navigateToDirectory(rootPath + "/" + parts.joinToString("/"))
    }

    fun refresh() {
        navigateToDirectory(_uiState.value.currentPath)
    }

    fun createFileOrFolder(name: String, isDirectory: Boolean) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                val target = File(_uiState.value.currentPath, name)
                if (isDirectory) {
                    target.mkdirs()
                } else {
                    target.parentFile?.mkdirs()
                    target.createNewFile()
                }
            }
            hideCreateDialog()
            refresh()
        }
    }

    fun deleteFile(node: FileNode) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                if (node.isDirectory) {
                    node.file.deleteRecursively()
                } else {
                    node.file.delete()
                }
            }
            clearSelection()
            refresh()
        }
    }

    fun renameFile(node: FileNode, newName: String) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                val newFile = File(node.file.parent, newName)
                node.file.renameTo(newFile)
            }
            clearSelection()
            refresh()
        }
    }

    fun copyPath(node: FileNode) {
        clearSelection()
    }

    fun showCreateDialog() {
        _uiState.value = _uiState.value.copy(showCreateDialog = true)
    }

    fun hideCreateDialog() {
        _uiState.value = _uiState.value.copy(showCreateDialog = false)
    }

    fun showFileOptions(node: FileNode) {
        _uiState.value = _uiState.value.copy(selectedFile = node)
    }

    fun clearSelection() {
        _uiState.value = _uiState.value.copy(selectedFile = null)
    }
}
