import SwiftUI

struct AiAssistantPanel: View {
    @ObservedObject var viewModel: EditorViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Mode switcher
            ModeSwitcher(currentMode: viewModel.aiMode, onModeSelected: viewModel.setAiMode)
                .padding(.horizontal, 8)
                .padding(.top, 8)

            Divider()
                .padding(.top, 4)

            // Mode-specific content
            ScrollView {
                Group {
                    switch viewModel.aiMode {
                    case .agent:
                        AgentPanel(session: viewModel.agentSession)
                    case .debug:
                        DebugPanel(session: viewModel.debugSession)
                    case .plan:
                        PlanPanel(session: viewModel.planSession)
                    case .swarm:
                        SwarmPanel(session: viewModel.swarmSession)
                    case .queue:
                        QueuePanel(state: viewModel.queueState)
                    }
                }
                .padding()
            }
        }
        .background(Color(.systemGray6))
    }
}

// MARK: - Mode Switcher

struct ModeSwitcher: View {
    let currentMode: AiMode
    let onModeSelected: (AiMode) -> Void

    var body: some View {
        HStack(spacing: 4) {
            ForEach(AiMode.allCases) { mode in
                ModeChip(
                    mode: mode,
                    isSelected: mode == currentMode,
                    onSelect: { onModeSelected(mode) }
                )
            }
        }
    }
}

struct ModeChip: View {
    let mode: AiMode
    let isSelected: Bool
    let onSelect: () -> Void

    private var color: Color {
        switch mode {
        case .agent: return .indigo
        case .debug: return .red
        case .plan: return .green
        case .swarm: return .orange
        case .queue: return .purple
        }
    }

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 4) {
                Image(systemName: mode.iconName)
                    .font(.system(size: 12))
                Text(mode.displayName)
                    .font(.caption2)
                    .fontWeight(isSelected ? .bold : .regular)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(isSelected ? color.opacity(0.15) : Color.clear)
            .foregroundColor(isSelected ? color : .secondary)
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Agent Panel

struct AgentPanel: View {
    let session: AgentSession

    @State private var taskInput = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Agent Mode")
                .font(.headline)
            Text("Autonomous task execution with approval gates")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                TextField("Describe a task...", text: $taskInput)
                    .textFieldStyle(.roundedBorder)
                Button("Start") {}
                    .buttonStyle(.borderedProminent)
                    .tint(.indigo)
                    .disabled(taskInput.isEmpty)
            }

            if !session.steps.isEmpty {
                ForEach(session.steps) { step in
                    HStack {
                        Image(systemName: step.status == .completed ? "checkmark.circle.fill" :
                                step.status == .running ? "arrow.clockwise" : "circle")
                            .foregroundColor(step.status == .completed ? .green :
                                step.status == .running ? .blue : .secondary)
                        Text(step.description)
                            .font(.caption)
                    }
                }
            }
        }
    }
}

// MARK: - Debug Panel

struct DebugPanel: View {
    let session: DebugSession

    @State private var errorInput = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Debug Mode")
                .font(.headline)
            Text("Systematic bug diagnosis and fixing")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                TextField("Describe the bug...", text: $errorInput)
                    .textFieldStyle(.roundedBorder)
                Button("Analyze") {}
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                    .disabled(errorInput.isEmpty)
            }

            if !session.hypotheses.isEmpty {
                Text("Hypotheses")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                ForEach(session.hypotheses) { hypothesis in
                    HStack {
                        Text(hypothesis.description)
                            .font(.caption)
                        Spacer()
                        Text("\(Int(hypothesis.confidence * 100))%")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(8)
                    .background(Color(.systemGray5))
                    .cornerRadius(6)
                }
            }
        }
    }
}

// MARK: - Plan Panel

struct PlanPanel: View {
    let session: PlanSession

