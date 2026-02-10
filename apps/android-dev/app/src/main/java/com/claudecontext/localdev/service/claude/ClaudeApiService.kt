package com.claudecontext.localdev.service.claude

import com.claudecontext.localdev.data.models.ClaudeMessage
import com.claudecontext.localdev.data.models.CodeBlock
import com.claudecontext.localdev.data.models.MessageRole
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ClaudeApiService @Inject constructor(
    private val gson: Gson
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private var apiKey: String? = null
    private val baseUrl = "https://api.anthropic.com/v1"

    fun setApiKey(key: String) {
        apiKey = key
    }

    fun isConfigured(): Boolean = apiKey != null

    suspend fun sendMessage(
        messages: List<ClaudeMessage>,
        systemPrompt: String? = null,
        model: String = "claude-sonnet-4-20250514"
    ): ClaudeMessage = withContext(Dispatchers.IO) {
        val key = apiKey ?: throw IllegalStateException("API key not configured")

        val requestBody = buildRequestBody(messages, systemPrompt, model)
        val jsonBody = gson.toJson(requestBody)

        val request = Request.Builder()
            .url("$baseUrl/messages")
            .addHeader("x-api-key", key)
            .addHeader("anthropic-version", "2023-06-01")
            .addHeader("content-type", "application/json")
            .post(jsonBody.toRequestBody("application/json".toMediaType()))
            .build()

        val response = client.newCall(request).execute()
        val responseBody = response.body?.string()
            ?: throw Exception("Empty response from Claude API")

        if (!response.isSuccessful) {
            throw Exception("Claude API error (${response.code}): $responseBody")
        }

        val apiResponse = gson.fromJson(responseBody, ApiResponse::class.java)
        val content = apiResponse.content.firstOrNull()?.text ?: ""

        ClaudeMessage(
            role = MessageRole.ASSISTANT,
            content = content,
            codeBlocks = extractCodeBlocks(content)
        )
    }

    suspend fun getCodeAssistance(
        code: String,
        filePath: String,
        instruction: String,
        projectContext: String = ""
    ): ClaudeMessage {
        val systemPrompt = buildString {
            appendLine("You are a coding assistant integrated into a local Android development environment.")
            appendLine("Help the user write, debug, and improve code.")
            appendLine("When suggesting code changes, use markdown code blocks with the language specified.")
            appendLine("Be concise and focused on the specific request.")
            if (projectContext.isNotEmpty()) {
                appendLine("\nProject context:")
                appendLine(projectContext)
            }
        }

        val userMessage = ClaudeMessage(
            role = MessageRole.USER,
            content = buildString {
                appendLine("File: $filePath")
                appendLine("```")
                appendLine(code)
                appendLine("```")
                appendLine()
                appendLine(instruction)
            }
        )

        return sendMessage(listOf(userMessage), systemPrompt)
    }

    suspend fun explainError(
        error: String,
        code: String? = null,
        language: String = ""
    ): ClaudeMessage {
        val userMessage = ClaudeMessage(
            role = MessageRole.USER,
            content = buildString {
                appendLine("I got this error:")
                appendLine("```")
                appendLine(error)
                appendLine("```")
                if (code != null) {
                    appendLine("\nRelevant code ($language):")
                    appendLine("```$language")
                    appendLine(code)
                    appendLine("```")
                }
                appendLine("\nExplain what caused this and how to fix it.")
            }
        )

        return sendMessage(
            listOf(userMessage),
            "You are a debugging assistant. Explain errors clearly and suggest fixes."
        )
    }

    suspend fun generateTests(
        code: String,
        filePath: String,
        language: String
    ): ClaudeMessage {
        val userMessage = ClaudeMessage(
            role = MessageRole.USER,
            content = buildString {
                appendLine("Generate unit tests for this code:")
                appendLine("File: $filePath")
                appendLine("```$language")
                appendLine(code)
                appendLine("```")
                appendLine("\nWrite comprehensive tests covering edge cases.")
            }
        )

        return sendMessage(
            listOf(userMessage),
            "You are a testing expert. Generate thorough, well-structured unit tests."
        )
    }

    private fun buildRequestBody(
        messages: List<ClaudeMessage>,
        systemPrompt: String?,
        model: String
    ): ApiRequest {
        return ApiRequest(
            model = model,
            maxTokens = 4096,
            system = systemPrompt,
            messages = messages.filter { it.role != MessageRole.SYSTEM }.map { msg ->
                ApiMessage(
                    role = when (msg.role) {
                        MessageRole.USER -> "user"
                        MessageRole.ASSISTANT -> "assistant"
                        MessageRole.SYSTEM -> "user"
                    },
                    content = msg.content
                )
            }
        )
    }

    private fun extractCodeBlocks(text: String): List<CodeBlock> {
        val regex = Regex("""```(\w*)\n([\s\S]*?)```""")
        return regex.findAll(text).map { match ->
            CodeBlock(
                code = match.groupValues[2].trim(),
                language = match.groupValues[1]
            )
        }.toList()
    }

    data class ApiRequest(
        val model: String,
        @SerializedName("max_tokens") val maxTokens: Int,
        val system: String?,
        val messages: List<ApiMessage>
    )

    data class ApiMessage(
        val role: String,
        val content: String
    )

    data class ApiResponse(
        val id: String,
        val content: List<ContentBlock>,
        val model: String,
        @SerializedName("stop_reason") val stopReason: String?
    )

    data class ContentBlock(
        val type: String,
        val text: String
    )
}
