package com.claudecontext.localdev.service.packages

import com.claudecontext.localdev.data.models.ProjectLanguage
import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.flow.Flow
import com.claudecontext.localdev.data.models.TerminalLine
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PackageManagerService @Inject constructor(
    private val shell: ShellExecutor
) {

    data class PackageManager(
        val name: String,
        val installCommand: String,
        val addCommand: String,
        val removeCommand: String,
        val updateCommand: String,
        val listCommand: String
    )

    fun getPackageManager(language: ProjectLanguage, projectPath: String): PackageManager {
        return when (language) {
            ProjectLanguage.JAVASCRIPT, ProjectLanguage.TYPESCRIPT -> PackageManager(
                name = "npm",
                installCommand = "npm install",
                addCommand = "npm install",
                removeCommand = "npm uninstall",
                updateCommand = "npm update",
                listCommand = "npm list --depth=0"
            )
            ProjectLanguage.PYTHON -> PackageManager(
                name = "pip",
                installCommand = "pip install -r requirements.txt",
                addCommand = "pip install",
                removeCommand = "pip uninstall -y",
                updateCommand = "pip install --upgrade",
                listCommand = "pip list"
            )
            ProjectLanguage.RUST -> PackageManager(
                name = "cargo",
                installCommand = "cargo build",
                addCommand = "cargo add",
                removeCommand = "cargo remove",
                updateCommand = "cargo update",
                listCommand = "cargo tree --depth 1"
            )
            ProjectLanguage.GO -> PackageManager(
                name = "go modules",
                installCommand = "go mod download",
                addCommand = "go get",
                removeCommand = "go mod tidy",
                updateCommand = "go get -u ./...",
                listCommand = "go list -m all"
            )
            ProjectLanguage.RUBY -> PackageManager(
                name = "bundler",
                installCommand = "bundle install",
                addCommand = "bundle add",
                removeCommand = "bundle remove",
                updateCommand = "bundle update",
                listCommand = "bundle list"
            )
            ProjectLanguage.DART -> PackageManager(
                name = "pub",
                installCommand = "dart pub get",
                addCommand = "dart pub add",
                removeCommand = "dart pub remove",
                updateCommand = "dart pub upgrade",
                listCommand = "dart pub deps"
            )
            ProjectLanguage.PHP -> PackageManager(
                name = "composer",
                installCommand = "composer install",
                addCommand = "composer require",
                removeCommand = "composer remove",
                updateCommand = "composer update",
                listCommand = "composer show"
            )
            ProjectLanguage.KOTLIN, ProjectLanguage.JAVA -> PackageManager(
                name = "gradle",
                installCommand = "./gradlew build",
                addCommand = "echo 'Add dependency to build.gradle'",
                removeCommand = "echo 'Remove dependency from build.gradle'",
                updateCommand = "./gradlew dependencies --refresh-dependencies",
                listCommand = "./gradlew dependencies"
            )
            else -> PackageManager(
                name = "none",
                installCommand = "echo 'No package manager configured'",
                addCommand = "echo 'No package manager configured'",
                removeCommand = "echo 'No package manager configured'",
                updateCommand = "echo 'No package manager configured'",
                listCommand = "echo 'No package manager configured'"
            )
        }
    }

    suspend fun installDependencies(
        projectPath: String,
        language: ProjectLanguage
    ): Flow<TerminalLine> {
        val pm = getPackageManager(language, projectPath)
        return shell.executeStreaming(pm.installCommand, projectPath)
    }

    suspend fun addPackage(
        projectPath: String,
        language: ProjectLanguage,
        packageName: String
    ): ShellExecutor.ShellResult {
        val pm = getPackageManager(language, projectPath)
        return shell.execute("${pm.addCommand} $packageName", projectPath)
    }

    suspend fun removePackage(
        projectPath: String,
        language: ProjectLanguage,
        packageName: String
    ): ShellExecutor.ShellResult {
        val pm = getPackageManager(language, projectPath)
        return shell.execute("${pm.removeCommand} $packageName", projectPath)
    }

    suspend fun listPackages(
        projectPath: String,
        language: ProjectLanguage
    ): ShellExecutor.ShellResult {
        val pm = getPackageManager(language, projectPath)
        return shell.execute(pm.listCommand, projectPath)
    }

    suspend fun checkToolchain(language: ProjectLanguage): Map<String, Boolean> {
        val tools = when (language) {
            ProjectLanguage.KOTLIN -> listOf("kotlin", "gradle", "java")
            ProjectLanguage.JAVA -> listOf("java", "javac", "gradle")
            ProjectLanguage.PYTHON -> listOf("python3", "pip", "python")
            ProjectLanguage.JAVASCRIPT -> listOf("node", "npm", "npx")
            ProjectLanguage.TYPESCRIPT -> listOf("node", "npm", "tsc", "npx")
            ProjectLanguage.RUST -> listOf("rustc", "cargo", "rustup")
            ProjectLanguage.GO -> listOf("go")
            ProjectLanguage.C, ProjectLanguage.CPP -> listOf("gcc", "g++", "make", "cmake")
            ProjectLanguage.DART -> listOf("dart")
            ProjectLanguage.RUBY -> listOf("ruby", "gem", "bundle")
            ProjectLanguage.PHP -> listOf("php", "composer")
            ProjectLanguage.SWIFT -> listOf("swift", "swiftc")
            else -> emptyList()
        }

        val results = mutableMapOf<String, Boolean>()
        for (tool in tools) {
            results[tool] = shell.isCommandAvailable(tool)
        }
        return results
    }
}
