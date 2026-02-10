import Foundation
import SwiftUI
import Combine

/// Manages design tokens, theming, component library, layout presets, and visual configuration.
@MainActor
class DesignManager: ObservableObject {

    @Published var state: DesignManagerState

    init() {
        state = DesignManagerState(
            activeTheme: Self.builtInThemes[0],
            themes: Self.builtInThemes,
            activeLayout: Self.defaultLayouts[0],
            layouts: Self.defaultLayouts
        )
    }

    // MARK: - Theme Management

    func setTheme(_ themeId: UUID) {
        guard let theme = state.themes.first(where: { $0.id == themeId }) else { return }
        state.activeTheme = theme
    }

    @discardableResult
    func createTheme(name: String, baseThemeId: UUID? = nil) -> DesignTheme {
        let base = baseThemeId.flatMap { id in state.themes.first { $0.id == id } } ?? state.activeTheme
        var theme = base
        theme.id = UUID()
        theme.name = name
        theme.isBuiltIn = false
        theme.createdAt = Date()
        state.themes.append(theme)
        return theme
    }

    func updateThemeColors(_ themeId: UUID, colors: ThemeColors) {
        guard let idx = state.themes.firstIndex(where: { $0.id == themeId }) else { return }
        state.themes[idx].colors = colors
        if state.activeTheme.id == themeId { state.activeTheme = state.themes[idx] }
    }

    func deleteTheme(_ themeId: UUID) {
        guard let theme = state.themes.first(where: { $0.id == themeId }), !theme.isBuiltIn else { return }
        state.themes.removeAll { $0.id == themeId }
        if state.activeTheme.id == themeId { state.activeTheme = state.themes[0] }
    }

    // MARK: - Layout Management

    func setLayout(_ layoutId: UUID) {
        guard let layout = state.layouts.first(where: { $0.id == layoutId }) else { return }
        state.activeLayout = layout
    }

    @discardableResult
    func createLayout(name: String, panels: [PanelConfig]) -> LayoutPreset {
        let layout = LayoutPreset(name: name, panels: panels)
        state.layouts.append(layout)
        return layout
    }

    func togglePanel(_ panelId: String) {
        if let idx = state.activeLayout.panels.firstIndex(where: { $0.id == panelId }) {
            state.activeLayout.panels[idx].visible.toggle()
            if let layoutIdx = state.layouts.firstIndex(where: { $0.id == state.activeLayout.id }) {
                state.layouts[layoutIdx] = state.activeLayout
            }
        }
    }

    // MARK: - Editor Settings

    func setEditorFontSize(_ size: Int) {
        state.activeTheme.typography.editorFontSize = max(8, min(32, size))
    }

    func setTabSize(_ size: Int) { state.activeTheme.spacing.tabSize = size }
    func setShowMinimap(_ show: Bool) { state.showMinimap = show }
    func setShowBreadcrumbs(_ show: Bool) { state.showBreadcrumbs = show }
    func setShowIndentGuides(_ show: Bool) { state.showIndentGuides = show }
    func setBracketPairColorization(_ enabled: Bool) { state.bracketPairColorization = enabled }
    func setCursorStyle(_ style: CursorStyle) { state.cursorStyle = style }
    func setCursorBlinking(_ blinking: CursorBlinking) { state.cursorBlinking = blinking }

    // MARK: - Icon Pack

    func getFileIcon(_ ext: String) -> String {
        state.iconPack.fileIcons[ext] ?? "doc"
    }

    func getFolderIcon(_ name: String) -> String {
        state.iconPack.folderIcons[name] ?? "folder"
    }

    // MARK: - Built-in Themes

