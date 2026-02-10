package com.claudecontext.localdev.service.design

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages design tokens, theming, component library, layout presets,
 * and visual configuration for the development environment.
 */

// --- Theme Engine ---

data class DesignTheme(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val isDark: Boolean = true,
    val colors: ThemeColors,
    val typography: ThemeTypography = ThemeTypography(),
    val spacing: ThemeSpacing = ThemeSpacing(),
    val borderRadius: ThemeBorderRadius = ThemeBorderRadius(),
    val elevation: ThemeElevation = ThemeElevation(),
    val isBuiltIn: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

data class ThemeColors(
    val primary: String = "#6366F1",
    val primaryVariant: String = "#4F46E5",
    val secondary: String = "#EC4899",
    val secondaryVariant: String = "#DB2777",
    val background: String = "#0F172A",
    val surface: String = "#1E293B",
    val surfaceVariant: String = "#334155",
    val error: String = "#EF4444",
    val warning: String = "#F59E0B",
    val success: String = "#10B981",
    val info: String = "#3B82F6",
    val onPrimary: String = "#FFFFFF",
    val onSecondary: String = "#FFFFFF",
    val onBackground: String = "#F8FAFC",
    val onSurface: String = "#E2E8F0",
    val onSurfaceVariant: String = "#94A3B8",
    val onError: String = "#FFFFFF",
    // Editor-specific
    val editorBackground: String = "#0F172A",
    val editorLineNumber: String = "#475569",
    val editorCurrentLine: String = "#1E293B",
    val editorSelection: String = "#6366F133",
    val editorCursor: String = "#6366F1",
    // Syntax highlighting
    val syntaxKeyword: String = "#C084FC",
    val syntaxString: String = "#34D399",
    val syntaxNumber: String = "#F59E0B",
    val syntaxComment: String = "#64748B",
    val syntaxFunction: String = "#60A5FA",
    val syntaxType: String = "#F472B6",
    val syntaxOperator: String = "#94A3B8",
    val syntaxVariable: String = "#E2E8F0",
    val syntaxConstant: String = "#FB923C"
)

data class ThemeTypography(
    val fontFamily: String = "JetBrains Mono",
    val editorFontSize: Int = 13,
    val uiFontSize: Int = 14,
    val terminalFontSize: Int = 12,
    val lineHeight: Float = 1.5f,
    val letterSpacing: Float = 0f,
    val fontWeight: FontWeight = FontWeight.REGULAR
)

enum class FontWeight(val weight: Int) {
    LIGHT(300),
    REGULAR(400),
    MEDIUM(500),
    SEMIBOLD(600),
    BOLD(700)
}

data class ThemeSpacing(
    val xs: Int = 2,
    val sm: Int = 4,
    val md: Int = 8,
    val lg: Int = 16,
    val xl: Int = 24,
    val xxl: Int = 32,
    val tabSize: Int = 4,
    val editorPadding: Int = 12,
    val panelGap: Int = 8
)

data class ThemeBorderRadius(
    val none: Int = 0,
    val sm: Int = 4,
    val md: Int = 8,
    val lg: Int = 12,
    val xl: Int = 16,
    val full: Int = 999
)

data class ThemeElevation(
    val none: Int = 0,
    val sm: Int = 1,
    val md: Int = 2,
    val lg: Int = 4,
    val xl: Int = 8
)

// --- Layout System ---

data class LayoutPreset(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val panels: List<PanelConfig>,
    val isDefault: Boolean = false
)

data class PanelConfig(
    val id: String,
    val type: PanelType,
    val position: PanelPosition,
    val size: PanelSize = PanelSize(),
    val visible: Boolean = true,
    val collapsed: Boolean = false,
    val order: Int = 0
)

enum class PanelType(val displayName: String) {
    FILE_EXPLORER("File Explorer"),
    EDITOR("Editor"),
    TERMINAL("Terminal"),
    AI_ASSISTANT("AI Assistant"),
    GIT_PANEL("Git"),
    OUTPUT("Output"),
    SEARCH("Search"),
    CONTEXT_VIEWER("Context"),
    SESSION_LIST("Sessions"),
    DEBUG_CONSOLE("Debug Console")
}

enum class PanelPosition {
    LEFT, CENTER, RIGHT, BOTTOM, TOP, FLOATING
}

data class PanelSize(
    val width: Float = 0.5f,   // Fraction of available space
    val height: Float = 0.5f,
    val minWidth: Int = 200,
    val minHeight: Int = 100
)

// --- Component Library ---

data class ComponentStyle(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val type: ComponentType,
    val properties: Map<String, String> = emptyMap()
)

enum class ComponentType {
    BUTTON,
    INPUT,
    CARD,
    MODAL,
    TAB,
    CHIP,
    BADGE,
    TOOLTIP,
    MENU,
    DIVIDER,
    CODE_BLOCK,
    FILE_TAB,
    STATUS_BAR,
    BREADCRUMB
}

// --- Icon Pack ---

data class IconPack(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val fileIcons: Map<String, String> = defaultFileIcons,
    val folderIcons: Map<String, String> = defaultFolderIcons
) {
    companion object {
        val defaultFileIcons = mapOf(
            "kt" to "kotlin_icon",
            "java" to "java_icon",
            "swift" to "swift_icon",
            "py" to "python_icon",
            "js" to "javascript_icon",
            "ts" to "typescript_icon",
            "tsx" to "react_icon",
            "jsx" to "react_icon",
            "rs" to "rust_icon",
            "go" to "go_icon",
            "json" to "json_icon",
            "yaml" to "yaml_icon",
            "yml" to "yaml_icon",
            "md" to "markdown_icon",
            "xml" to "xml_icon",
            "html" to "html_icon",
            "css" to "css_icon",
            "sql" to "database_icon",
            "sh" to "terminal_icon",
            "gradle" to "gradle_icon",
            "lock" to "lock_icon"
        )

        val defaultFolderIcons = mapOf(
            "src" to "source_folder",
            "test" to "test_folder",
            "tests" to "test_folder",
            "lib" to "library_folder",
            "docs" to "docs_folder",
            "config" to "config_folder",
            "public" to "public_folder",
            "assets" to "assets_folder",
            ".git" to "git_folder",
            "node_modules" to "npm_folder",
            "build" to "build_folder"
        )
    }
}

// --- Manager State ---

data class DesignManagerState(
    val activeTheme: DesignTheme = builtInThemes.first(),
    val themes: List<DesignTheme> = builtInThemes,
    val activeLayout: LayoutPreset = defaultLayouts.first(),
    val layouts: List<LayoutPreset> = defaultLayouts,
    val componentStyles: List<ComponentStyle> = emptyList(),
    val iconPack: IconPack = IconPack(name = "Default"),
    val showMinimap: Boolean = true,
    val showBreadcrumbs: Boolean = true,
    val showIndentGuides: Boolean = true,
    val bracketPairColorization: Boolean = true,
    val smoothScrolling: Boolean = true,
    val cursorBlinking: CursorBlinking = CursorBlinking.SMOOTH,
    val cursorStyle: CursorStyle = CursorStyle.LINE,
    val renderWhitespace: WhitespaceRender = WhitespaceRender.SELECTION
)

enum class CursorBlinking { BLINK, SMOOTH, PHASE, EXPAND, SOLID }
enum class CursorStyle { LINE, BLOCK, UNDERLINE }
enum class WhitespaceRender { NONE, SELECTION, ALL, TRAILING }

@Singleton
class DesignManager @Inject constructor() {

    private val _state = MutableStateFlow(DesignManagerState())
    val state: StateFlow<DesignManagerState> = _state.asStateFlow()

    // --- Theme Management ---

    fun setTheme(themeId: String) {
        val theme = _state.value.themes.find { it.id == themeId } ?: return
        _state.value = _state.value.copy(activeTheme = theme)
    }

    fun createTheme(name: String, baseThemeId: String? = null): DesignTheme {
        val base = baseThemeId?.let { id -> _state.value.themes.find { it.id == id } }
            ?: _state.value.activeTheme

        val theme = base.copy(
            id = UUID.randomUUID().toString(),
            name = name,
            isBuiltIn = false,
            createdAt = System.currentTimeMillis()
        )
        _state.value = _state.value.copy(themes = _state.value.themes + theme)
        return theme
    }

    fun updateThemeColors(themeId: String, colors: ThemeColors) {
        updateTheme(themeId) { it.copy(colors = colors) }
    }

    fun updateThemeTypography(themeId: String, typography: ThemeTypography) {
        updateTheme(themeId) { it.copy(typography = typography) }
    }

    fun updateThemeSpacing(themeId: String, spacing: ThemeSpacing) {
        updateTheme(themeId) { it.copy(spacing = spacing) }
    }

    fun deleteTheme(themeId: String) {
        val theme = _state.value.themes.find { it.id == themeId } ?: return
        if (theme.isBuiltIn) return
        val themes = _state.value.themes.filter { it.id != themeId }
        val active = if (_state.value.activeTheme.id == themeId) themes.first() else _state.value.activeTheme
        _state.value = _state.value.copy(themes = themes, activeTheme = active)
    }

    fun duplicateTheme(themeId: String, newName: String): DesignTheme? {
        return createTheme(newName, themeId)
    }

    // --- Layout Management ---

    fun setLayout(layoutId: String) {
        val layout = _state.value.layouts.find { it.id == layoutId } ?: return
        _state.value = _state.value.copy(activeLayout = layout)
    }

    fun createLayout(name: String, panels: List<PanelConfig>): LayoutPreset {
        val layout = LayoutPreset(name = name, panels = panels)
        _state.value = _state.value.copy(layouts = _state.value.layouts + layout)
        return layout
    }

    fun updatePanelConfig(layoutId: String, panelId: String, transform: (PanelConfig) -> PanelConfig) {
        updateLayout(layoutId) { layout ->
            layout.copy(panels = layout.panels.map {
                if (it.id == panelId) transform(it) else it
            })
        }
    }

    fun togglePanel(panelId: String) {
        val layout = _state.value.activeLayout
        updateLayout(layout.id) { l ->
            l.copy(panels = l.panels.map {
                if (it.id == panelId) it.copy(visible = !it.visible) else it
            })
        }
    }

    fun collapsePanel(panelId: String, collapsed: Boolean) {
        val layout = _state.value.activeLayout
        updateLayout(layout.id) { l ->
            l.copy(panels = l.panels.map {
                if (it.id == panelId) it.copy(collapsed = collapsed) else it
            })
        }
    }

    fun deleteLayout(layoutId: String) {
        val layout = _state.value.layouts.find { it.id == layoutId } ?: return
        if (layout.isDefault) return
        val layouts = _state.value.layouts.filter { it.id != layoutId }
        val active = if (_state.value.activeLayout.id == layoutId) layouts.first() else _state.value.activeLayout
        _state.value = _state.value.copy(layouts = layouts, activeLayout = active)
    }

    // --- Editor Settings ---

    fun setShowMinimap(show: Boolean) {
        _state.value = _state.value.copy(showMinimap = show)
    }

    fun setShowBreadcrumbs(show: Boolean) {
        _state.value = _state.value.copy(showBreadcrumbs = show)
    }

    fun setShowIndentGuides(show: Boolean) {
        _state.value = _state.value.copy(showIndentGuides = show)
    }

    fun setBracketPairColorization(enabled: Boolean) {
        _state.value = _state.value.copy(bracketPairColorization = enabled)
    }

    fun setCursorBlinking(blinking: CursorBlinking) {
        _state.value = _state.value.copy(cursorBlinking = blinking)
    }

    fun setCursorStyle(style: CursorStyle) {
        _state.value = _state.value.copy(cursorStyle = style)
    }

    fun setRenderWhitespace(render: WhitespaceRender) {
        _state.value = _state.value.copy(renderWhitespace = render)
    }

    fun setEditorFontSize(size: Int) {
        val theme = _state.value.activeTheme
        val updated = theme.copy(typography = theme.typography.copy(editorFontSize = size))
        _state.value = _state.value.copy(activeTheme = updated)
    }

    fun setTabSize(size: Int) {
        val theme = _state.value.activeTheme
        val updated = theme.copy(spacing = theme.spacing.copy(tabSize = size))
        _state.value = _state.value.copy(activeTheme = updated)
    }

    // --- Icon Pack ---

    fun setIconPack(iconPack: IconPack) {
        _state.value = _state.value.copy(iconPack = iconPack)
    }

    fun getFileIcon(extension: String): String {
        return _state.value.iconPack.fileIcons[extension] ?: "file_icon"
    }

    fun getFolderIcon(name: String): String {
        return _state.value.iconPack.folderIcons[name] ?: "folder_icon"
    }

    // --- Helpers ---

    private fun updateTheme(themeId: String, transform: (DesignTheme) -> DesignTheme) {
        val themes = _state.value.themes.map {
            if (it.id == themeId) transform(it) else it
        }
        val active = if (_state.value.activeTheme.id == themeId) {
            themes.find { it.id == themeId } ?: _state.value.activeTheme
        } else _state.value.activeTheme

        _state.value = _state.value.copy(themes = themes, activeTheme = active)
    }

    private fun updateLayout(layoutId: String, transform: (LayoutPreset) -> LayoutPreset) {
        val layouts = _state.value.layouts.map {
            if (it.id == layoutId) transform(it) else it
        }
        val active = if (_state.value.activeLayout.id == layoutId) {
            layouts.find { it.id == layoutId } ?: _state.value.activeLayout
        } else _state.value.activeLayout

        _state.value = _state.value.copy(layouts = layouts, activeLayout = active)
    }

    companion object {
        val builtInThemes = listOf(
            DesignTheme(
                id = "dark-default",
                name = "Dark (Default)",
                isDark = true,
                colors = ThemeColors(),
                isBuiltIn = true
            ),
            DesignTheme(
                id = "light-default",
                name = "Light",
                isDark = false,
                colors = ThemeColors(
                    primary = "#4F46E5",
                    background = "#FFFFFF",
                    surface = "#F8FAFC",
                    surfaceVariant = "#E2E8F0",
                    onBackground = "#0F172A",
                    onSurface = "#1E293B",
                    onSurfaceVariant = "#475569",
                    editorBackground = "#FFFFFF",
                    editorLineNumber = "#94A3B8",
                    editorCurrentLine = "#F1F5F9",
                    editorSelection = "#4F46E533",
                    syntaxKeyword = "#7C3AED",
                    syntaxString = "#059669",
                    syntaxNumber = "#D97706",
                    syntaxComment = "#94A3B8",
                    syntaxFunction = "#2563EB",
                    syntaxType = "#DB2777"
                ),
                isBuiltIn = true
            ),
            DesignTheme(
                id = "monokai",
                name = "Monokai",
                isDark = true,
                colors = ThemeColors(
                    primary = "#A6E22E",
                    background = "#272822",
                    surface = "#3E3D32",
                    surfaceVariant = "#49483E",
                    onBackground = "#F8F8F2",
                    onSurface = "#F8F8F2",
                    editorBackground = "#272822",
                    syntaxKeyword = "#F92672",
                    syntaxString = "#E6DB74",
                    syntaxNumber = "#AE81FF",
                    syntaxComment = "#75715E",
                    syntaxFunction = "#A6E22E",
                    syntaxType = "#66D9EF"
                ),
                isBuiltIn = true
            ),
            DesignTheme(
                id = "solarized-dark",
                name = "Solarized Dark",
                isDark = true,
                colors = ThemeColors(
                    primary = "#268BD2",
                    background = "#002B36",
                    surface = "#073642",
                    surfaceVariant = "#073642",
                    onBackground = "#839496",
                    onSurface = "#93A1A1",
                    editorBackground = "#002B36",
                    syntaxKeyword = "#859900",
                    syntaxString = "#2AA198",
                    syntaxNumber = "#D33682",
                    syntaxComment = "#586E75",
                    syntaxFunction = "#268BD2",
                    syntaxType = "#B58900"
                ),
                isBuiltIn = true
            ),
            DesignTheme(
                id = "dracula",
                name = "Dracula",
                isDark = true,
                colors = ThemeColors(
                    primary = "#BD93F9",
                    secondary = "#FF79C6",
                    background = "#282A36",
                    surface = "#44475A",
                    surfaceVariant = "#44475A",
                    onBackground = "#F8F8F2",
                    onSurface = "#F8F8F2",
                    editorBackground = "#282A36",
                    syntaxKeyword = "#FF79C6",
                    syntaxString = "#F1FA8C",
                    syntaxNumber = "#BD93F9",
                    syntaxComment = "#6272A4",
                    syntaxFunction = "#50FA7B",
                    syntaxType = "#8BE9FD"
                ),
                isBuiltIn = true
            ),
            DesignTheme(
                id = "nord",
                name = "Nord",
                isDark = true,
                colors = ThemeColors(
                    primary = "#88C0D0",
                    background = "#2E3440",
                    surface = "#3B4252",
                    surfaceVariant = "#434C5E",
                    onBackground = "#D8DEE9",
                    onSurface = "#ECEFF4",
                    editorBackground = "#2E3440",
                    syntaxKeyword = "#81A1C1",
                    syntaxString = "#A3BE8C",
                    syntaxNumber = "#B48EAD",
                    syntaxComment = "#616E88",
                    syntaxFunction = "#88C0D0",
                    syntaxType = "#EBCB8B"
                ),
                isBuiltIn = true
            )
        )

        val defaultLayouts = listOf(
            LayoutPreset(
                id = "default",
                name = "Default",
                isDefault = true,
                panels = listOf(
                    PanelConfig("explorer", PanelType.FILE_EXPLORER, PanelPosition.LEFT, PanelSize(width = 0.2f, height = 1f), order = 0),
                    PanelConfig("editor", PanelType.EDITOR, PanelPosition.CENTER, PanelSize(width = 0.6f, height = 0.7f), order = 1),
                    PanelConfig("ai-assistant", PanelType.AI_ASSISTANT, PanelPosition.RIGHT, PanelSize(width = 0.2f, height = 1f), order = 2),
                    PanelConfig("terminal", PanelType.TERMINAL, PanelPosition.BOTTOM, PanelSize(width = 1f, height = 0.3f), order = 3)
                )
            ),
            LayoutPreset(
                id = "focus",
                name = "Focus Mode",
                panels = listOf(
                    PanelConfig("editor", PanelType.EDITOR, PanelPosition.CENTER, PanelSize(width = 1f, height = 1f), order = 0)
                )
            ),
            LayoutPreset(
                id = "ai-pair",
                name = "AI Pair Programming",
                panels = listOf(
                    PanelConfig("editor", PanelType.EDITOR, PanelPosition.LEFT, PanelSize(width = 0.5f, height = 1f), order = 0),
                    PanelConfig("ai-assistant", PanelType.AI_ASSISTANT, PanelPosition.RIGHT, PanelSize(width = 0.5f, height = 0.7f), order = 1),
                    PanelConfig("terminal", PanelType.TERMINAL, PanelPosition.BOTTOM, PanelSize(width = 0.5f, height = 0.3f), order = 2)
                )
            ),
            LayoutPreset(
                id = "debug",
                name = "Debug Layout",
                panels = listOf(
                    PanelConfig("explorer", PanelType.FILE_EXPLORER, PanelPosition.LEFT, PanelSize(width = 0.15f, height = 1f), order = 0),
                    PanelConfig("editor", PanelType.EDITOR, PanelPosition.CENTER, PanelSize(width = 0.55f, height = 0.6f), order = 1),
                    PanelConfig("debug", PanelType.DEBUG_CONSOLE, PanelPosition.RIGHT, PanelSize(width = 0.3f, height = 1f), order = 2),
                    PanelConfig("terminal", PanelType.TERMINAL, PanelPosition.BOTTOM, PanelSize(width = 0.7f, height = 0.4f), order = 3),
                    PanelConfig("output", PanelType.OUTPUT, PanelPosition.BOTTOM, PanelSize(width = 0.3f, height = 0.4f), order = 4)
                )
            )
        )
    }
}
