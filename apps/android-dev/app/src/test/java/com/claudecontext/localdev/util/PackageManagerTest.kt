package com.claudecontext.localdev.util

import com.claudecontext.localdev.data.models.ProjectLanguage
import com.claudecontext.localdev.service.packages.PackageManagerService
import com.claudecontext.localdev.service.shell.ShellExecutor
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class PackageManagerTest {

    private lateinit var shell: ShellExecutor
    private lateinit var packageManager: PackageManagerService

    @Before
    fun setup() {
        shell = mockk()
        packageManager = PackageManagerService(shell)
    }

    @Test
    fun `getPackageManager returns npm for JavaScript`() {
        val pm = packageManager.getPackageManager(ProjectLanguage.JAVASCRIPT, "/test")
        assertEquals("npm", pm.name)
        assertEquals("npm install", pm.installCommand)
    }

    @Test
    fun `getPackageManager returns pip for Python`() {
        val pm = packageManager.getPackageManager(ProjectLanguage.PYTHON, "/test")
        assertEquals("pip", pm.name)
        assertTrue(pm.installCommand.contains("pip install"))
    }

    @Test
    fun `getPackageManager returns cargo for Rust`() {
        val pm = packageManager.getPackageManager(ProjectLanguage.RUST, "/test")
        assertEquals("cargo", pm.name)
        assertEquals("cargo add", pm.addCommand)
    }

    @Test
    fun `getPackageManager returns go modules for Go`() {
        val pm = packageManager.getPackageManager(ProjectLanguage.GO, "/test")
        assertEquals("go modules", pm.name)
        assertEquals("go get", pm.addCommand)
    }

    @Test
    fun `getPackageManager returns bundler for Ruby`() {
        val pm = packageManager.getPackageManager(ProjectLanguage.RUBY, "/test")
        assertEquals("bundler", pm.name)
    }

    @Test
    fun `getPackageManager returns composer for PHP`() {
        val pm = packageManager.getPackageManager(ProjectLanguage.PHP, "/test")
        assertEquals("composer", pm.name)
    }

    @Test
    fun `getPackageManager returns gradle for Kotlin`() {
        val pm = packageManager.getPackageManager(ProjectLanguage.KOTLIN, "/test")
        assertEquals("gradle", pm.name)
    }

    @Test
    fun `getPackageManager returns pub for Dart`() {
        val pm = packageManager.getPackageManager(ProjectLanguage.DART, "/test")
        assertEquals("pub", pm.name)
    }

    @Test
    fun `addPackage executes correct command`() = runTest {
        coEvery { shell.execute(any(), "/test") } returns
            ShellExecutor.ShellResult(0, "Added successfully", "")

        val result = packageManager.addPackage("/test", ProjectLanguage.PYTHON, "requests")
        assertTrue(result.isSuccess)
    }

    @Test
    fun `checkToolchain checks all tools for language`() = runTest {
        coEvery { shell.isCommandAvailable(any()) } returns true
        coEvery { shell.isCommandAvailable("rustup") } returns false

        val status = packageManager.checkToolchain(ProjectLanguage.RUST)
        assertTrue(status.containsKey("rustc"))
        assertTrue(status.containsKey("cargo"))
        assertTrue(status["rustc"]!!)
        assertFalse(status["rustup"]!!)
    }

    @Test
    fun `all languages have package manager config`() {
        val languages = ProjectLanguage.entries
        for (lang in languages) {
            val pm = packageManager.getPackageManager(lang, "/test")
            assertNotNull("${lang.name} should have a package manager", pm)
            assertTrue("${lang.name} install command should not be empty",
                pm.installCommand.isNotEmpty())
        }
    }
}
