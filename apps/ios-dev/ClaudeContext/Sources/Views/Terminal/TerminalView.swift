import SwiftUI

struct TerminalView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = TerminalViewModel()
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Terminal output
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ForEach(viewModel.lines) { line in
                                TerminalLine(line: line)
                                    .id(line.id)
                            }
                        }
                        .padding(8)
                    }
                    .background(Color.black)
                    .onChange(of: viewModel.lines.count) { _ in
                        if let last = viewModel.lines.last {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }

                // Input
                HStack(spacing: 4) {
                    Text(viewModel.prompt)
                        .font(.system(size: 13, design: .monospaced))
                        .foregroundColor(.green)

                    TextField("", text: $viewModel.inputText)
                        .font(.system(size: 13, design: .monospaced))
                        .foregroundColor(.white)
                        .textFieldStyle(.plain)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .focused($isInputFocused)
                        .onSubmit {
                            Task {
                                await viewModel.executeCommand(shell: appState.shellService)
                            }
                        }
                }
                .padding(8)
                .background(Color.black)
            }
            .navigationTitle("Terminal")
            .onAppear {
                isInputFocused = true
            }
        }
    }
}

struct TerminalLine: Identifiable, Equatable {
    let id = UUID()
    let text: String
    let type: LineType

    enum LineType {
        case command, stdout, stderr, prompt
    }

    static func == (lhs: TerminalLine, rhs: TerminalLine) -> Bool {
        lhs.id == rhs.id
    }
}

struct TerminalLineView: View {
    let line: TerminalLine

    var body: some View {
        Text(line.text)
            .font(.system(size: 13, design: .monospaced))
            .foregroundColor(lineColor)
    }

    private var lineColor: Color {
        switch line.type {
        case .command: return .cyan
        case .stdout: return .white
        case .stderr: return .red
        case .prompt: return .green
        }
    }
}

// Use a simpler name to avoid conflicts
private struct TerminalLine_View: View {
    let line: TerminalLine

    var body: some View {
        Text(line.text)
            .font(.system(size: 13, design: .monospaced))
            .foregroundColor({
                switch line.type {
                case .command: return Color.cyan
                case .stdout: return Color.white
                case .stderr: return Color.red
                case .prompt: return Color.green
                }
            }())
    }
}

@ViewBuilder
func TerminalLine(line: TerminalLine) -> some View {
    Text(line.text)
        .font(.system(size: 13, design: .monospaced))
        .foregroundColor({
            switch line.type {
            case .command: return Color.cyan
            case .stdout: return Color.white
            case .stderr: return Color.red
            case .prompt: return Color.green
            }
        }())
}

// MARK: - Terminal ViewModel

@MainActor
class TerminalViewModel: ObservableObject {
    @Published var lines: [TerminalLine] = [
        TerminalLine(text: "ClaudeContext Terminal v2.0.0", type: .stdout),
        TerminalLine(text: "Type 'help' for available commands.", type: .stdout),
        TerminalLine(text: "", type: .stdout)
    ]
    @Published var inputText = ""
    @Published var prompt = "$ "
    @Published var history: [String] = []
    @Published var historyIndex = -1

    private var workingDirectory: String = FileManager.default.currentDirectoryPath

    func executeCommand(shell: ShellService) async {
        let command = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        inputText = ""

        guard !command.isEmpty else { return }

        history.append(command)
        historyIndex = history.count

        lines.append(TerminalLine(text: "\(prompt)\(command)", type: .command))

        // Handle built-in commands
        if command == "clear" {
            lines.removeAll()
            return
        }
        if command == "help" {
            lines.append(contentsOf: [
                TerminalLine(text: "Available commands:", type: .stdout),
                TerminalLine(text: "  clear     - Clear terminal", type: .stdout),
                TerminalLine(text: "  help      - Show this help", type: .stdout),
                TerminalLine(text: "  Any other command will be executed via /bin/sh", type: .stdout),
            ])
            return
        }

        // Handle cd
        if command.hasPrefix("cd ") {
            let dir = String(command.dropFirst(3)).trimmingCharacters(in: .whitespaces)
            let expanded = (dir as NSString).expandingTildeInPath
            if FileManager.default.fileExists(atPath: expanded) {
                workingDirectory = expanded
                prompt = "\(URL(fileURLWithPath: expanded).lastPathComponent)$ "
            } else {
                lines.append(TerminalLine(text: "cd: no such directory: \(dir)", type: .stderr))
            }
            return
        }

        let result = await shell.execute(command, workingDirectory: workingDirectory)

        if !result.stdout.isEmpty {
            for line in result.stdout.components(separatedBy: "\n") {
                lines.append(TerminalLine(text: line, type: .stdout))
            }
        }
        if !result.stderr.isEmpty {
            for line in result.stderr.components(separatedBy: "\n") {
                lines.append(TerminalLine(text: line, type: .stderr))
            }
        }
    }
}
