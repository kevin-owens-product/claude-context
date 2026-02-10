import SwiftUI

@main
struct ClaudeContextApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(appState.multiModelService)
                .environmentObject(appState.modelRouter)
                .environmentObject(appState.billingService)
                .environmentObject(appState.sessionManager)
                .environmentObject(appState.contextManager)
                .environmentObject(appState.designManager)
                .preferredColorScheme(appState.settings.darkTheme ? .dark : .light)
                .task {
                    await appState.initialize()
                }
        }
    }
}

@MainActor
class AppState: ObservableObject {
    @Published var settings = AppSettings()
    @Published var projects: [Project] = []
    @Published var selectedProject: Project?

    let multiModelService = MultiModelService()
    let modelRouter: ModelRouter
    let billingService = BillingService()
    let shellService = ShellService()
    let sessionManager = SessionManager()
    let contextManager = ContextManager()
    let designManager = DesignManager()

    init() {
        modelRouter = ModelRouter(multiModelService: multiModelService)
        loadSettings()
    }

    func initialize() async {
        await billingService.initialize()
        await loadGitConfig()
    }

    private func loadSettings() {
        if let data = UserDefaults.standard.data(forKey: "app_settings"),
           let decoded = try? JSONDecoder().decode(AppSettings.self, from: data) {
            settings = decoded
        }

        // Configure providers from saved settings
        for (provider, key) in settings.providerKeys {
            if settings.enabledProviders.contains(provider) {
                multiModelService.configureProvider(provider, apiKey: key)
            }
        }

        multiModelService.setRoutingConfig(settings.routingConfig)
    }

    func saveSettings() {
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: "app_settings")
        }
    }

    private func loadGitConfig() async {
        if settings.gitUserName.isEmpty {
            settings.gitUserName = await shellService.getGitConfig("user.name")
        }
        if settings.gitUserEmail.isEmpty {
            settings.gitUserEmail = await shellService.getGitConfig("user.email")
        }
    }
}

struct AppSettings: Codable {
    var providerKeys: [ModelProvider: String] = [:]
    var enabledProviders: Set<ModelProvider> = []
    var routingConfig = ModelRoutingConfig()
    var selectedModel: String = "claude-sonnet-4-20250514"
    var gitUserName: String = ""
    var gitUserEmail: String = ""
    var darkTheme: Bool = true
    var showLineNumbers: Bool = true
    var wordWrap: Bool = false
    var fontSize: Int = 13
}
