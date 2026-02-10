import Foundation

// MARK: - Model Providers

enum ModelProvider: String, CaseIterable, Codable, Identifiable {
    case anthropic
    case openai
    case google
    case mistral
    case groq
    case openRouter
    case local
    case custom

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .anthropic: return "Anthropic (Claude)"
        case .openai: return "OpenAI (GPT)"
        case .google: return "Google (Gemini)"
        case .mistral: return "Mistral AI"
        case .groq: return "Groq"
        case .openRouter: return "OpenRouter"
        case .local: return "Local Model"
        case .custom: return "Custom Endpoint"
        }
    }

    var baseURL: String {
        switch self {
        case .anthropic: return "https://api.anthropic.com/v1"
        case .openai: return "https://api.openai.com/v1"
        case .google: return "https://generativelanguage.googleapis.com/v1beta"
        case .mistral: return "https://api.mistral.ai/v1"
        case .groq: return "https://api.groq.com/openai/v1"
        case .openRouter: return "https://openrouter.ai/api/v1"
        case .local: return "http://localhost:8080/v1"
        case .custom: return ""
        }
    }

    var iconColor: String {
        switch self {
        case .anthropic: return "D97706"
        case .openai: return "10A37F"
        case .google: return "4285F4"
        case .mistral: return "FF7000"
        case .groq: return "F55036"
        case .openRouter: return "6366F1"
        case .local: return "10B981"
        case .custom: return "8B5CF6"
        }
    }
}

// MARK: - AI Model

struct AiModel: Identifiable, Codable {
    let id: String
    let provider: ModelProvider
    let displayName: String
    let contextWindow: Int
    let maxOutputTokens: Int
    let supportsStreaming: Bool
    let supportsToolUse: Bool
    let inputCostPer1kTokens: Double
    let outputCostPer1kTokens: Double
    let tier: ModelTier
    let isLocal: Bool

    init(
        id: String,
        provider: ModelProvider,
        displayName: String,
        contextWindow: Int,
        maxOutputTokens: Int = 4096,
        supportsStreaming: Bool = true,
        supportsToolUse: Bool = true,
        inputCostPer1kTokens: Double = 0.0,
        outputCostPer1kTokens: Double = 0.0,
        tier: ModelTier = .standard,
        isLocal: Bool = false
    ) {
        self.id = id
        self.provider = provider
        self.displayName = displayName
        self.contextWindow = contextWindow
        self.maxOutputTokens = maxOutputTokens
        self.supportsStreaming = supportsStreaming
        self.supportsToolUse = supportsToolUse
        self.inputCostPer1kTokens = inputCostPer1kTokens
        self.outputCostPer1kTokens = outputCostPer1kTokens
        self.tier = tier
        self.isLocal = isLocal
    }

    var costEstimate: String {
        if isLocal { return "Free (local)" }
        if inputCostPer1kTokens == 0.0 { return "Free" }
        return "$\(String(format: "%.4f", inputCostPer1kTokens))/1k in, $\(String(format: "%.4f", outputCostPer1kTokens))/1k out"
    }
}

enum ModelTier: String, Codable {
    case fast = "Fast"
    case standard = "Standard"
    case premium = "Premium"
    case local = "Local"
}

// MARK: - Model Catalog

struct ModelCatalog {
    static let models: [AiModel] = [
        // Anthropic
        AiModel(id: "claude-sonnet-4-20250514", provider: .anthropic, displayName: "Claude Sonnet 4", contextWindow: 200000, maxOutputTokens: 8192, inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015, tier: .standard),
        AiModel(id: "claude-opus-4-20250514", provider: .anthropic, displayName: "Claude Opus 4", contextWindow: 200000, maxOutputTokens: 8192, inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.075, tier: .premium),
        AiModel(id: "claude-haiku-3-5-20241022", provider: .anthropic, displayName: "Claude Haiku 3.5", contextWindow: 200000, maxOutputTokens: 4096, inputCostPer1kTokens: 0.00025, outputCostPer1kTokens: 0.00125, tier: .fast),

        // OpenAI
        AiModel(id: "gpt-4o", provider: .openai, displayName: "GPT-4o", contextWindow: 128000, maxOutputTokens: 4096, inputCostPer1kTokens: 0.005, outputCostPer1kTokens: 0.015, tier: .standard),
        AiModel(id: "gpt-4o-mini", provider: .openai, displayName: "GPT-4o Mini", contextWindow: 128000, maxOutputTokens: 4096, inputCostPer1kTokens: 0.00015, outputCostPer1kTokens: 0.0006, tier: .fast),
        AiModel(id: "o1", provider: .openai, displayName: "o1", contextWindow: 200000, maxOutputTokens: 16384, inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.06, tier: .premium),

        // Google
        AiModel(id: "gemini-2.0-flash", provider: .google, displayName: "Gemini 2.0 Flash", contextWindow: 1000000, maxOutputTokens: 8192, inputCostPer1kTokens: 0.0001, outputCostPer1kTokens: 0.0004, tier: .fast),
        AiModel(id: "gemini-2.0-pro", provider: .google, displayName: "Gemini 2.0 Pro", contextWindow: 1000000, maxOutputTokens: 8192, inputCostPer1kTokens: 0.00125, outputCostPer1kTokens: 0.005, tier: .standard),

        // Mistral
        AiModel(id: "mistral-large-latest", provider: .mistral, displayName: "Mistral Large", contextWindow: 128000, maxOutputTokens: 4096, inputCostPer1kTokens: 0.002, outputCostPer1kTokens: 0.006, tier: .standard),
        AiModel(id: "codestral-latest", provider: .mistral, displayName: "Codestral", contextWindow: 32000, maxOutputTokens: 4096, inputCostPer1kTokens: 0.001, outputCostPer1kTokens: 0.003, tier: .standard),

        // Groq
        AiModel(id: "llama-3.3-70b-versatile", provider: .groq, displayName: "Llama 3.3 70B", contextWindow: 128000, maxOutputTokens: 4096, inputCostPer1kTokens: 0.00059, outputCostPer1kTokens: 0.00079, tier: .fast),
        AiModel(id: "mixtral-8x7b-32768", provider: .groq, displayName: "Mixtral 8x7B", contextWindow: 32768, maxOutputTokens: 4096, inputCostPer1kTokens: 0.00024, outputCostPer1kTokens: 0.00024, tier: .fast),
    ]

    static func byProvider(_ provider: ModelProvider) -> [AiModel] {
        models.filter { $0.provider == provider }
    }

    static func byId(_ id: String) -> AiModel? {
        models.first { $0.id == id }
    }

    static func byTier(_ tier: ModelTier) -> [AiModel] {
        models.filter { $0.tier == tier }
    }
}

// MARK: - Routing Config

struct ModelRoutingConfig: Codable {
    var primaryModel: String = "claude-sonnet-4-20250514"
    var fastModel: String?
    var codeModel: String?
    var reasoningModel: String?
    var autoRoute: Bool = true
}

// MARK: - Usage Stats

struct ModelUsageStats: Codable {
    let modelId: String
    var inputTokens: Int = 0
    var outputTokens: Int = 0
    var requestCount: Int = 0
    var estimatedCost: Double = 0.0
    var avgLatencyMs: Int = 0
}
