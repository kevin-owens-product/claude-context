package com.claudecontext.localdev.data

import com.claudecontext.localdev.data.models.*
import org.junit.Assert.*
import org.junit.Test

class ProjectModelTest {

    @Test
    fun `ProjectLanguage fromExtension maps Kotlin files`() {
        assertEquals(ProjectLanguage.KOTLIN, ProjectLanguage.fromExtension("kt"))
        assertEquals(ProjectLanguage.KOTLIN, ProjectLanguage.fromExtension("kts"))
    }

    @Test
    fun `ProjectLanguage fromExtension maps Python files`() {
        assertEquals(ProjectLanguage.PYTHON, ProjectLanguage.fromExtension("py"))
    }

    @Test
    fun `ProjectLanguage fromExtension maps JavaScript files`() {
        assertEquals(ProjectLanguage.JAVASCRIPT, ProjectLanguage.fromExtension("js"))
        assertEquals(ProjectLanguage.JAVASCRIPT, ProjectLanguage.fromExtension("jsx"))
    }

    @Test
    fun `ProjectLanguage fromExtension maps TypeScript files`() {
        assertEquals(ProjectLanguage.TYPESCRIPT, ProjectLanguage.fromExtension("ts"))
        assertEquals(ProjectLanguage.TYPESCRIPT, ProjectLanguage.fromExtension("tsx"))
    }

    @Test
    fun `ProjectLanguage fromExtension returns OTHER for unknown`() {
        assertEquals(ProjectLanguage.OTHER, ProjectLanguage.fromExtension("xyz"))
        assertEquals(ProjectLanguage.OTHER, ProjectLanguage.fromExtension(""))
    }

    @Test
    fun `ProjectLanguage fromExtension is case insensitive`() {
        assertEquals(ProjectLanguage.KOTLIN, ProjectLanguage.fromExtension("KT"))
        assertEquals(ProjectLanguage.PYTHON, ProjectLanguage.fromExtension("PY"))
    }

    @Test
    fun `BuildResult reports errors correctly`() {
        val result = BuildResult(
            success = false,
            output = "Compilation failed",
            errors = listOf(
                BuildError("file.kt", 10, 5, "Type mismatch"),
                BuildError("file.kt", 20, 1, "Unresolved reference")
            ),
            warnings = listOf("Deprecated API usage")
        )

        assertFalse(result.success)
        assertEquals(2, result.errors.size)
        assertEquals(1, result.warnings.size)
    }

    @Test
    fun `TestSuiteResult calculates counts correctly`() {
        val suite = TestSuiteResult(
            suiteName = "MainTest",
            tests = listOf(
                TestResult("test1", passed = true, durationMs = 100),
                TestResult("test2", passed = true, durationMs = 200),
                TestResult("test3", passed = false, durationMs = 50, errorMessage = "Assertion failed")
            )
        )

        assertEquals(3, suite.totalCount)
        assertEquals(2, suite.passedCount)
        assertEquals(1, suite.failedCount)
        assertFalse(suite.allPassed)
    }

    @Test
    fun `TestSuiteResult allPassed returns true when all pass`() {
        val suite = TestSuiteResult(
            suiteName = "PassingTests",
            tests = listOf(
                TestResult("test1", passed = true),
                TestResult("test2", passed = true)
            )
        )

        assertTrue(suite.allPassed)
    }

    @Test
    fun `ClaudeMessage extracts code blocks`() {
        val codeBlocks = listOf(
            CodeBlock(code = "fun main() {}", language = "kotlin"),
            CodeBlock(code = "print('hello')", language = "python")
        )
        val message = ClaudeMessage(
            role = MessageRole.ASSISTANT,
            content = "Here's the code",
            codeBlocks = codeBlocks
        )

        assertEquals(2, message.codeBlocks.size)
        assertEquals("kotlin", message.codeBlocks[0].language)
    }

    @Test
    fun `GitStatus isClean when no changes`() {
        val status = GitStatus(
            branch = "main",
            isClean = true,
            staged = emptyList(),
            unstaged = emptyList(),
            untracked = emptyList()
        )

        assertTrue(status.isClean)
        assertEquals(0, status.ahead)
        assertEquals(0, status.behind)
    }

    @Test
    fun `TerminalLine types are distinguished`() {
        val input = TerminalLine("$ ls", LineType.INPUT)
        val output = TerminalLine("file.txt", LineType.OUTPUT)
        val error = TerminalLine("Permission denied", LineType.ERROR)
        val system = TerminalLine("Session started", LineType.SYSTEM)

        assertEquals(LineType.INPUT, input.type)
        assertEquals(LineType.OUTPUT, output.type)
        assertEquals(LineType.ERROR, error.type)
        assertEquals(LineType.SYSTEM, system.type)
    }
}
