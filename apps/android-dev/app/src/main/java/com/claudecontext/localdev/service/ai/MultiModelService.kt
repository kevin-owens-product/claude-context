package com.claudecontext.localdev.service.ai

import com.claudecontext.localdev.data.models.*
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Unified multi-model AI service that works with Anthropic, OpenAI, Google, Mistral,
 * Groq, OpenRouter, local models, and custom endpoints.
 * Provides a single sendMessage() interface regardless of the underlying provider.
 */
@Singleton
class MultiModelService @Inject constructor(
    private val gson: Gson
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val _providerConfigs = MutableStateFlow<Map<ModelProvider, ProviderConfig>>(emptyMap())
    val providerConfigs: StateFlow<Map<ModelProvider, ProviderConfig>> = _providerConfigs.asStateFlow()

    private val _usageStats = MutableStateFlow<Map<String, ModelUsageStats>>(emptyMap())
    val usageStats: StateFlow<Map<String, ModelUsageStats>> = _usageStats.asStateFlow()

    private val _routingConfig = MutableStateFlow(ModelRoutingConfig())
    val routingConfig: StateFlow<ModelRoutingConfig> = _routingConfig.asStateFlow()

    fun configureProvider(provider: ModelProvider, apiKey: String, customBaseUrl: String? = null) {
        val configs = _providerConfigs.value.toMutableMap()
        configs[provider] = ProviderConfig(
            provider = provider,
            apiKey = apiKey,
            enabled = apiKey.isNotEmpty(),
            customBaseUrl = customBaseUrl
        )
        _providerConfigs.value = configs
    }

    fun setRoutingConfig(config: ModelRoutingConfig) {
        _routingConfig.value = config
    }

    fun getConfiguredProviders(): List<ModelProvider> =
        _providerConfigs.value.filter { it.value.enabled }.keys.toList()

    fun getAvailableModels(): List<AiModel> {
        val configured = getConfiguredProviders()
        return ModelCatalog.models.filter { it.provider in configured } +
            getLocalModels()
    }

    private fun getLocalModels(): List<AiModel> {
        val localConfig = _providerConfigs.value[ModelProvider.LOCAL]
        if (localConfig?.enabled != true) return emptyList()
        return listOf(
            AiModel(
                id = "local-default",
                provider = ModelProvider.LOCAL,
                displayName = "Local Model",
                contextWindow = 8192,
                maxOutputTokens = 2048,
                isLocal = true,
                tier = ModelTier.LOCAL
            )
        )
    }

    /**
     * Send a message to any configured model.
     * Automatically adapts the request format based on the provider.
     */
    suspend fun sendMessage(
        messages: List<ClaudeMessage>,
        systemPrompt: String? = null,
        modelId: String? = null
    ): ClaudeMessage {
        val resolvedModelId = modelId ?: _routingConfig.value.primaryModel
        val model = ModelCatalog.getById(resolvedModelId)
            ?: getLocalModels().find { it.id == resolvedModelId }
            ?: throw IllegalArgumentException("Unknown model: $resolvedModelId")

        val config = _providerConfigs.value[model.provider]
            ?: throw IllegalStateException("Provider ${model.provider.displayName} not configured")

        val startTime = System.currentTimeMillis()

        val result = when (model.provider) {
            ModelProvider.ANTHROPIC -> sendAnthropic(messages, systemPrompt, model, config)
            ModelProvider.OPENAI, ModelProvider.GROQ, ModelProvider.OPENROUTER, ModelProvider.MISTRAL ->
                sendOpenAICompatible(messages, systemPrompt, model, config)
            ModelProvider.GOOGLE -> sendGoogle(messages, systemPrompt, model, config)
            ModelProvider.LOCAL -> sendOpenAICompatible(messages, systemPrompt, model, config)
            ModelProvider.CUSTOM -> sendOpenAICompatible(messages, systemPrompt, model, config)
        }

        // Track usage
        val latency = System.currentTimeMillis() - startTime
        updateUsageStats(resolvedModelId, latency)

        return result
    }

    // --- Anthropic (Claude) ---

    private suspend fun sendAnthropic(
        messages: List<ClaudeMessage>,
        systemPrompt: String?,
        model: AiModel,
        config: ProviderConfig
    ): ClaudeMessage = withContext(Dispatchers.IO) {
        val baseUrl = config.customBaseUrl ?: model.provider.baseUrl

        val requestBody = AnthropicRequest(
            model = model.id,
            maxTokens = model.maxOutputTokens,
            system = systemPrompt,
            messages = messages.filter { it.role != MessageRole.SYSTEM }.map { msg ->
                SimpleMessage(
                    role = if (msg.role == MessageRole.USER) "user" else "assistant",
                    content = msg.content
                )
            }
        )

        val request = Request.Builder()
            .url("$baseUrl/messages")
            .addHeader("x-api-key", config.apiKey)
            .addHeader("anthropic-version", "2023-06-01")
            .addHeader("content-type", "application/json")
            .post(gson.toJson(requestBody).toRequestBody("application/json".toMediaType()))
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: throw Exception("Empty response")

        if (!response.isSuccessful) {
            throw Exception("Anthropic API error (${response.code}): $body")
        }

        val apiResponse = gson.fromJson(body, AnthropicResponse::class.java)
        val content = apiResponse.content.firstOrNull()?.text ?: ""
        ClaudeMessage(role = MessageRole.ASSISTANT, content = content, codeBlocks = extractCodeBlocks(content))
    }

    // --- OpenAI-compatible (GPT, Mistral, Groq, OpenRouter, Local) ---

    private suspend fun sendOpenAICompatible(
        messages: List<ClaudeMessage>,
        systemPrompt: String?,
        model: AiModel,
        config: ProviderConfig
    ): ClaudeMessage = withContext(Dispatchers.IO) {
        val baseUrl = config.customBaseUrl ?: model.provider.baseUrl

        val allMessages = mutableListOf<SimpleMessage>()
        if (systemPrompt != null) {
            allMessages.add(SimpleMessage(role = "system", content = systemPrompt))
        }
        allMessages.addAll(
            messages.filter { it.role != MessageRole.SYSTEM }.map { msg ->
                SimpleMessage(
                    role = if (msg.role == MessageRole.USER) "user" else "assistant",
                    content = msg.content
                )
            }
        )

        val requestBody = OpenAIRequest(
            model = model.id,
            messages = allMessages,
            maxTokens = model.maxOutputTokens
        )

        val requestBuilder = Request.Builder()
            .url("$baseUrl/chat/completions")
            .addHeader("content-type", "application/json")
            .post(gson.toJson(requestBody).toRequestBody("application/json".toMediaType()))

        // Add auth header based on provider
        if (config.apiKey.isNotEmpty()) {
            when (model.provider) {
                ModelProvider.OPENAI, ModelProvider.GROQ, ModelProvider.OPENROUTER,
                ModelProvider.MISTRAL, ModelProvider.CUSTOM ->
                    requestBuilder.addHeader("Authorization", "Bearer ${config.apiKey}")
                else -> requestBuilder.addHeader(model.provider.authHeader, config.apiKey)
            }
        }

        if (model.provider == ModelProvider.OPENROUTER) {
            requestBuilder.addHeader("HTTP-Referer", "https://claudecontext.com")
            requestBuilder.addHeader("X-Title", "Claude Local Dev")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        val body = response.body?.string() ?: throw Exception("Empty response")

        if (!response.isSuccessful) {
            throw Exception("${model.provider.displayName} API error (${response.code}): $body")
        }

        val apiResponse = gson.fromJson(body, OpenAIResponse::class.java)
        val content = apiResponse.choices.firstOrNull()?.message?.content ?: ""
        ClaudeMessage(role = MessageRole.ASSISTANT, content = content, codeBlocks = extractCodeBlocks(content))
    }

    // --- Google (Gemini) ---

    private suspend fun sendGoogle(
        messages: List<ClaudeMessage>,
        systemPrompt: String?,
        model: AiModel,
        config: ProviderConfig
    ): ClaudeMessage = withContext(Dispatchers.IO) {
        val baseUrl = config.customBaseUrl ?: model.provider.baseUrl

        val contents = mutableListOf<GeminiContent>()
        messages.filter { it.role != MessageRole.SYSTEM }.forEach { msg ->
            contents.add(GeminiContent(
                role = if (msg.role == MessageRole.USER) "user" else "model",
                parts = listOf(GeminiPart(text = msg.content))
            ))
        }

        val requestBody = GeminiRequest(
            contents = contents,
            systemInstruction = systemPrompt?.let {
                GeminiContent(role = "user", parts = listOf(GeminiPart(text = it)))
            },
            generationConfig = GeminiGenerationConfig(maxOutputTokens = model.maxOutputTokens)
        )

        val request = Request.Builder()
            .url("$baseUrl/models/${model.id}:generateContent?key=${config.apiKey}")
            .addHeader("content-type", "application/json")
            .post(gson.toJson(requestBody).toRequestBody("application/json".toMediaType()))
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: throw Exception("Empty response")

        if (!response.isSuccessful) {
            throw Exception("Google API error (${response.code}): $body")
        }

        val apiResponse = gson.fromJson(body, GeminiResponse::class.java)
        val content = apiResponse.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text ?: ""
        ClaudeMessage(role = MessageRole.ASSISTANT, content = content, codeBlocks = extractCodeBlocks(content))
    }

    // --- Helpers ---

    private fun extractCodeBlocks(text: String): List<CodeBlock> {
        val regex = Regex("""```(\w*)\n([\s\S]*?)```""")
        return regex.findAll(text).map { match ->
            CodeBlock(code = match.groupValues[2].trim(), language = match.groupValues[1])
        }.toList()
    }

    private fun updateUsageStats(modelId: String, latencyMs: Long) {
        val stats = _usageStats.value.toMutableMap()
        val existing = stats[modelId] ?: ModelUsageStats(modelId = modelId)
        stats[modelId] = existing.copy(
            requestCount = existing.requestCount + 1,
            avgLatencyMs = ((existing.avgLatencyMs * (existing.requestCount) + latencyMs) /
                (existing.requestCount + 1))
        )
        _usageStats.value = stats
    }

    // --- Request/Response DTOs ---

    // Anthropic
    data class AnthropicRequest(
        val model: String,
        @SerializedName("max_tokens") val maxTokens: Int,
        val system: String?,
        val messages: List<SimpleMessage>
    )
    data class AnthropicResponse(
        val id: String,
        val content: List<AnthropicContentBlock>,
        val model: String
    )
    data class AnthropicContentBlock(val type: String, val text: String)

    // OpenAI-compatible
    data class OpenAIRequest(
        val model: String,
        val messages: List<SimpleMessage>,
        @SerializedName("max_tokens") val maxTokens: Int
    )
    data class OpenAIResponse(
        val id: String?,
        val choices: List<OpenAIChoice>
    )
    data class OpenAIChoice(
        val index: Int,
        val message: SimpleMessage
    )

    // Google Gemini
    data class GeminiRequest(
        val contents: List<GeminiContent>,
        @SerializedName("system_instruction") val systemInstruction: GeminiContent?,
        @SerializedName("generation_config") val generationConfig: GeminiGenerationConfig
    )
    data class GeminiContent(
        val role: String,
        val parts: List<GeminiPart>
    )
    data class GeminiPart(val text: String)
    data class GeminiGenerationConfig(
        @SerializedName("max_output_tokens") val maxOutputTokens: Int
    )
    data class GeminiResponse(
        val candidates: List<GeminiCandidate>?
    )
    data class GeminiCandidate(
        val content: GeminiContent
    )

    // Shared
    data class SimpleMessage(
        val role: String,
        val content: String
    )
}
