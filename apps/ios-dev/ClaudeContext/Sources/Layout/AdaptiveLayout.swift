import SwiftUI

// MARK: - Device Layout Classification

enum DeviceLayout: Equatable {
    case compactPhone      // iPhone portrait
    case regularPhone      // iPhone landscape / iPhone Pro Max
    case tablet            // iPad full screen
    case tabletSplitSmall  // iPad Split View (compact side)
    case tabletSplitLarge  // iPad Split View (regular side)
    case stageManager      // iPad Stage Manager (any floating window)
}

// MARK: - Adaptive Layout Container

struct AdaptiveLayoutContainer<EditorContent: View, AIPanelContent: View, SidebarContent: View>: View {
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass

    let editorContent: EditorContent
    let aiPanelContent: AIPanelContent
    let sidebarContent: SidebarContent

    @State private var showAIPanel = true
    @State private var sidebarVisible = true
    @State private var aiPanelWidth: CGFloat = 360

    init(
        @ViewBuilder editor: () -> EditorContent,
        @ViewBuilder aiPanel: () -> AIPanelContent,
        @ViewBuilder sidebar: () -> SidebarContent
    ) {
        self.editorContent = editor()
        self.aiPanelContent = aiPanel()
        self.sidebarContent = sidebar()
    }

    var currentLayout: DeviceLayout {
        switch (horizontalSizeClass, verticalSizeClass) {
        case (.compact, .regular):
            return .compactPhone
        case (.compact, .compact):
            return .regularPhone
        case (.regular, .regular):
            return .tablet
        case (.regular, .compact):
            return .stageManager
        default:
            return .compactPhone
        }
    }

    var body: some View {
        GeometryReader { geometry in
            switch currentLayout {
            case .compactPhone:
                compactPhoneLayout(geometry: geometry)
            case .regularPhone:
                regularPhoneLayout(geometry: geometry)
            case .tablet, .stageManager:
                tabletLayout(geometry: geometry)
            case .tabletSplitSmall:
                splitSmallLayout(geometry: geometry)
            case .tabletSplitLarge:
                splitLargeLayout(geometry: geometry)
            }
        }
    }

    // MARK: - Compact Phone Layout (single column + sheet)

    @ViewBuilder
    private func compactPhoneLayout(geometry: GeometryProxy) -> some View {
        ZStack(alignment: .bottom) {
            editorContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            if showAIPanel {
                VStack(spacing: 0) {
                    // Drag handle
                    Capsule()
                        .fill(Color.secondary.opacity(0.5))
                        .frame(width: 36, height: 5)
                        .padding(.vertical, 8)

                    aiPanelContent
                }
                .frame(height: geometry.size.height * 0.55)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .shadow(radius: 10)
                .transition(.move(edge: .bottom))
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        showAIPanel.toggle()
                    }
                } label: {
                    Image(systemName: showAIPanel ? "sparkles" : "sparkles")
                        .foregroundColor(showAIPanel ? .accentColor : .secondary)
                }
            }
        }
    }

    // MARK: - Regular Phone / Landscape Layout

    @ViewBuilder
    private func regularPhoneLayout(geometry: GeometryProxy) -> some View {
        HStack(spacing: 0) {
            editorContent
                .frame(width: showAIPanel ? geometry.size.width * 0.55 : geometry.size.width)

            if showAIPanel {
                Divider()
                aiPanelContent
                    .frame(width: geometry.size.width * 0.45)
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    withAnimation { showAIPanel.toggle() }
                } label: {
                    Image(systemName: "sparkles")
                        .foregroundColor(showAIPanel ? .accentColor : .secondary)
                }
            }
        }
    }

    // MARK: - Full Tablet Layout (3 columns)

    @ViewBuilder
    private func tabletLayout(geometry: GeometryProxy) -> some View {
        HStack(spacing: 0) {
            if sidebarVisible {
                sidebarContent
                    .frame(width: 260)
                Divider()
            }

            editorContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            if showAIPanel {
                Divider()
                aiPanelContent
                    .frame(width: min(aiPanelWidth, geometry.size.width * 0.4))
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarLeading) {
                Button {
                    withAnimation { sidebarVisible.toggle() }
                } label: {
                    Image(systemName: "sidebar.left")
                }
            }
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Button {
                    withAnimation { showAIPanel.toggle() }
                } label: {
                    Image(systemName: "sparkles")
                        .foregroundColor(showAIPanel ? .accentColor : .secondary)
                }
            }
        }
    }

    // MARK: - iPad Split View (Small Side)

    @ViewBuilder
    private func splitSmallLayout(geometry: GeometryProxy) -> some View {
        // When in the small side of split view, behave like a phone
        compactPhoneLayout(geometry: geometry)
    }

    // MARK: - iPad Split View (Large Side)

    @ViewBuilder
    private func splitLargeLayout(geometry: GeometryProxy) -> some View {
        HStack(spacing: 0) {
            editorContent
                .frame(maxWidth: .infinity)

            if showAIPanel {
                Divider()
                aiPanelContent
                    .frame(width: geometry.size.width * 0.4)
            }
        }
    }
}

