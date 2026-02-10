package com.claudecontext.localdev.data.models

data class GitStatus(
    val branch: String,
    val isClean: Boolean,
    val staged: List<GitFileChange>,
    val unstaged: List<GitFileChange>,
    val untracked: List<String>,
    val ahead: Int = 0,
    val behind: Int = 0
)

data class GitFileChange(
    val path: String,
    val status: GitChangeType
)

enum class GitChangeType(val symbol: String) {
    ADDED("A"),
    MODIFIED("M"),
    DELETED("D"),
    RENAMED("R"),
    COPIED("C"),
    UNTRACKED("?");

    companion object {
        fun fromSymbol(s: String): GitChangeType = when (s.trim()) {
            "A" -> ADDED
            "M" -> MODIFIED
            "D" -> DELETED
            "R" -> RENAMED
            "C" -> COPIED
            "?" -> UNTRACKED
            else -> MODIFIED
        }
    }
}

data class GitCommit(
    val hash: String,
    val shortHash: String,
    val author: String,
    val date: String,
    val message: String
)

data class GitBranch(
    val name: String,
    val isCurrent: Boolean,
    val isRemote: Boolean
)

data class CloneProgress(
    val phase: String,
    val percentage: Int,
    val receivedObjects: Int = 0,
    val totalObjects: Int = 0
)
