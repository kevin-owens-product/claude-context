import Foundation
import Combine

/// Unified multi-model AI service that supports Anthropic, OpenAI, Google, Mistral, Groq, OpenRouter, local, and custom endpoints.
@MainActor
class MultiModelService: ObservableObject {
    @Published var routingConfig = ModelRoutingConfig()
    @Published var usageStats: [String: ModelUsageStats] = [:]

    private var providerConfigs: [ModelProvider: ProviderConfig] = [:]
    private let session = URLSession.shared

    struct ProviderConfig {
        let apiKey: String
        var baseURL: String?
    }

    func configureProvider(_ provider: ModelProvider, apiKey: String, baseURL: String? = nil) {
        providerConfigs[provider] = ProviderConfig(apiKey: apiKey, baseURL: baseURL)
    }

    func setRoutingConfig(_ config: ModelRoutingConfig) {
        routingConfig = config
    }

    func getAvailableModels() -> [AiModel] {
        let enabledProviders = Set(providerConfigs.keys)
        return ModelCatalog.models.filter { enabledProviders.contains($0.provider) }
    }

    func sendMessage(
        _ messages: [ChatMessage],
        systemPrompt: String? = nil,
        modelId: String? = nil
    ) async throws -> ChatMessage {
        let model = modelId ?? routingConfig.primaryModel
        guard let aiModel = ModelCatalog.byId(model) else {
            throw AIError.modelNotFound(model)
        }
        guard let config = providerConfigs[aiModel.provider] else {
            throw AIError.providerNotConfigured(aiModel.provider.displayName)
        }

        let startTime = Date()
        let response: ChatMessage

        switch aiModel.provider {
        case .anthropic:
            response = try await sendAnthropic(messages, systemPrompt: systemPrompt, model: model, apiKey: config.apiKey)
        case .google:
            response = try await sendGoogle(messages, systemPrompt: systemPrompt, model: model, apiKey: config.apiKey)
        case .openai, .mistral, .groq, .openRouter, .local, .custom:
            let baseURL = config.baseURL ?? aiModel.provider.baseURL
            response = try await sendOpenAICompatible(messages, systemPrompt: systemPrompt, model: model, apiKey: config.apiKey, baseURL: baseURL)
        }

        // Track usage
        let latency = Int(Date().timeIntervalSince(startTime) * 1000)
        var stats = usageStats[model] ?? ModelUsageStats(modelId: model)
        stats.requestCount += 1
        stats.avgLatencyMs = (stats.avgLatencyMs * (stats.requestCount - 1) + latency) / stats.requestCount
        usageStats[model] = stats

        return response
    }

    // MARK: - Anthropic Messages API

    private func sendAnthropic(
        _ messages: [ChatMessage],
        systemPrompt: String?,
        model: String,
        apiKey: String
    ) async throws -> ChatMessage {
        let url = URL(string: "https://api.anthropic.com/v1/messages")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [
            "model": model,
            "max_tokens": 4096,
            "messages": messages.map { msg in
                ["role": msg.role == .user ? "user" : "assistant", "content": msg.content]
            }
        ]
        if let system = systemPrompt {
            body["system"] = system
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, httpResponse) = try await session.data(for: request)
        try validateResponse(httpResponse)

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let content = (json?["content"] as? [[String: Any]])?.first?["text"] as? String ?? ""

        return ChatMessage(role: .assistant, content: content)
    }

    // MARK: - OpenAI Compatible API

    private func sendOpenAICompatible(
        _ messages: [ChatMessage],
        systemPrompt: String?,
        model: String,
        apiKey: String,
        baseURL: String
    ) async throws -> ChatMessage {
        let url = URL(string: "\(baseURL)/chat/completions")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var apiMessages: [[String: String]] = []
        if let system = systemPrompt {
            apiMessages.append(["role": "system", "content": system])
        }
        apiMessages.append(contentsOf: messages.map { msg in
            ["role": msg.role == .user ? "user" : "assistant", "content": msg.content]
        })

        let body: [String: Any] = [
            "model": model,
            "messages": apiMessages,
            "max_tokens": 4096
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, httpResponse) = try await session.data(for: request)
        try validateResponse(httpResponse)

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let choices = json?["choices"] as? [[String: Any]]
        let message = choices?.first?["message"] as? [String: Any]
        let content = message?["content"] as? String ?? ""

        return ChatMessage(role: .assistant, content: content)
    }

    // MARK: - Google Gemini API

    private func sendGoogle(
        _ messages: [ChatMessage],
        systemPrompt: String?,
        model: String,
        apiKey: String
    ) async throws -> ChatMessage {
        let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent?key=\(apiKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var contents: [[String: Any]] = messages.map { msg in
            [
                "role": msg.role == .user ? "user" : "model",
                "parts": [["text": msg.content]]
            ]
        }

        var body: [String: Any] = ["contents": contents]
        if let system = systemPrompt {
            body["systemInstruction"] = ["parts": [["text": system]]]
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, httpResponse) = try await session.data(for: request)
        try validateResponse(httpResponse)

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let candidates = json?["candidates"] as? [[String: Any]]
        let content = candidates?.first?["content"] as? [String: Any]
        let parts = content?["parts"] as? [[String: Any]]
        let text = parts?.first?["text"] as? String ?? ""

        return ChatMessage(role: .assistant, content: text)
    }

    // MARK: - Helpers

    private func validateResponse(_ response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AIError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw AIError.httpError(httpResponse.statusCode)
        }
    }
}

enum AIError: LocalizedError {
    case modelNotFound(String)
    case providerNotConfigured(String)
    case invalidResponse
    case httpError(Int)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .modelNotFound(let id): return "Model not found: \(id)"
        case .providerNotConfigured(let name): return "Provider not configured: \(name)"
        case .invalidResponse: return "Invalid response from server"
        case .httpError(let code): return "HTTP error: \(code)"
        case .networkError(let error): return "Network error: \(error.localizedDescription)"
        }
    }
}
