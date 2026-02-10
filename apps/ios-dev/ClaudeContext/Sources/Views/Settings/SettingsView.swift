import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var billingService: BillingService

    var body: some View {
        NavigationStack {
            List {
                // AI Providers
                Section("AI Providers") {
                    ForEach(ModelProvider.allCases) { provider in
                        if provider != .local && provider != .custom {
                            ProviderRow(
                                provider: provider,
                                apiKey: appState.settings.providerKeys[provider] ?? "",
                                isEnabled: appState.settings.enabledProviders.contains(provider),
                                onKeyChanged: { key in
                                    appState.settings.providerKeys[provider] = key
                                    appState.saveSettings()
                                    if appState.settings.enabledProviders.contains(provider) {
                                        appState.multiModelService.configureProvider(provider, apiKey: key)
                                    }
                                },
                                onToggle: { enabled in
                                    if enabled {
                                        appState.settings.enabledProviders.insert(provider)
                                    } else {
                                        appState.settings.enabledProviders.remove(provider)
                                    }
                                    appState.saveSettings()
                                    if enabled, let key = appState.settings.providerKeys[provider], !key.isEmpty {
                                        appState.multiModelService.configureProvider(provider, apiKey: key)
                                    }
                                }
                            )
                        }
                    }
                }

                // Model Routing
                Section("Model Routing") {
                    Toggle("Auto-Route", isOn: Binding(
                        get: { appState.settings.routingConfig.autoRoute },
                        set: { newValue in
                            appState.settings.routingConfig.autoRoute = newValue
                            appState.multiModelService.setRoutingConfig(appState.settings.routingConfig)
                            appState.saveSettings()
                        }
                    ))

                    ModelPicker(
                        label: "Primary Model",
                        selection: $appState.settings.routingConfig.primaryModel,
                        models: ModelCatalog.models
                    )
                    .onChange(of: appState.settings.routingConfig.primaryModel) { _ in
                        appState.multiModelService.setRoutingConfig(appState.settings.routingConfig)
                        appState.saveSettings()
                    }

                    OptionalModelPicker(
                        label: "Fast Model",
                        selection: $appState.settings.routingConfig.fastModel,
                        models: ModelCatalog.byTier(.fast)
                    )

                    OptionalModelPicker(
                        label: "Code Model",
                        selection: $appState.settings.routingConfig.codeModel,
                        models: ModelCatalog.models
                    )

                    OptionalModelPicker(
                        label: "Reasoning Model",
                        selection: $appState.settings.routingConfig.reasoningModel,
                        models: ModelCatalog.byTier(.premium)
                    )
                }

                // Editor
                Section("Editor") {
                    Toggle("Dark Theme", isOn: $appState.settings.darkTheme)
                        .onChange(of: appState.settings.darkTheme) { _ in appState.saveSettings() }

                    Toggle("Line Numbers", isOn: $appState.settings.showLineNumbers)
                        .onChange(of: appState.settings.showLineNumbers) { _ in appState.saveSettings() }

                    Toggle("Word Wrap", isOn: $appState.settings.wordWrap)
                        .onChange(of: appState.settings.wordWrap) { _ in appState.saveSettings() }

                    Stepper("Font Size: \(appState.settings.fontSize)", value: $appState.settings.fontSize, in: 8...24)
                        .onChange(of: appState.settings.fontSize) { _ in appState.saveSettings() }
                }

                // Git
                Section("Git Configuration") {
                    HStack {
                        Text("Name")
                            .foregroundColor(.secondary)
                        TextField("Git user name", text: $appState.settings.gitUserName)
                            .multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("Email")
                            .foregroundColor(.secondary)
                        TextField("Git user email", text: $appState.settings.gitUserEmail)
                            .multilineTextAlignment(.trailing)
                            .keyboardType(.emailAddress)
                    }
                }

                // Subscription
                Section("Subscription") {
                    if billingService.subscriptionState.isActive {
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(.green)
                            VStack(alignment: .leading) {
                                Text("Active - \(billingService.subscriptionState.plan.capitalized)")
                                    .font(.headline)
                                if !billingService.subscriptionState.expiryDate.isEmpty {
                                    Text("Renews: \(billingService.subscriptionState.expiryDate)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }

                        Button("Manage Subscription") {
                            Task { await billingService.openManagementPortal() }
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Claude Context Pro")
                                .font(.headline)
                            Text("Unlock unlimited AI sessions, all providers, and priority support")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        ForEach(billingService.availablePlans) { plan in
                            Button(action: {
                                Task { await billingService.purchase(plan: plan) }
                            }) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(plan.name)
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                        if let savings = plan.savings {
                                            Text(savings)
                                                .font(.caption2)
                                                .foregroundColor(.green)
                                        }
                                    }
                                    Spacer()
                                    Text(plan.price)
                                        .font(.headline)
                                        .foregroundColor(.accentColor)
                                }
                            }
                        }

                        Button("Restore Purchases") {
                            Task { await billingService.restorePurchases() }
                        }
                        .font(.caption)
                    }
                }

                // About
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("2.0.0")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Build")
                        Spacer()
                        Text("2026.02")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

// MARK: - Provider Row

struct ProviderRow: View {
    let provider: ModelProvider
    @State var apiKey: String
    let isEnabled: Bool
    let onKeyChanged: (String) -> Void
    let onToggle: (Bool) -> Void
    @State private var showKey = false

    var body: some View {
        DisclosureGroup {
            VStack(spacing: 8) {
                Toggle("Enabled", isOn: Binding(
                    get: { isEnabled },
                    set: { onToggle($0) }
                ))

                HStack {
                    if showKey {
                        TextField("API Key", text: $apiKey)
                            .textFieldStyle(.roundedBorder)
                            .font(.system(size: 12, design: .monospaced))
                    } else {
                        SecureField("API Key", text: $apiKey)
                            .textFieldStyle(.roundedBorder)
                            .font(.system(size: 12, design: .monospaced))
                    }
                    Button(action: { showKey.toggle() }) {
                        Image(systemName: showKey ? "eye.slash" : "eye")
                            .font(.caption)
                    }
                }
                .onChange(of: apiKey) { newValue in
                    onKeyChanged(newValue)
                }

                // Available models
                let models = ModelCatalog.byProvider(provider)
                if !models.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Available Models:")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        ForEach(models, id: \.id) { model in
                            HStack {
                                Text(model.displayName)
                                    .font(.caption)
                                Spacer()
                                Text(model.costEstimate)
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
        } label: {
            HStack {
                Circle()
                    .fill(Color(hex: provider.iconColor))
                    .frame(width: 10, height: 10)
                Text(provider.displayName)
                    .font(.subheadline)
                if isEnabled && !apiKey.isEmpty {
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.caption)
                }
            }
        }
    }
}

// MARK: - Model Pickers

struct ModelPicker: View {
    let label: String
    @Binding var selection: String
    let models: [AiModel]

    var body: some View {
        Picker(label, selection: $selection) {
            ForEach(models, id: \.id) { model in
                Text("\(model.displayName) - \(model.costEstimate)")
                    .font(.caption)
                    .tag(model.id)
            }
        }
    }
}

struct OptionalModelPicker: View {
    let label: String
    @Binding var selection: String?
    let models: [AiModel]

    var body: some View {
        Picker(label, selection: Binding(
            get: { selection ?? "" },
            set: { selection = $0.isEmpty ? nil : $0 }
        )) {
            Text("Auto").tag("")
            ForEach(models, id: \.id) { model in
                Text(model.displayName).tag(model.id)
            }
        }
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
