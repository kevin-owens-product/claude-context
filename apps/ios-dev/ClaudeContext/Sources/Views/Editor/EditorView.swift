import SwiftUI

struct EditorView: View {
    let project: Project
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = EditorViewModel()
    @State private var showAiPanel = false

    var body: some View {
        VStack(spacing: 0) {
            // File tabs
            if !viewModel.openFiles.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 0) {
                        ForEach(viewModel.openFiles, id: \.self) { filePath in
                            FileTab(
                                fileName: URL(fileURLWithPath: filePath).lastPathComponent,
                                isSelected: filePath == viewModel.currentFilePath,
                                onSelect: { viewModel.openFile(filePath) },
                                onClose: { viewModel.closeFile(filePath) }
                            )
                        }
                    }
                }
                .background(Color(.systemGray6))
            }

            // Editor
            HStack(spacing: 0) {
                // Line numbers
                if appState.settings.showLineNumbers {
                    LineNumbersView(
                        lineCount: viewModel.content.components(separatedBy: "\n").count,
                        fontSize: CGFloat(appState.settings.fontSize)
                    )
                }

                // Code editor
                TextEditor(text: $viewModel.content)
                    .font(.system(size: CGFloat(appState.settings.fontSize), design: .monospaced))
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .scrollContentBackground(.hidden)
            }
            .frame(maxHeight: showAiPanel ? .infinity : .infinity)

            // AI Assistant panel
            if showAiPanel {
                AiAssistantPanel(viewModel: viewModel)
                    .frame(height: 300)
                    .transition(.move(edge: .bottom))
            }

            // Status bar
            HStack {
                Text(viewModel.currentLanguage?.displayName ?? "")
                    .font(.caption)
                Spacer()
                Text("Ln \(viewModel.cursorLine), Col \(viewModel.cursorColumn)")
                    .font(.caption)
                Spacer()
                Text(viewModel.isModified ? "Modified" : "Saved")
                    .font(.caption)
                    .fontWeight(viewModel.isModified ? .bold : .regular)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(Color(.systemGray5))
        }
        .navigationTitle(viewModel.currentFileName ?? project.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                if viewModel.isModified {
                    Button(action: { viewModel.saveFile() }) {
                        Image(systemName: "square.and.arrow.down")
                    }
                }
                Button(action: { withAnimation { showAiPanel.toggle() } }) {
                    Image(systemName: "sparkles")
                        .foregroundColor(showAiPanel ? .accentColor : .secondary)
                }
                Button(action: { viewModel.runCurrentFile() }) {
                    Image(systemName: "play.fill")
                }
            }
        }
        .onAppear {
            viewModel.loadProject(project)
        }
    }
}

struct FileTab: View {
    let fileName: String
    let isSelected: Bool
    let onSelect: () -> Void
    let onClose: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text(fileName)
                .font(.caption)
                .lineLimit(1)
            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 8))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(isSelected ? Color(.systemBackground) : Color.clear)
        .onTapGesture(perform: onSelect)
    }
}

struct LineNumbersView: View {
    let lineCount: Int
    let fontSize: CGFloat

    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            ForEach(1...max(lineCount, 1), id: \.self) { line in
                Text("\(line)")
                    .font(.system(size: fontSize, design: .monospaced))
                    .foregroundColor(.secondary.opacity(0.6))
                    .padding(.vertical, 1)
            }
            Spacer()
        }
        .padding(.horizontal, 8)
        .background(Color(.systemGray6).opacity(0.5))
    }
}

// MARK: - Editor ViewModel

@MainActor
class EditorViewModel: ObservableObject {
    @Published var content: String = ""
    @Published var openFiles: [String] = []
    @Published var currentFilePath: String?
    @Published var currentFileName: String?
    @Published var currentLanguage: ProjectLanguage?
    @Published var isModified = false
    @Published var cursorLine = 1
    @Published var cursorColumn = 1

    // AI modes
    @Published var aiMode: AiMode = .agent
    @Published var agentSession = AgentSession()
    @Published var debugSession = DebugSession()
    @Published var planSession = PlanSession()
    @Published var swarmSession = SwarmSession()
    @Published var queueState = PromptQueueState()

    private var originalContent: String = ""

    func loadProject(_ project: Project) {
        currentFileName = project.name
        currentLanguage = project.language
    }

    func openFile(_ path: String) {
        currentFilePath = path
        currentFileName = URL(fileURLWithPath: path).lastPathComponent
        if !openFiles.contains(path) {
            openFiles.append(path)
        }
        loadFileContent(path)
    }

    func closeFile(_ path: String) {
        openFiles.removeAll { $0 == path }
        if currentFilePath == path {
            currentFilePath = openFiles.last
            if let current = currentFilePath {
                loadFileContent(current)
            } else {
                content = ""
                currentFileName = nil
            }
        }
    }

    func saveFile() {
        guard let path = currentFilePath else { return }
        try? content.write(toFile: path, atomically: true, encoding: .utf8)
        originalContent = content
        isModified = false
    }

    func runCurrentFile() {
        // Placeholder for running files
    }

    func setAiMode(_ mode: AiMode) {
        aiMode = mode
    }

    private func loadFileContent(_ path: String) {
        content = (try? String(contentsOfFile: path, encoding: .utf8)) ?? ""
        originalContent = content
        isModified = false
        detectLanguage(path)
    }

    private func detectLanguage(_ path: String) {
        let ext = URL(fileURLWithPath: path).pathExtension
        currentLanguage = ProjectLanguage.allCases.first { $0.fileExtensions.contains(ext) }
    }
}
