package com.claudecontext.localdev.data.models

data class ClaudeMessage(
    val role: MessageRole,
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val codeBlocks: List<CodeBlock> = emptyList()
)

enum class MessageRole {
    USER,
    ASSISTANT,
    SYSTEM
}

data class CodeBlock(
    val code: String,
    val language: String = "",
    val filePath: String? = null,
    val startLine: Int? = null,
    val endLine: Int? = null
)

data class ClaudeConversation(
    val id: String,
    val projectId: Long,
    val messages: List<ClaudeMessage> = emptyList(),
    val title: String = "New Conversation",
    val createdAt: Long = System.currentTimeMillis()
)