    static let builtInThemes: [DesignTheme] = [
        DesignTheme(name: "Dark (Default)", isDark: true, colors: ThemeColors(), isBuiltIn: true),
        DesignTheme(name: "Light", isDark: false, colors: ThemeColors(
            primary: "#4F46E5", background: "#FFFFFF", surface: "#F8FAFC",
            surfaceVariant: "#E2E8F0", onBackground: "#0F172A", onSurface: "#1E293B",
            editorBackground: "#FFFFFF", syntaxKeyword: "#7C3AED", syntaxString: "#059669",
            syntaxFunction: "#2563EB", syntaxType: "#DB2777"
        ), isBuiltIn: true),
        DesignTheme(name: "Monokai", isDark: true, colors: ThemeColors(
            primary: "#A6E22E", background: "#272822", surface: "#3E3D32",
            onBackground: "#F8F8F2", editorBackground: "#272822",
            syntaxKeyword: "#F92672", syntaxString: "#E6DB74", syntaxFunction: "#A6E22E", syntaxType: "#66D9EF"
        ), isBuiltIn: true),
        DesignTheme(name: "Dracula", isDark: true, colors: ThemeColors(
            primary: "#BD93F9", secondary: "#FF79C6", background: "#282A36",
            surface: "#44475A", onBackground: "#F8F8F2", editorBackground: "#282A36",
            syntaxKeyword: "#FF79C6", syntaxString: "#F1FA8C", syntaxFunction: "#50FA7B", syntaxType: "#8BE9FD"
        ), isBuiltIn: true),
        DesignTheme(name: "Nord", isDark: true, colors: ThemeColors(
            primary: "#88C0D0", background: "#2E3440", surface: "#3B4252",
            onBackground: "#D8DEE9", editorBackground: "#2E3440",
            syntaxKeyword: "#81A1C1", syntaxString: "#A3BE8C", syntaxFunction: "#88C0D0", syntaxType: "#EBCB8B"
        ), isBuiltIn: true),
        DesignTheme(name: "Solarized Dark", isDark: true, colors: ThemeColors(
            primary: "#268BD2", background: "#002B36", surface: "#073642",
            onBackground: "#839496", editorBackground: "#002B36",
            syntaxKeyword: "#859900", syntaxString: "#2AA198", syntaxFunction: "#268BD2", syntaxType: "#B58900"
        ), isBuiltIn: true)
    ]

    static let defaultLayouts: [LayoutPreset] = [
        LayoutPreset(name: "Default", panels: [
            PanelConfig(id: "explorer", type: .fileExplorer, position: .left, visible: true, order: 0),
            PanelConfig(id: "editor", type: .editor, position: .center, visible: true, order: 1),
            PanelConfig(id: "ai-assistant", type: .aiAssistant, position: .right, visible: true, order: 2),
            PanelConfig(id: "terminal", type: .terminal, position: .bottom, visible: true, order: 3)
        ], isDefault: true),
        LayoutPreset(name: "Focus Mode", panels: [
            PanelConfig(id: "editor", type: .editor, position: .center, visible: true, order: 0)
        ]),
        LayoutPreset(name: "AI Pair Programming", panels: [
            PanelConfig(id: "editor", type: .editor, position: .left, visible: true, order: 0),
            PanelConfig(id: "ai-assistant", type: .aiAssistant, position: .right, visible: true, order: 1),
            PanelConfig(id: "terminal", type: .terminal, position: .bottom, visible: true, order: 2)
        ]),
        LayoutPreset(name: "Debug Layout", panels: [
            PanelConfig(id: "explorer", type: .fileExplorer, position: .left, visible: true, order: 0),
            PanelConfig(id: "editor", type: .editor, position: .center, visible: true, order: 1),
            PanelConfig(id: "debug", type: .debugConsole, position: .right, visible: true, order: 2),
            PanelConfig(id: "terminal", type: .terminal, position: .bottom, visible: true, order: 3)
        ])
    ]
}

// MARK: - Data Models

struct DesignManagerState {
    var activeTheme: DesignTheme
    var themes: [DesignTheme]
    var activeLayout: LayoutPreset
    var layouts: [LayoutPreset]
    var iconPack = IconPack()
    var showMinimap = true
    var showBreadcrumbs = true
    var showIndentGuides = true
    var bracketPairColorization = true
    var smoothScrolling = true
    var cursorBlinking: CursorBlinking = .smooth
    var cursorStyle: CursorStyle = .line
    var renderWhitespace: WhitespaceRender = .selection
}

