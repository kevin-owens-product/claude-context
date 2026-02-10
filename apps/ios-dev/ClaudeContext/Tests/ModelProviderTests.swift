import XCTest
@testable import ClaudeContext

final class ModelProviderTests: XCTestCase {

    // MARK: - ModelProvider

    func testAllProvidersHaveDisplayNames() {
        for provider in ModelProvider.allCases {
            XCTAssertFalse(provider.displayName.isEmpty)
        }
    }

    func testAllProvidersHaveBaseURLs() {
        for provider in ModelProvider.allCases {
            // Custom has empty base URL by design
            if provider != .custom {
                XCTAssertFalse(provider.baseURL.isEmpty, "\(provider) should have a base URL")
            }
        }
    }

    func testProviderCount() {
        XCTAssertEqual(ModelProvider.allCases.count, 8)
    }

    // MARK: - Model Catalog

    func testCatalogContainsExpectedProviders() {
        let providers = Set(ModelCatalog.models.map(\.provider))
        XCTAssertTrue(providers.contains(.anthropic))
        XCTAssertTrue(providers.contains(.openai))
        XCTAssertTrue(providers.contains(.google))
        XCTAssertTrue(providers.contains(.mistral))
        XCTAssertTrue(providers.contains(.groq))
    }

    func testCatalogByProvider() {
        let anthropic = ModelCatalog.byProvider(.anthropic)
        XCTAssertFalse(anthropic.isEmpty)
        XCTAssertTrue(anthropic.allSatisfy { $0.provider == .anthropic })
    }

    func testCatalogById() {
        let model = ModelCatalog.byId("claude-sonnet-4-20250514")
        XCTAssertNotNil(model)
        XCTAssertEqual(model?.displayName, "Claude Sonnet 4")
    }

    func testCatalogByIdNotFound() {
        let model = ModelCatalog.byId("nonexistent")
        XCTAssertNil(model)
    }

    func testCatalogByTier() {
        let fast = ModelCatalog.byTier(.fast)
        XCTAssertFalse(fast.isEmpty)
        XCTAssertTrue(fast.allSatisfy { $0.tier == .fast })

        let premium = ModelCatalog.byTier(.premium)
        XCTAssertFalse(premium.isEmpty)
        XCTAssertTrue(premium.allSatisfy { $0.tier == .premium })
    }

    // MARK: - Cost Estimate

    func testCostEstimateFormatting() {
        let model = ModelCatalog.byId("claude-sonnet-4-20250514")!
        XCTAssertTrue(model.costEstimate.contains("$"))
        XCTAssertTrue(model.costEstimate.contains("/1k"))
    }

    func testLocalModelFree() {
        let model = AiModel(
            id: "local-test",
            provider: .local,
            displayName: "Local",
            contextWindow: 4096,
            isLocal: true
        )
        XCTAssertEqual(model.costEstimate, "Free (local)")
    }

    // MARK: - Routing Config

    func testDefaultRoutingConfig() {
        let config = ModelRoutingConfig()
        XCTAssertEqual(config.primaryModel, "claude-sonnet-4-20250514")
        XCTAssertTrue(config.autoRoute)
        XCTAssertNil(config.fastModel)
        XCTAssertNil(config.codeModel)
        XCTAssertNil(config.reasoningModel)
    }
}

final class ModelRouterTests: XCTestCase {

    // MARK: - Heuristic Classification

    func testSimpleQuestion() {
        let category = classify("What is a binary tree?")
        XCTAssertEqual(category, .simpleQuestion)
    }

    func testCodeGeneration() {
        let category = classify("Create a REST API endpoint")
        XCTAssertEqual(category, .codeGeneration)
    }

    func testDebugging() {
        let category = classify("Fix the crash in the login flow")
        XCTAssertEqual(category, .debugging)
    }

    func testPlanning() {
        let category = classify("Design the architecture for microservices")
        XCTAssertEqual(category, .planning)
    }

    func testRefactoring() {
        let category = classify("Refactor the database layer")
        XCTAssertEqual(category, .refactoring)
    }

    func testCodeReview() {
        let category = classify("Review this code for security issues")
        XCTAssertEqual(category, .codeReview)
    }

    func testTestGeneration() {
        let category = classify("Write tests for the payment service")
        XCTAssertEqual(category, .testGeneration)
    }

