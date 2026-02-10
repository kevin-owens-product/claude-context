package com.claudecontext.localdev.ui.projects

import android.os.Environment
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.claudecontext.localdev.data.models.Project
import com.claudecontext.localdev.data.models.ProjectLanguage
import com.claudecontext.localdev.data.repository.ProjectRepository
import com.claudecontext.localdev.service.git.GitService
import com.claudecontext.localdev.service.shell.ShellExecutor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

enum class ProjectType { NEW, CLONE, OPEN }

data class NewProjectUiState(
    val name: String = "",
    val cloneUrl: String = "",
    val language: ProjectLanguage = ProjectLanguage.KOTLIN,
    val directory: String = "",
    val initGit: Boolean = true,
    val projectType: ProjectType = ProjectType.NEW,
    val isCreating: Boolean = false,
    val error: String? = null,
    val createdProjectId: Long? = null
)

@HiltViewModel
class NewProjectViewModel @Inject constructor(
    private val projectRepository: ProjectRepository,
    private val gitService: GitService,
    private val shell: ShellExecutor
) : ViewModel() {

    private val _uiState = MutableStateFlow(NewProjectUiState())
    val uiState: StateFlow<NewProjectUiState> = _uiState.asStateFlow()

    private val defaultBaseDir: String
        get() = "${Environment.getExternalStorageDirectory().absolutePath}/ClaudeLocalDev"

    fun setName(name: String) { _uiState.value = _uiState.value.copy(name = name, error = null) }
    fun setCloneUrl(url: String) { _uiState.value = _uiState.value.copy(cloneUrl = url, error = null) }
    fun setLanguage(lang: ProjectLanguage) { _uiState.value = _uiState.value.copy(language = lang) }
    fun setDirectory(dir: String) { _uiState.value = _uiState.value.copy(directory = dir, error = null) }
    fun setInitGit(init: Boolean) { _uiState.value = _uiState.value.copy(initGit = init) }
    fun setProjectType(type: ProjectType) { _uiState.value = _uiState.value.copy(projectType = type, error = null) }

    fun createProject() {
        viewModelScope.launch {
            val state = _uiState.value
            if (state.name.isBlank()) {
                _uiState.value = state.copy(error = "Project name is required")
                return@launch
            }

            _uiState.value = state.copy(isCreating = true, error = null)

            try {
                val projectDir = if (state.directory.isNotBlank()) {
                    state.directory
                } else {
                    "$defaultBaseDir/${state.name}"
                }

                val dir = File(projectDir)

                when (state.projectType) {
                    ProjectType.NEW -> {
                        dir.mkdirs()
                        createProjectScaffold(projectDir, state.language)
                        if (state.initGit) {
                            gitService.init(projectDir)
                        }
                    }
                    ProjectType.CLONE -> {
                        if (state.cloneUrl.isBlank()) {
                            _uiState.value = state.copy(
                                isCreating = false,
                                error = "Repository URL is required"
                            )
                            return@launch
                        }
                        dir.mkdirs()
                        val result = shell.execute(
                            "git clone ${state.cloneUrl} .",
                            projectDir
                        )
                        if (!result.isSuccess) {
                            _uiState.value = state.copy(
                                isCreating = false,
                                error = "Clone failed: ${result.stderr}"
                            )
                            return@launch
                        }
                    }
                    ProjectType.OPEN -> {
                        if (!dir.exists()) {
                            _uiState.value = state.copy(
                                isCreating = false,
                                error = "Directory does not exist"
                            )
                            return@launch
                        }
                    }
                }

                val remoteUrl = if (state.projectType == ProjectType.CLONE) {
                    state.cloneUrl
                } else {
                    gitService.getRemoteUrl(projectDir)
                }

                val projectId = projectRepository.createProject(
                    Project(
                        name = state.name,
                        path = projectDir,
                        language = state.language,
                        gitRemoteUrl = remoteUrl
                    )
                )

                _uiState.value = state.copy(
                    isCreating = false,
                    createdProjectId = projectId
                )
            } catch (e: Exception) {
                _uiState.value = state.copy(
                    isCreating = false,
                    error = "Error: ${e.message}"
                )
            }
        }
    }

    private suspend fun createProjectScaffold(path: String, language: ProjectLanguage) {
        when (language) {
            ProjectLanguage.PYTHON -> {
                shell.execute("touch main.py requirements.txt", path)
                shell.execute("mkdir -p tests", path)
                shell.execute("touch tests/__init__.py tests/test_main.py", path)
                shell.execute("echo '#!/usr/bin/env python3\n\ndef main():\n    print(\"Hello, World!\")\n\nif __name__ == \"__main__\":\n    main()' > main.py", path)
            }
            ProjectLanguage.JAVASCRIPT -> {
                shell.execute("echo '{\"name\": \"${File(path).name}\", \"version\": \"1.0.0\", \"main\": \"index.js\", \"scripts\": {\"start\": \"node index.js\", \"test\": \"jest\"}}' > package.json", path)
                shell.execute("echo 'console.log(\"Hello, World!\");' > index.js", path)
                shell.execute("mkdir -p tests", path)
            }
            ProjectLanguage.TYPESCRIPT -> {
                shell.execute("echo '{\"name\": \"${File(path).name}\", \"version\": \"1.0.0\", \"main\": \"dist/index.js\", \"scripts\": {\"build\": \"tsc\", \"start\": \"node dist/index.js\", \"test\": \"jest\"}}' > package.json", path)
                shell.execute("echo '{\"compilerOptions\": {\"target\": \"ES2020\", \"module\": \"commonjs\", \"outDir\": \"./dist\", \"strict\": true}}' > tsconfig.json", path)
                shell.execute("mkdir -p src tests", path)
                shell.execute("echo 'console.log(\"Hello, World!\");' > src/index.ts", path)
            }
            ProjectLanguage.RUST -> {
                shell.execute("echo '[package]\nname = \"${File(path).name}\"\nversion = \"0.1.0\"\nedition = \"2021\"\n\n[dependencies]' > Cargo.toml", path)
                shell.execute("mkdir -p src", path)
                shell.execute("echo 'fn main() {\n    println!(\"Hello, World!\");\n}' > src/main.rs", path)
            }
            ProjectLanguage.GO -> {
                shell.execute("echo 'module ${File(path).name}\n\ngo 1.21' > go.mod", path)
                shell.execute("echo 'package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"Hello, World!\")\n}' > main.go", path)
            }
            ProjectLanguage.KOTLIN -> {
                shell.execute("mkdir -p src/main/kotlin src/test/kotlin", path)
                shell.execute("echo 'fun main() {\n    println(\"Hello, World!\")\n}' > src/main/kotlin/Main.kt", path)
            }
            ProjectLanguage.JAVA -> {
                shell.execute("mkdir -p src/main/java src/test/java", path)
                shell.execute("echo 'public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}' > src/main/java/Main.java", path)
            }
            else -> {
                shell.execute("echo '# ${File(path).name}' > README.md", path)
            }
        }
    }
}
