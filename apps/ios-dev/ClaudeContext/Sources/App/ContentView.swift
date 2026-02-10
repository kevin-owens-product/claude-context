import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab: AppTab = .projects

    enum AppTab: String, CaseIterable {
        case projects = "Projects"
        case chat = "Chat"
        case terminal = "Terminal"
        case settings = "Settings"

        var iconName: String {
            switch self {
            case .projects: return "folder"
            case .chat: return "bubble.left.and.bubble.right"
            case .terminal: return "terminal"
            case .settings: return "gear"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ProjectsView()
                .tabItem {
                    Label("Projects", systemImage: "folder")
                }
                .tag(AppTab.projects)

            ChatView()
                .tabItem {
                    Label("Chat", systemImage: "bubble.left.and.bubble.right")
                }
                .tag(AppTab.chat)

            TerminalView()
                .tabItem {
                    Label("Terminal", systemImage: "terminal")
                }
                .tag(AppTab.terminal)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(AppTab.settings)
        }
        .tint(.indigo)
    }
}

// MARK: - Projects View

struct ProjectsView: View {
    @EnvironmentObject var appState: AppState
    @State private var showNewProject = false

    var body: some View {
        NavigationStack {
            Group {
                if appState.projects.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "folder.badge.plus")
                            .font(.system(size: 64))
                            .foregroundColor(.secondary)
                        Text("No Projects")
                            .font(.title2)
                            .foregroundColor(.secondary)
                        Text("Create or open a project to start coding")
                            .font(.body)
                            .foregroundColor(.secondary)
                        Button("New Project") {
                            showNewProject = true
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                } else {
                    List {
                        ForEach(appState.projects) { project in
                            NavigationLink(value: project) {
                                ProjectRow(project: project)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Projects")
            .toolbar {
                Button(action: { showNewProject = true }) {
                    Image(systemName: "plus")
                }
            }
            .navigationDestination(for: Project.self) { project in
                EditorView(project: project)
            }
        }
    }
}

struct ProjectRow: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "folder.fill")
                    .foregroundColor(.accentColor)
                Text(project.name)
                    .font(.headline)
            }
            HStack {
                Text(project.language.displayName)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.accentColor.opacity(0.1))
                    .cornerRadius(4)
                if let branch = project.gitBranch {
                    Image(systemName: "arrow.triangle.branch")
                        .font(.caption)
                    Text(branch)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Text(project.lastOpened, style: .relative)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
