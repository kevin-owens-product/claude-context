package com.claudecontext.localdev.data.models

/**
 * Supported AI model providers.
 */
enum class ModelProvider(
    val displayName: String,
    val baseUrl: String,
    val authHeader: String
) {
    ANTHROPIC(
        "Anthropic (Claude)",
        "https://api.anthropic.com/v1",
        "x-api-key"
    ),
    OPENAI(
        "OpenAI (GPT)",
        "https://api.openai.com/v1",
        "Authorization"
    ),
    GOOGLE(
        "Google (Gemini)",
        "https://generativelanguage.googleapis.com/v1beta",
        "x-goog-api-key"
    ),
    MISTRAL(
        "Mistral AI",
        "https://api.mistral.ai/v1",
        "Authorization"
    ),
    GROQ(
        "Groq",
        "https://api.groq.com/openai/v1",
        "Authorization"
    ),
    OPENROUTER(
        "OpenRouter",
        "https://openrouter.ai/api/v1",
        "Authorization"
    ),
    LOCAL(
        "Local Model",
        "http://localhost:8080/v1",
        ""
    ),
    CUSTOM(
        "Custom Endpoint",
        "",
        "Authorization"
    )
}

/**
 * A specific model from a provider with its capabilities and pricing.
 */
data class AiModel(
    val id: String,
    val provider: ModelProvider,
    val displayName: String,
    val contextWindow: Int,
    val maxOutputTokens: Int = 4096,
    val supportsStreaming: Boolean = true,
    val supportsToolUse: Boolean = true,
    val inputCostPer1kTokens: Double = 0.0,
    val outputCostPer1kTokens: Double = 0.0,
    val tier: ModelTier = ModelTier.STANDARD,
    val isLocal: Boolean = false
) {
    val costEstimate: String
        get() = if (isLocal) "Free (local)"
        else if (inputCostPer1kTokens == 0.0) "Free"
        else "$${String.format("%.4f", inputCostPer1kTokens)}/1k in, $${String.format("%.4f", outputCostPer1kTokens)}/1k out"
}

enum class ModelTier(val displayName: String) {
    FAST("Fast"),
    STANDARD("Standard"),
    PREMIUM("Premium"),
    LOCAL("Local")
}

/**
 * Predefined model catalog.
 */
object ModelCatalog {
    val models = listOf(
        // Anthropic
        AiModel("claude-sonnet-4-20250514", ModelProvider.ANTHROPIC, "Claude Sonnet 4", 200000, 8192, inputCostPer1kTokens = 0.003, outputCostPer1kTokens = 0.015, tier = ModelTier.STANDARD),
        AiModel("claude-opus-4-20250514", ModelProvider.ANTHROPIC, "Claude Opus 4", 200000, 8192, inputCostPer1kTokens = 0.015, outputCostPer1kTokens = 0.075, tier = ModelTier.PREMIUM),
        AiModel("claude-haiku-3-5-20241022", ModelProvider.ANTHROPIC, "Claude Haiku 3.5", 200000, 4096, inputCostPer1kTokens = 0.00025, outputCostPer1kTokens = 0.00125, tier = ModelTier.FAST),

        // OpenAI
        AiModel("gpt-4o", ModelProvider.OPENAI, "GPT-4o", 128000, 4096, inputCostPer1kTokens = 0.005, outputCostPer1kTokens = 0.015, tier = ModelTier.STANDARD),
        AiModel("gpt-4o-mini", ModelProvider.OPENAI, "GPT-4o Mini", 128000, 4096, inputCostPer1kTokens = 0.00015, outputCostPer1kTokens = 0.0006, tier = ModelTier.FAST),
        AiModel("o1", ModelProvider.OPENAI, "o1", 200000, 16384, inputCostPer1kTokens = 0.015, outputCostPer1kTokens = 0.06, tier = ModelTier.PREMIUM),

        // Google
        AiModel("gemini-2.0-flash", ModelProvider.GOOGLE, "Gemini 2.0 Flash", 1000000, 8192, inputCostPer1kTokens = 0.0001, outputCostPer1kTokens = 0.0004, tier = ModelTier.FAST),
        AiModel("gemini-2.0-pro", ModelProvider.GOOGLE, "Gemini 2.0 Pro", 1000000, 8192, inputCostPer1kTokens = 0.00125, outputCostPer1kTokens = 0.005, tier = ModelTier.STANDARD),

        // Mistral
        AiModel("mistral-large-latest", ModelProvider.MISTRAL, "Mistral Large", 128000, 4096, inputCostPer1kTokens = 0.002, outputCostPer1kTokens = 0.006, tier = ModelTier.STANDARD),
        AiModel("codestral-latest", ModelProvider.MISTRAL, "Codestral", 32000, 4096, inputCostPer1kTokens = 0.001, outputCostPer1kTokens = 0.003, tier = ModelTier.STANDARD),
        AiModel("mistral-small-latest", ModelProvider.MISTRAL, "Mistral Small", 128000, 4096, inputCostPer1kTokens = 0.0002, outputCostPer1kTokens = 0.0006, tier = ModelTier.FAST),

        // Groq (fast inference)
        AiModel("llama-3.3-70b-versatile", ModelProvider.GROQ, "Llama 3.3 70B", 128000, 4096, inputCostPer1kTokens = 0.00059, outputCostPer1kTokens = 0.00079, tier = ModelTier.FAST),
        AiModel("mixtral-8x7b-32768", ModelProvider.GROQ, "Mixtral 8x7B", 32768, 4096, inputCostPer1kTokens = 0.00024, outputCostPer1kTokens = 0.00024, tier = ModelTier.FAST)
    )

    fun getByProvider(provider: ModelProvider): List<AiModel> =
        models.filter { it.provider == provider }

    fun getById(id: String): AiModel? = models.find { it.id == id }

    fun getByTier(tier: ModelTier): List<AiModel> =
        models.filter { it.tier == tier }
}

/**
 * Configuration for a provider with API key and enabled status.
 */
data class ProviderConfig(
    val provider: ModelProvider,
    val apiKey: String = "",
    val enabled: Boolean = false,
    val customBaseUrl: String? = null,
    val defaultModel: String? = null
)

/**
 * Multi-model session configuration - which models to use for what.
 */
data class ModelRoutingConfig(
    val primaryModel: String = "claude-sonnet-4-20250514",
    val routingModel: String? = null,
    val fastModel: String? = null,
    val codeModel: String? = null,
    val reasoningModel: String? = null,
    val autoRoute: Boolean = true
)

/**
 * Tracks token usage and costs across models.
 */
data class ModelUsageStats(
    val modelId: String,
    val inputTokens: Long = 0,
    val outputTokens: Long = 0,
    val requestCount: Int = 0,
    val estimatedCost: Double = 0.0,
    val avgLatencyMs: Long = 0
)
