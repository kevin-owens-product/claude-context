package com.claudecontext.localdev.service.git

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GitService @Inject constructor(
    private val shell: ShellExecutor
) {

    suspend fun isGitInstalled(): Boolean = shell.isCommandAvailable("git")

    suspend fun init(path: String): ShellExecutor.ShellResult {
        return shell.execute("git init", path)
    }

    suspend fun clone(
        url: String,
        targetPath: String,
        branch: String? = null
    ): Flow<com.claudecontext.localdev.data.models.TerminalLine> {
        val branchFlag = branch?.let { "-b $it " } ?: ""
        return shell.executeStreaming(
            "git clone ${branchFlag}--progress $url .",
            targetPath
        )
    }

    suspend fun status(path: String): GitStatus {
        val branchResult = shell.execute("git branch --show-current", path)
        val statusResult = shell.execute("git status --porcelain", path)
        val aheadBehind = shell.execute(
            "git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo '0\t0'",
            path
        )

        val branch = branchResult.stdout.trim().ifEmpty { "main" }
        val lines = statusResult.stdout.lines().filter { it.isNotBlank() }

        val staged = mutableListOf<GitFileChange>()
        val unstaged = mutableListOf<GitFileChange>()
        val untracked = mutableListOf<String>()

        for (line in lines) {
            if (line.length < 3) continue
            val index = line[0]
            val workTree = line[1]
            val filePath = line.substring(3).trim()

            when {
                index == '?' -> untracked.add(filePath)
                index != ' ' -> staged.add(
                    GitFileChange(filePath, GitChangeType.fromSymbol(index.toString()))
                )
                workTree != ' ' -> unstaged.add(
                    GitFileChange(filePath, GitChangeType.fromSymbol(workTree.toString()))
                )
            }
        }

        val counts = aheadBehind.stdout.trim().split("\t")
        val ahead = counts.getOrNull(0)?.toIntOrNull() ?: 0
        val behind = counts.getOrNull(1)?.toIntOrNull() ?: 0

        return GitStatus(
            branch = branch,
            isClean = lines.isEmpty(),
            staged = staged,
            unstaged = unstaged,
            untracked = untracked,
            ahead = ahead,
            behind = behind
        )
    }

    suspend fun add(path: String, files: List<String> = listOf(".")): ShellExecutor.ShellResult {
        val fileArgs = files.joinToString(" ")
        return shell.execute("git add $fileArgs", path)
    }

    suspend fun commit(path: String, message: String): ShellExecutor.ShellResult {
        return shell.execute("git commit -m \"${message.replace("\"", "\\\"")}\"", path)
    }

    suspend fun push(
        path: String,
        remote: String = "origin",
        branch: String? = null
    ): ShellExecutor.ShellResult {
        val branchArg = branch ?: ""
        return shell.execute("git push $remote $branchArg", path)
    }

    suspend fun pull(
        path: String,
        remote: String = "origin",
        branch: String? = null
    ): Flow<TerminalLine> {
        val branchArg = branch ?: ""
        return shell.executeStreaming("git pull $remote $branchArg", path)
    }

    suspend fun log(path: String, limit: Int = 50): List<GitCommit> {
        val result = shell.execute(
            "git log --format='%H|%h|%an|%ar|%s' -n $limit",
            path
        )
        if (!result.isSuccess) return emptyList()

        return result.stdout.lines()
            .filter { it.isNotBlank() }
            .mapNotNull { line ->
                val parts = line.split("|", limit = 5)
                if (parts.size >= 5) {
                    GitCommit(
                        hash = parts[0],
                        shortHash = parts[1],
                        author = parts[2],
                        date = parts[3],
                        message = parts[4]
                    )
                } else null
            }
    }

    suspend fun branches(path: String): List<GitBranch> {
        val result = shell.execute("git branch -a", path)
        if (!result.isSuccess) return emptyList()

        return result.stdout.lines()
            .filter { it.isNotBlank() }
            .map { line ->
                val isCurrent = line.startsWith("*")
                val name = line.removePrefix("*").trim()
                    .removePrefix("remotes/")
                GitBranch(
                    name = name,
                    isCurrent = isCurrent,
                    isRemote = line.contains("remotes/")
                )
            }
    }

    suspend fun checkout(path: String, branch: String): ShellExecutor.ShellResult {
        return shell.execute("git checkout $branch", path)
    }

    suspend fun createBranch(path: String, name: String): ShellExecutor.ShellResult {
        return shell.execute("git checkout -b $name", path)
    }

    suspend fun diff(path: String, staged: Boolean = false): String {
        val flag = if (staged) "--staged" else ""
        val result = shell.execute("git diff $flag", path)
        return result.stdout
    }

    suspend fun stash(path: String): ShellExecutor.ShellResult {
        return shell.execute("git stash", path)
    }

    suspend fun stashPop(path: String): ShellExecutor.ShellResult {
        return shell.execute("git stash pop", path)
    }

    suspend fun setRemote(path: String, url: String, name: String = "origin"): ShellExecutor.ShellResult {
        return shell.execute("git remote add $name $url", path)
    }

    suspend fun getRemoteUrl(path: String): String? {
        val result = shell.execute("git remote get-url origin", path)
        return if (result.isSuccess) result.stdout.trim() else null
    }
}