    @State private var goalInput = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Plan Mode")
                .font(.headline)
            Text("Architecture planning and step-by-step execution")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                TextField("What do you want to build?", text: $goalInput)
                    .textFieldStyle(.roundedBorder)
                Button("Plan") {}
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .disabled(goalInput.isEmpty)
            }

            if let plan = session.plan {
                Text(plan.summary)
                    .font(.caption)
                    .padding(8)
                    .background(Color(.systemGray5))
                    .cornerRadius(6)

                ForEach(plan.phases) { phase in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(phase.name)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        ForEach(phase.steps) { step in
                            HStack {
                                Image(systemName: step.status == .completed ? "checkmark.circle.fill" : "circle")
                                    .font(.caption)
                                    .foregroundColor(step.status == .completed ? .green : .secondary)
                                Text(step.description)
                                    .font(.caption)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Swarm Panel

struct SwarmPanel: View {
    let session: SwarmSession

    @State private var goalInput = ""
    @State private var selectedStrategy: SwarmStrategy = .divideAndConquer

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Swarm Mode")
                .font(.headline)
            Text("Multi-agent collaboration for complex tasks")
                .font(.caption)
                .foregroundColor(.secondary)

            Picker("Strategy", selection: $selectedStrategy) {
                ForEach(SwarmStrategy.allCases, id: \.self) { strategy in
                    Text(strategy.rawValue).tag(strategy)
                }
            }
            .pickerStyle(.segmented)

            HStack {
                TextField("Describe the goal...", text: $goalInput)
                    .textFieldStyle(.roundedBorder)
                Button("Launch") {}
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .disabled(goalInput.isEmpty)
            }

            if !session.workers.isEmpty {
                Text("Workers")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                ForEach(session.workers) { worker in
                    HStack {
                        Circle()
                            .fill(workerStatusColor(worker.status))
                            .frame(width: 8, height: 8)
                        VStack(alignment: .leading) {
                            Text(worker.name)
                                .font(.caption)
                                .fontWeight(.semibold)
                            Text(worker.role)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Text(worker.status.rawValue)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(6)
                    .background(Color(.systemGray5))
                    .cornerRadius(6)
                }
            }
        }
    }

    private func workerStatusColor(_ status: SwarmWorkerStatus) -> Color {
        switch status {
        case .idle: return .secondary
        case .working: return .blue
        case .waiting: return .yellow
        case .completed: return .green
        case .failed: return .red
        }
    }
}

// MARK: - Queue Panel

struct QueuePanel: View {
    let state: PromptQueueState

    @State private var promptInput = ""
    @State private var selectedPriority: QueuePriority = .normal

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Prompt Queue")
                .font(.headline)
            Text("Queue and batch-process multiple prompts")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                Picker("Priority", selection: $selectedPriority) {
                    ForEach(QueuePriority.allCases, id: \.self) { priority in
                        Text(priority.displayName).tag(priority)
                    }
                }
                .frame(width: 100)
            }

            HStack {
                TextField("Add a prompt...", text: $promptInput)
                    .textFieldStyle(.roundedBorder)
                Button("Enqueue") {}
                    .buttonStyle(.borderedProminent)
                    .tint(.purple)
                    .disabled(promptInput.isEmpty)
            }

            HStack {
                Text("Queue: \(state.items.count) items")
                    .font(.caption)
                Spacer()
                Text("Done: \(state.completedCount)")
                    .font(.caption)
                    .foregroundColor(.green)
                Text("Failed: \(state.failedCount)")
                    .font(.caption)
                    .foregroundColor(.red)
            }

            if !state.items.isEmpty {
                ForEach(state.items) { item in
                    HStack {
                        Image(systemName: queueItemIcon(item.status))
                            .foregroundColor(queueItemColor(item.status))
                            .font(.caption)
                        Text(item.prompt)
                            .font(.caption)
                            .lineLimit(1)
                        Spacer()
                        Text(item.priority.displayName)
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.purple.opacity(0.1))
                            .cornerRadius(4)
                    }
                    .padding(6)
                    .background(Color(.systemGray5))
                    .cornerRadius(6)
                }
            }
        }
    }

    private func queueItemIcon(_ status: QueuedPromptStatus) -> String {
        switch status {
        case .pending: return "clock"
        case .running: return "arrow.clockwise"
        case .completed: return "checkmark.circle.fill"
        case .failed: return "xmark.circle.fill"
        case .cancelled: return "minus.circle"
        }
    }

    private func queueItemColor(_ status: QueuedPromptStatus) -> Color {
        switch status {
        case .pending: return .secondary
        case .running: return .blue
        case .completed: return .green
        case .failed: return .red
        case .cancelled: return .orange
        }
    }
}