// MARK: - Adaptive Navigation

struct AdaptiveNavigation<Content: View>: View {
    @Environment(\.horizontalSizeClass) var horizontalSizeClass

    let selectedTab: String
    let onTabSelected: (String) -> Void
    let content: () -> Content

    struct TabItem: Identifiable {
        let id: String
        let label: String
        let icon: String
        let selectedIcon: String
    }

    static var tabs: [TabItem] {
        [
            TabItem(id: "projects", label: "Projects", icon: "folder", selectedIcon: "folder.fill"),
            TabItem(id: "editor", label: "Editor", icon: "chevron.left.forwardslash.chevron.right", selectedIcon: "chevron.left.forwardslash.chevron.right"),
            TabItem(id: "terminal", label: "Terminal", icon: "terminal", selectedIcon: "terminal.fill"),
            TabItem(id: "git", label: "Git", icon: "arrow.triangle.branch", selectedIcon: "arrow.triangle.branch"),
            TabItem(id: "settings", label: "Settings", icon: "gear", selectedIcon: "gear")
        ]
    }

    var body: some View {
        if horizontalSizeClass == .compact {
            // Tab bar for iPhone
            TabView(selection: Binding(
                get: { selectedTab },
                set: { onTabSelected($0) }
            )) {
                ForEach(Self.tabs) { tab in
                    content()
                        .tabItem {
                            Label(tab.label, systemImage: selectedTab == tab.id ? tab.selectedIcon : tab.icon)
                        }
                        .tag(tab.id)
                }
            }
        } else {
            // Sidebar for iPad
            NavigationSplitView {
                List(Self.tabs, selection: Binding(
                    get: { selectedTab },
                    set: { onTabSelected($0 ?? "projects") }
                )) { tab in
                    Label(tab.label, systemImage: selectedTab == tab.id ? tab.selectedIcon : tab.icon)
                        .tag(tab.id)
                }
                .navigationTitle("Claude Context")
            } detail: {
                content()
            }
        }
    }
}

// MARK: - Responsive Modifiers

struct ResponsiveModifier: ViewModifier {
    @Environment(\.horizontalSizeClass) var hSizeClass
    @Environment(\.verticalSizeClass) var vSizeClass

    let compact: AnyView?
    let regular: AnyView?

    func body(content: Content) -> some View {
        if hSizeClass == .compact, let compact = compact {
            compact
        } else if let regular = regular {
            regular
        } else {
            content
        }
    }
}

// MARK: - Keyboard Avoidance for iPad

struct KeyboardAdaptive: ViewModifier {
    @State private var keyboardHeight: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .padding(.bottom, keyboardHeight)
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { notification in
                if let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
                    withAnimation(.easeOut(duration: 0.16)) {
                        keyboardHeight = frame.height
                    }
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
                withAnimation(.easeOut(duration: 0.16)) {
                    keyboardHeight = 0
                }
            }
    }
}

extension View {
    func keyboardAdaptive() -> some View {
        modifier(KeyboardAdaptive())
    }
}

// MARK: - Multi-Window Support (iPad)

struct MultiWindowInfo {
    let isMainScene: Bool
    let windowId: String

    static func from(_ scene: UIScene?) -> MultiWindowInfo {
        guard let windowScene = scene as? UIWindowScene else {
            return MultiWindowInfo(isMainScene: true, windowId: "main")
        }
        return MultiWindowInfo(
            isMainScene: windowScene.activationState == .foregroundActive,
            windowId: windowScene.session.persistentIdentifier
        )
    }
}
