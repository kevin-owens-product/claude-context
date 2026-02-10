package com.claudecontext.localdev.service

import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ShellExecutorTest {

    private lateinit var shellExecutor: ShellExecutor

    @Before
    fun setup() {
        shellExecutor = ShellExecutor()
    }

    @Test
    fun `execute returns success for simple command`() = runTest {
        val result = shellExecutor.execute("echo 'hello'")
        assertTrue(result.isSuccess)
        assertEquals(0, result.exitCode)
        assertEquals("hello", result.stdout)
    }

    @Test
    fun `execute returns failure for invalid command`() = runTest {
        val result = shellExecutor.execute("nonexistent_command_12345")
        assertFalse(result.isSuccess)
        assertNotEquals(0, result.exitCode)
    }

    @Test
    fun `execute respects working directory`() = runTest {
        val result = shellExecutor.execute("pwd", "/tmp")
        assertTrue(result.isSuccess)
        assertTrue(result.stdout.contains("/tmp"))
    }

    @Test
    fun `execute passes environment variables`() = runTest {
        val env = mapOf("TEST_VAR" to "test_value")
        val result = shellExecutor.execute("echo \$TEST_VAR", environment = env)
        assertTrue(result.isSuccess)
        assertEquals("test_value", result.stdout)
    }

    @Test
    fun `execute captures stderr`() = runTest {
        val result = shellExecutor.execute("echo 'error' >&2")
        assertEquals("error", result.stderr)
    }

    @Test
    fun `output combines stdout and stderr`() = runTest {
        val result = shellExecutor.execute("echo 'out' && echo 'err' >&2")
        assertTrue(result.output.contains("out"))
        assertTrue(result.output.contains("err"))
    }

    @Test
    fun `isCommandAvailable returns true for existing command`() = runTest {
        assertTrue(shellExecutor.isCommandAvailable("echo"))
    }

    @Test
    fun `isCommandAvailable returns false for non-existing command`() = runTest {
        assertFalse(shellExecutor.isCommandAvailable("nonexistent_command_xyz"))
    }

    @Test
    fun `execute handles multiline output`() = runTest {
        val result = shellExecutor.execute("echo 'line1\nline2\nline3'")
        assertTrue(result.isSuccess)
        assertTrue(result.stdout.contains("line1"))
        assertTrue(result.stdout.contains("line3"))
    }

    @Test
    fun `execute handles empty output`() = runTest {
        val result = shellExecutor.execute("true")
        assertTrue(result.isSuccess)
        assertEquals("", result.stdout)
    }
}
