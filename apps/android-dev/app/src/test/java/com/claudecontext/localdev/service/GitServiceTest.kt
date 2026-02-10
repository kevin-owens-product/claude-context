package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.GitChangeType
import com.claudecontext.localdev.service.git.GitService
import com.claudecontext.localdev.service.shell.ShellExecutor
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class GitServiceTest {

    private lateinit var shell: ShellExecutor
    private lateinit var gitService: GitService

    @Before
    fun setup() {
        shell = mockk()
        gitService = GitService(shell)
    }

    @Test
    fun `isGitInstalled delegates to shell`() = runTest {
        coEvery { shell.isCommandAvailable("git") } returns true
        assertTrue(gitService.isGitInstalled())
        coVerify { shell.isCommandAvailable("git") }
    }

    @Test
    fun `init calls git init in correct directory`() = runTest {
        coEvery { shell.execute("git init", "/test/path") } returns
            ShellExecutor.ShellResult(0, "Initialized empty Git repository", "")

        val result = gitService.init("/test/path")
        assertTrue(result.isSuccess)
        coVerify { shell.execute("git init", "/test/path") }
    }

    @Test
    fun `status parses clean working tree`() = runTest {
        coEvery { shell.execute("git branch --show-current", any()) } returns
            ShellExecutor.ShellResult(0, "main", "")
        coEvery { shell.execute("git status --porcelain", any()) } returns
            ShellExecutor.ShellResult(0, "", "")
        coEvery { shell.execute(match { it.startsWith("git rev-list") }, any()) } returns
            ShellExecutor.ShellResult(0, "0\t0", "")

        val status = gitService.status("/test")
        assertEquals("main", status.branch)
        assertTrue(status.isClean)
        assertTrue(status.staged.isEmpty())
        assertTrue(status.unstaged.isEmpty())
        assertTrue(status.untracked.isEmpty())
    }

    @Test
    fun `status parses modified files`() = runTest {
        coEvery { shell.execute("git branch --show-current", any()) } returns
            ShellExecutor.ShellResult(0, "feature-branch", "")
        coEvery { shell.execute("git status --porcelain", any()) } returns
            ShellExecutor.ShellResult(0, "M  src/main.kt\n A src/new.kt\n?? untracked.txt", "")
        coEvery { shell.execute(match { it.startsWith("git rev-list") }, any()) } returns
            ShellExecutor.ShellResult(0, "2\t1", "")

        val status = gitService.status("/test")
        assertEquals("feature-branch", status.branch)
        assertFalse(status.isClean)
        assertEquals(2, status.ahead)
        assertEquals(1, status.behind)
    }

    @Test
    fun `commit formats message correctly`() = runTest {
        coEvery { shell.execute(any(), "/test") } returns
            ShellExecutor.ShellResult(0, "1 file changed", "")

        gitService.commit("/test", "fix: resolve bug")
        coVerify {
            shell.execute("git commit -m \"fix: resolve bug\"", "/test")
        }
    }

    @Test
    fun `commit escapes quotes in message`() = runTest {
        coEvery { shell.execute(any(), "/test") } returns
            ShellExecutor.ShellResult(0, "committed", "")

        gitService.commit("/test", "fix: handle \"edge case\"")
        coVerify {
            shell.execute("git commit -m \"fix: handle \\\"edge case\\\"\"", "/test")
        }
    }

    @Test
    fun `log parses commit entries`() = runTest {
        val logOutput = """abc123full|abc123|John Doe|2 hours ago|feat: add feature
def456full|def456|Jane Smith|1 day ago|fix: resolve issue"""
        coEvery { shell.execute(any(), "/test") } returns
            ShellExecutor.ShellResult(0, logOutput, "")

        val commits = gitService.log("/test")
        assertEquals(2, commits.size)
        assertEquals("abc123", commits[0].shortHash)
        assertEquals("John Doe", commits[0].author)
        assertEquals("feat: add feature", commits[0].message)
    }

    @Test
    fun `branches parses branch list`() = runTest {
        val branchOutput = """* main
  feature-a
  remotes/origin/main"""
        coEvery { shell.execute("git branch -a", "/test") } returns
            ShellExecutor.ShellResult(0, branchOutput, "")

        val branches = gitService.branches("/test")
        assertEquals(3, branches.size)
        assertTrue(branches[0].isCurrent)
        assertEquals("main", branches[0].name)
        assertFalse(branches[1].isCurrent)
    }

    @Test
    fun `add stages specified files`() = runTest {
        coEvery { shell.execute(any(), "/test") } returns
            ShellExecutor.ShellResult(0, "", "")

        gitService.add("/test", listOf("file1.kt", "file2.kt"))
        coVerify { shell.execute("git add file1.kt file2.kt", "/test") }
    }

    @Test
    fun `getRemoteUrl returns url on success`() = runTest {
        coEvery { shell.execute("git remote get-url origin", "/test") } returns
            ShellExecutor.ShellResult(0, "https://github.com/user/repo.git", "")

        val url = gitService.getRemoteUrl("/test")
        assertEquals("https://github.com/user/repo.git", url)
    }

    @Test
    fun `getRemoteUrl returns null on failure`() = runTest {
        coEvery { shell.execute("git remote get-url origin", "/test") } returns
            ShellExecutor.ShellResult(1, "", "fatal: not a git repository")

        assertNull(gitService.getRemoteUrl("/test"))
    }

    @Test
    fun `GitChangeType fromSymbol maps correctly`() {
        assertEquals(GitChangeType.ADDED, GitChangeType.fromSymbol("A"))
        assertEquals(GitChangeType.MODIFIED, GitChangeType.fromSymbol("M"))
        assertEquals(GitChangeType.DELETED, GitChangeType.fromSymbol("D"))
        assertEquals(GitChangeType.RENAMED, GitChangeType.fromSymbol("R"))
        assertEquals(GitChangeType.UNTRACKED, GitChangeType.fromSymbol("?"))
        assertEquals(GitChangeType.MODIFIED, GitChangeType.fromSymbol("X"))
    }
}