struct DesignTheme: Identifiable {
    var id = UUID()
    var name: String
    var isDark: Bool = true
    var colors: ThemeColors
    var typography = ThemeTypography()
    var spacing = ThemeSpacing()
    var isBuiltIn = false
    var createdAt = Date()
}

struct ThemeColors {
    var primary = "#6366F1"
    var primaryVariant = "#4F46E5"
    var secondary = "#EC4899"
    var background = "#0F172A"
    var surface = "#1E293B"
    var surfaceVariant = "#334155"
    var error = "#EF4444"
    var warning = "#F59E0B"
    var success = "#10B981"
    var info = "#3B82F6"
    var onPrimary = "#FFFFFF"
    var onSecondary = "#FFFFFF"
    var onBackground = "#F8FAFC"
    var onSurface = "#E2E8F0"
    var onSurfaceVariant = "#94A3B8"
    var editorBackground = "#0F172A"
    var editorLineNumber = "#475569"
    var editorCurrentLine = "#1E293B"
    var editorSelection = "#6366F133"
    var syntaxKeyword = "#C084FC"
    var syntaxString = "#34D399"
    var syntaxNumber = "#F59E0B"
    var syntaxComment = "#64748B"
    var syntaxFunction = "#60A5FA"
    var syntaxType = "#F472B6"
    var syntaxOperator = "#94A3B8"
    var syntaxVariable = "#E2E8F0"
    var syntaxConstant = "#FB923C"
}

struct ThemeTypography {
    var fontFamily = "JetBrains Mono"
    var editorFontSize: Int = 13
    var uiFontSize: Int = 14
    var terminalFontSize: Int = 12
    var lineHeight: Float = 1.5
}

struct ThemeSpacing {
    var xs = 2; var sm = 4; var md = 8; var lg = 16; var xl = 24; var xxl = 32
    var tabSize = 4
    var editorPadding = 12
}

struct LayoutPreset: Identifiable {
    let id = UUID()
    var name: String
    var panels: [PanelConfig]
    var isDefault = false
}

struct PanelConfig: Identifiable {
    let id: String
    let type: PanelType
    let position: PanelPosition
    var visible: Bool = true
    var collapsed: Bool = false
    var order: Int = 0
}

enum PanelType: String {
    case fileExplorer, editor, terminal, aiAssistant, gitPanel
    case output, search, contextViewer, sessionList, debugConsole

    var displayName: String {
        switch self {
        case .fileExplorer: return "File Explorer"
        case .editor: return "Editor"
        case .terminal: return "Terminal"
        case .aiAssistant: return "AI Assistant"
        case .gitPanel: return "Git"
        case .output: return "Output"
        case .search: return "Search"
        case .contextViewer: return "Context"
        case .sessionList: return "Sessions"
        case .debugConsole: return "Debug Console"
        }
    }
}

enum PanelPosition { case left, center, right, bottom, top, floating }
enum CursorBlinking { case blink, smooth, phase, expand, solid }
enum CursorStyle { case line, block, underline }
enum WhitespaceRender { case none, selection, all, trailing }

struct IconPack {
    var fileIcons: [String: String] = [
        "kt": "swift", "java": "chevron.left.forwardslash.chevron.right",
        "py": "chevron.left.forwardslash.chevron.right", "swift": "swift",
        "js": "chevron.left.forwardslash.chevron.right", "ts": "chevron.left.forwardslash.chevron.right",
        "json": "curlybraces", "md": "doc.text", "rs": "gearshape",
        "go": "chevron.left.forwardslash.chevron.right"
    ]
    var folderIcons: [String: String] = [
        "src": "folder.fill", "test": "checkmark.circle", "lib": "books.vertical",
        "docs": "doc.text", "build": "hammer", ".git": "arrow.triangle.branch"
    ]
}
