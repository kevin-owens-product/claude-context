import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var appState: AppState
    @State private var currentPage = 0
    @State private var apiProvider = "anthropic"
    @State private var apiKey = ""
    var onComplete: () -> Void

    private let pages: [OnboardingPage] = [
        OnboardingPage(
            icon: "chevron.left.forwardslash.chevron.right",
            title: "Code Anywhere",
            description: "A full development environment in your pocket. Edit code, run builds, and manage projects directly from your phone.",
            color: .indigo
        ),
        OnboardingPage(
            icon: "brain",
            title: "AI-Powered Modes",
            description: "Agent, Debug, Plan, Swarm, and Queue modes. Let AI handle the heavy lifting while you guide the direction.",
            color: .green
        ),
        OnboardingPage(
            icon: "arrow.triangle.branch",
            title: "Multi-Model Support",
            description: "Route tasks to the best AI model. Use Claude, GPT, Gemini, Mistral, or local models - all in one app.",
            color: .orange
        ),
        OnboardingPage(
            icon: "key",
            title: "Set Up Your API Key",
            description: "Enter at least one API key to get started. You can add more providers later in Settings.",
            color: .pink,
            isApiKeyStep: true
        )
    ]

    var body: some View {
        VStack {
            // Skip button
            HStack {
                Spacer()
                if currentPage < pages.count - 1 {
                    Button("Skip") {
                        withAnimation { currentPage = pages.count - 1 }
                    }
                    .padding(.trailing)
                }
            }
            .padding(.top)

            TabView(selection: $currentPage) {
                ForEach(0..<pages.count, id: \.self) { index in
                    pageView(pages[index])
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))

            // Navigation buttons
            HStack(spacing: 12) {
                if currentPage > 0 {
                    Button("Back") {
                        withAnimation { currentPage -= 1 }
                    }
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
                }

                Button(action: {
                    if currentPage < pages.count - 1 {
                        withAnimation { currentPage += 1 }
                    } else {
                        if !apiKey.isEmpty {
                            let provider = ModelProvider(rawValue: apiProvider) ?? .anthropic
                            appState.settings.providerKeys[provider] = apiKey
                            appState.settings.enabledProviders.insert(provider)
                            appState.multiModelService.configureProvider(provider, apiKey: apiKey)
                            appState.saveSettings()
                        }
                        onComplete()
                    }
                }) {
                    Text(currentPage < pages.count - 1 ? "Next" : (apiKey.isEmpty ? "Skip for Now" : "Get Started"))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 32)
        }
    }

    @ViewBuilder
    private func pageView(_ page: OnboardingPage) -> some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: page.icon)
                .font(.system(size: 50))
                .foregroundColor(page.color)
                .padding(24)
                .background(page.color.opacity(0.15))
                .clipShape(Circle())

            Text(page.title)
                .font(.title)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            Text(page.description)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)

            if page.isApiKeyStep {
                VStack(spacing: 12) {
                    Picker("Provider", selection: $apiProvider) {
                        Text("Claude").tag("anthropic")
                        Text("OpenAI").tag("openai")
                        Text("Gemini").tag("google")
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    SecureField("API Key (sk-...)", text: $apiKey)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)

                    Text("Your key is stored locally and encrypted. Never sent to our servers.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .padding()
    }
}

private struct OnboardingPage {
    let icon: String
    let title: String
    let description: String
    let color: Color
    var isApiKeyStep: Bool = false
}
