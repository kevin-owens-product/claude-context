import Foundation
import Combine

/// Intelligent model router that selects the best model for each request.
@MainActor
class ModelRouter: ObservableObject {
    @Published var routingLog: [RoutingDecision] = []

    private let multiModelService: MultiModelService

    init(multiModelService: MultiModelService) {
        self.multiModelService = multiModelService
    }

    struct RoutingDecision: Identifiable {
        let id = UUID()
        let prompt: String
        let selectedModel: String
        let reason: String
        let category: TaskCategory
        let timestamp: Date = Date()
    }

    enum TaskCategory: String, CaseIterable {
        case simpleQuestion = "Simple Question"
        case codeGeneration = "Code Generation"
        case codeEditing = "Code Editing"
        case debugging = "Debugging"
        case codeReview = "Code Review"
        case planning = "Planning"
        case complexReasoning = "Complex Reasoning"
        case refactoring = "Refactoring"
        case testGeneration = "Test Generation"
        case documentation = "Documentation"
        case general = "General"
    }

    func route(prompt: String, context: RoutingContext = RoutingContext()) -> String {
        let config = multiModelService.routingConfig
        let available = multiModelService.getAvailableModels()

        if available.isEmpty || !config.autoRoute {
            return config.primaryModel
        }

        let category = classifyByHeuristic(prompt: prompt, context: context)
        let selectedModel = selectModel(category: category, config: config, available: available)

        let decision = RoutingDecision(
            prompt: String(prompt.prefix(100)),
            selectedModel: selectedModel,
            reason: "Category: \(category.rawValue)",
            category: category
        )
        routingLog = (routingLog + [decision]).suffix(50)

        return selectedModel
    }

    func routeAndSend(
        messages: [ChatMessage],
        systemPrompt: String? = nil,
        context: RoutingContext = RoutingContext()
    ) async throws -> ChatMessage {
        let lastUserMessage = messages.last { $0.role == .user }?.content ?? ""
        let modelId = route(prompt: lastUserMessage, context: context)
        return try await multiModelService.sendMessage(messages, systemPrompt: systemPrompt, modelId: modelId)
    }

    private func classifyByHeuristic(prompt: String, context: RoutingContext) -> TaskCategory {
        let lower = prompt.lowercased()

        // Context-based overrides
        if let mode = context.activeMode {
            switch mode {
            case .debug: return .debugging
            case .plan: return .planning
            default: break
            }
        }

        // Pattern matching
        let simplePatterns = ["what ", "who ", "when ", "where ", "how ", "why ", "explain ", "describe ", "define "]
        if lower.count < 100 && simplePatterns.contains(where: { lower.hasPrefix($0) }) &&
            !lower.contains("code") && !lower.contains("implement") {
            return .simpleQuestion
        }

        if lower.contains("create") || lower.contains("implement") || lower.contains("build") ||
            lower.contains("write a function") || lower.contains("generate code") {
            return .codeGeneration
        }

        if lower.contains("edit") || lower.contains("modify") || lower.contains("change") ||
            lower.contains("update") || lower.contains("replace") {
            return .codeEditing
        }

        if lower.contains("bug") || lower.contains("fix") || lower.contains("error") ||
            lower.contains("crash") || lower.contains("debug") || lower.contains("not working") {
            return .debugging
        }

        if lower.contains("review") || lower.contains("audit") || lower.contains("security") {
            return .codeReview
        }

        if lower.contains("plan") || lower.contains("architect") || lower.contains("design") ||
            lower.contains("strategy") {
            return .planning
        }

        if lower.contains("analyze") || lower.contains("optimize") || lower.contains("compare") ||
            lower.contains("trade-off") || lower.count > 500 {
            return .complexReasoning
        }

        if lower.contains("refactor") || lower.contains("clean up") || lower.contains("simplify") {
            return .refactoring
        }

        if lower.contains("test") || lower.contains("spec") || lower.contains("coverage") {
            return .testGeneration
        }

        if lower.contains("document") || lower.contains("readme") || lower.contains("comment") {
            return .documentation
        }

        return .general
    }

    private func selectModel(category: TaskCategory, config: ModelRoutingConfig, available: [AiModel]) -> String {
        let specificModel: String? = {
            switch category {
            case .simpleQuestion, .documentation: return config.fastModel
            case .codeGeneration, .codeEditing, .refactoring, .testGeneration: return config.codeModel
            case .complexReasoning, .planning: return config.reasoningModel
            default: return nil
            }
        }()

        if let specific = specificModel, available.contains(where: { $0.id == specific }) {
            return specific
        }

        let targetTier: ModelTier = {
            switch category {
            case .simpleQuestion, .documentation: return .fast
            case .codeGeneration, .codeEditing, .debugging, .refactoring,
                 .testGeneration, .codeReview, .general: return .standard
            case .complexReasoning, .planning: return .premium
            }
        }()

        if let tierMatch = available.first(where: { $0.tier == targetTier }) {
            return tierMatch.id
        }

        return config.primaryModel
    }
}

struct RoutingContext {
    var activeMode: AiMode?
    var currentFile: String?
    var projectLanguage: ProjectLanguage?
    var conversationLength: Int = 0
}