    func testDocumentation() {
        let category = classify("Add documentation to the API")
        XCTAssertEqual(category, .documentation)
    }

    func testGeneral() {
        let category = classify("hello")
        XCTAssertEqual(category, .general)
    }

    func testComplexReasoningLongPrompt() {
        let category = classify(String(repeating: "a", count: 501))
        XCTAssertEqual(category, .complexReasoning)
    }

    // MARK: - Context Overrides

    func testDebugModeOverride() {
        let category = classify("What is this?", context: RoutingContext(activeMode: .debug))
        XCTAssertEqual(category, .debugging)
    }

    func testPlanModeOverride() {
        let category = classify("Fix a bug", context: RoutingContext(activeMode: .plan))
        XCTAssertEqual(category, .planning)
    }

    // MARK: - Tier Mapping

    func testSimpleQuestionFastTier() {
        XCTAssertEqual(tierFor(.simpleQuestion), ModelTier.fast)
    }

    func testCodeGenerationStandardTier() {
        XCTAssertEqual(tierFor(.codeGeneration), ModelTier.standard)
    }

    func testComplexReasoningPremiumTier() {
        XCTAssertEqual(tierFor(.complexReasoning), ModelTier.premium)
    }

    // MARK: - Helpers

    private func classify(_ prompt: String, context: RoutingContext = RoutingContext()) -> ModelRouter.TaskCategory {
        let lower = prompt.lowercased()

        if let mode = context.activeMode {
            switch mode {
            case .debug: return .debugging
            case .plan: return .planning
            default: break
            }
        }

        let simplePatterns = ["what ", "who ", "when ", "where ", "how ", "why ", "explain ", "describe ", "define "]
        if lower.count < 100 && simplePatterns.contains(where: { lower.hasPrefix($0) }) &&
            !lower.contains("code") && !lower.contains("implement") {
            return .simpleQuestion
        }

        if lower.contains("create") || lower.contains("implement") || lower.contains("build") ||
            lower.contains("write a function") { return .codeGeneration }
        if lower.contains("edit") || lower.contains("modify") || lower.contains("change") ||
            lower.contains("update") || lower.contains("replace") { return .codeEditing }
        if lower.contains("bug") || lower.contains("fix") || lower.contains("error") ||
            lower.contains("crash") || lower.contains("debug") { return .debugging }
        if lower.contains("review") || lower.contains("audit") || lower.contains("security") { return .codeReview }
        if lower.contains("plan") || lower.contains("architect") || lower.contains("design") { return .planning }
        if lower.contains("analyze") || lower.contains("optimize") || lower.contains("trade-off") ||
            lower.count > 500 { return .complexReasoning }
        if lower.contains("refactor") || lower.contains("clean up") { return .refactoring }
        if lower.contains("test") || lower.contains("spec") { return .testGeneration }
        if lower.contains("document") || lower.contains("readme") { return .documentation }

        return .general
    }

    private func tierFor(_ category: ModelRouter.TaskCategory) -> ModelTier {
        switch category {
        case .simpleQuestion, .documentation: return .fast
        case .codeGeneration, .codeEditing, .debugging, .refactoring,
             .testGeneration, .codeReview, .general: return .standard
        case .complexReasoning, .planning: return .premium
        }
    }
}

final class AiModesTests: XCTestCase {

    func testAiModeCount() {
        XCTAssertEqual(AiMode.allCases.count, 5)
    }

    func testAiModeDisplayNames() {
        XCTAssertEqual(AiMode.agent.displayName, "Agent")
        XCTAssertEqual(AiMode.debug.displayName, "Debug")
        XCTAssertEqual(AiMode.plan.displayName, "Plan")
        XCTAssertEqual(AiMode.swarm.displayName, "Swarm")
        XCTAssertEqual(AiMode.queue.displayName, "Queue")
    }

    func testQueuePriorityOrdering() {
        XCTAssertTrue(QueuePriority.low < QueuePriority.normal)
        XCTAssertTrue(QueuePriority.normal < QueuePriority.high)
        XCTAssertTrue(QueuePriority.high < QueuePriority.urgent)
    }

    func testSwarmStrategies() {
        XCTAssertEqual(SwarmStrategy.allCases.count, 4)
    }

    func testQueueExecutionModes() {
        XCTAssertEqual(QueueExecutionMode.allCases.count, 3)
    }
}
