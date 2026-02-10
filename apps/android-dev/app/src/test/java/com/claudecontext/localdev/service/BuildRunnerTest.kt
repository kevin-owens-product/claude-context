package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.ErrorSeverity
import com.claudecontext.localdev.data.models.ProjectLanguage
import com.claudecontext.localdev.service.build.BuildRunner
import com.claudecontext.localdev.service.shell.ShellExecutor
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class BuildRunnerTest {

    private lateinit var shell: ShellExecutor
    private lateinit var buildRunner: BuildRunner

    @Before
    fun setup() {
        shell = mockk()
        buildRunner = BuildRunner(shell)
    }

    @Test
    fun `detectBuildConfig returns correct config for Python`() {
        val config = buildRunner.detectBuildConfig("/test", ProjectLanguage.PYTHON)
        assertEquals(ProjectLanguage.PYTHON, config.language)
        assertEquals("pip install -e .", config.buildCommand)
        assertEquals("python -m pytest", config.testCommand)
        assertNotNull(config.lintCommand)
        assertNotNull(config.formatCommand)
    }

    @Test
    fun `detectBuildConfig returns correct config for TypeScript`() {
        val config = buildRunner.detectBuildConfig("/test", ProjectLanguage.TYPESCRIPT)
        assertEquals(ProjectLanguage.TYPESCRIPT, config.language)
        assertEquals("npm run build", config.buildCommand)
        assertNotNull(config.lintCommand)
    }

    @Test
    fun `detectBuildConfig returns correct config for Rust`() {
        val config = buildRunner.detectBuildConfig("/test", ProjectLanguage.RUST)
        assertEquals("cargo build", config.buildCommand)
        assertEquals("cargo test", config.testCommand)
        assertEquals("cargo run", config.runCommand)
        assertEquals("cargo clippy", config.lintCommand)
        assertEquals("cargo fmt", config.formatCommand)
        assertEquals("cargo clean", config.cleanCommand)
    }

    @Test
    fun `detectBuildConfig returns correct config for Go`() {
        val config = buildRunner.detectBuildConfig("/test", ProjectLanguage.GO)
        assertEquals("go build ./...", config.buildCommand)
        assertEquals("go test ./...", config.testCommand)
        assertEquals("go run .", config.runCommand)
    }

    @Test
    fun `detectBuildConfig returns correct config for Kotlin`() {
        val config = buildRunner.detectBuildConfig("/test", ProjectLanguage.KOTLIN)
        assertTrue(config.buildCommand.contains("gradlew"))
    }

    @Test
    fun `build returns success result`() = runTest {
        coEvery { shell.execute(any(), "/test", any(), any()) } returns
            ShellExecutor.ShellResult(0, "Build successful", "")

        val config = buildRunner.detectBuildConfig("/test", ProjectLanguage.PYTHON)
        val result = buildRunner.build("/test", config)

        assertTrue(result.success)
        assertEquals("Build successful", result.output)
        assertTrue(result.durationMs >= 0)
        assertEquals(config.buildCommand, result.command)
    }

    @Test
    fun `build returns failure result with errors`() = runTest {
        coEvery { shell.execute(any(), "/test", any(), any()) } returns
            ShellExecutor.ShellResult(1, "", "src/main.kt:10:5: error: unresolved reference")

        val config = buildRunner.detectBuildConfig("/test", ProjectLanguage.KOTLIN)
        val result = buildRunner.build("/test", config)

        assertFalse(result.success)
        assertTrue(result.errors.isNotEmpty())
        assertEquals("src/main.kt", result.errors[0].file)
        assertEquals(10, result.errors[0].line)
        assertEquals(ErrorSeverity.ERROR, result.errors[0].severity)
    }

    @Test
    fun `runTests respects timeout`() = runTest {
        coEvery { shell.execute(any(), "/test", any(), 600_000) } returns
            ShellExecutor.ShellResult(0, "All tests passed", "")

        val config = buildRunner.detectBuildConfig("/test", ProjectLanguage.PYTHON)
        val result = buildRunner.runTests("/test", config)

        assertTrue(result.success)
        coVerify { shell.execute(config.testCommand, "/test", any(), 600_000) }
    }

    @Test
    fun `lint returns null when no lint command configured`() = runTest {
        val config = BuildRunner.BuildConfig(
            language = ProjectLanguage.OTHER,
            buildCommand = "echo build",
            testCommand = "echo test",
            runCommand = "echo run",
            lintCommand = null
        )

        val result = buildRunner.lint("/test", config)
        assertNull(result)
    }

    @Test
    fun `format returns null when no format command configured`() = runTest {
        val config = BuildRunner.BuildConfig(
            language = ProjectLanguage.OTHER,
            buildCommand = "echo build",
            testCommand = "echo test",
            runCommand = "echo run",
            formatCommand = null
        )

        val result = buildRunner.format("/test", config)
        assertNull(result)
    }

    @Test
    fun `detectBuildConfig covers all major languages`() {
        val languages = listOf(
            ProjectLanguage.KOTLIN, ProjectLanguage.JAVA,
            ProjectLanguage.PYTHON, ProjectLanguage.JAVASCRIPT,
            ProjectLanguage.TYPESCRIPT, ProjectLanguage.RUST,
            ProjectLanguage.GO, ProjectLanguage.C, ProjectLanguage.CPP,
            ProjectLanguage.DART, ProjectLanguage.RUBY, ProjectLanguage.PHP
        )

        for (lang in languages) {
            val config = buildRunner.detectBuildConfig("/test", lang)
            assertTrue("${lang.name} build command should not be empty",
                config.buildCommand.isNotEmpty())
            assertTrue("${lang.name} test command should not be empty",
                config.testCommand.isNotEmpty())
        }
    }
}
