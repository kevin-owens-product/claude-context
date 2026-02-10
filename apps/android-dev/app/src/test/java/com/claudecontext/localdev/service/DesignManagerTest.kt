package com.claudecontext.localdev.service

import com.claudecontext.localdev.service.design.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class DesignManagerTest {

    private lateinit var designManager: DesignManager

    @Before
    fun setup() {
        designManager = DesignManager()
    }

    // --- Theme Management ---

    @Test
    fun `default theme is Dark Default`() = runTest {
        val state = designManager.state.first()
        assertEquals("Dark (Default)", state.activeTheme.name)
        assertTrue(state.activeTheme.isDark)
    }

    @Test
    fun `built-in themes count`() = runTest {
        assertEquals(6, DesignManager.builtInThemes.size)
    }

    @Test
    fun `built-in themes include expected themes`() {
        val names = DesignManager.builtInThemes.map { it.name }
        assertTrue("Dark (Default)" in names)
        assertTrue("Light" in names)
        assertTrue("Monokai" in names)
        assertTrue("Dracula" in names)
        assertTrue("Nord" in names)
        assertTrue("Solarized Dark" in names)
    }

    @Test
    fun `setTheme changes active theme`() = runTest {
        val light = designManager.state.first().themes.find { it.name == "Light" }!!
        designManager.setTheme(light.id)

        val state = designManager.state.first()
        assertEquals("Light", state.activeTheme.name)
        assertFalse(state.activeTheme.isDark)
    }

    @Test
    fun `createTheme based on current`() = runTest {
        val theme = designManager.createTheme("My Custom Theme")

        val state = designManager.state.first()
        assertTrue(state.themes.any { it.name == "My Custom Theme" })
        assertFalse(theme.isBuiltIn)
    }

    @Test
    fun `createTheme based on specific theme`() = runTest {
        val monokai = designManager.state.first().themes.find { it.name == "Monokai" }!!
        val custom = designManager.createTheme("Custom Monokai", monokai.id)

        assertEquals(monokai.colors.primary, custom.colors.primary)
    }

    @Test
    fun `deleteTheme removes custom theme`() = runTest {
        val custom = designManager.createTheme("Delete Me")
        val sizeBefore = designManager.state.first().themes.size

        designManager.deleteTheme(custom.id)

        assertEquals(sizeBefore - 1, designManager.state.first().themes.size)
    }

    @Test
    fun `deleteTheme does not remove built-in theme`() = runTest {
        val builtIn = designManager.state.first().themes.find { it.isBuiltIn }!!
        val sizeBefore = designManager.state.first().themes.size

        designManager.deleteTheme(builtIn.id)

        assertEquals(sizeBefore, designManager.state.first().themes.size)
    }

    @Test
    fun `deleteTheme falls back to first theme if active deleted`() = runTest {
        val custom = designManager.createTheme("Active Custom")
        designManager.setTheme(custom.id)
        designManager.deleteTheme(custom.id)

        val state = designManager.state.first()
        assertNotNull(state.activeTheme)
        assertNotEquals(custom.id, state.activeTheme.id)
    }

    @Test
    fun `updateThemeColors changes colors`() = runTest {
        val theme = designManager.createTheme("Colored")
        val newColors = theme.colors.copy(primary = "#FF0000")
        designManager.updateThemeColors(theme.id, newColors)

        val updated = designManager.state.first().themes.find { it.id == theme.id }!!
        assertEquals("#FF0000", updated.colors.primary)
    }

    @Test
    fun `duplicateTheme creates copy`() = runTest {
        val original = designManager.state.first().activeTheme
        val copy = designManager.duplicateTheme(original.id, "Copy Theme")

        assertNotNull(copy)
        assertEquals("Copy Theme", copy!!.name)
        assertEquals(original.colors.primary, copy.colors.primary)
        assertNotEquals(original.id, copy.id)
    }

    // --- Layout Management ---

    @Test
    fun `default layouts count`() {
        assertEquals(4, DesignManager.defaultLayouts.size)
    }

    @Test
    fun `default layout names`() {
        val names = DesignManager.defaultLayouts.map { it.name }
        assertTrue("Default" in names)
        assertTrue("Focus Mode" in names)
        assertTrue("AI Pair Programming" in names)
        assertTrue("Debug Layout" in names)
    }

    @Test
    fun `setLayout changes active layout`() = runTest {
        val focus = designManager.state.first().layouts.find { it.name == "Focus Mode" }!!
        designManager.setLayout(focus.id)

        assertEquals("Focus Mode", designManager.state.first().activeLayout.name)
    }

    @Test
    fun `createLayout adds new layout`() = runTest {
        val panels = listOf(
            PanelConfig("editor", PanelType.EDITOR, PanelPosition.CENTER)
        )
        val layout = designManager.createLayout("Minimal", panels)

        assertTrue(designManager.state.first().layouts.any { it.name == "Minimal" })
    }

    @Test
    fun `togglePanel toggles visibility`() = runTest {
        val panel = designManager.state.first().activeLayout.panels.find { it.id == "terminal" }
        assertTrue(panel!!.visible)

        designManager.togglePanel("terminal")

        val updated = designManager.state.first().activeLayout.panels.find { it.id == "terminal" }
        assertFalse(updated!!.visible)
    }

    // --- Editor Settings ---

    @Test
    fun `setEditorFontSize updates font size`() = runTest {
        designManager.setEditorFontSize(16)
        assertEquals(16, designManager.state.first().activeTheme.typography.editorFontSize)
    }

    @Test
    fun `setTabSize updates tab size`() = runTest {
        designManager.setTabSize(2)
        assertEquals(2, designManager.state.first().activeTheme.spacing.tabSize)
    }

    @Test
    fun `setShowMinimap toggles minimap`() = runTest {
        designManager.setShowMinimap(false)
        assertFalse(designManager.state.first().showMinimap)
    }

    @Test
    fun `setShowBreadcrumbs toggles breadcrumbs`() = runTest {
        designManager.setShowBreadcrumbs(false)
        assertFalse(designManager.state.first().showBreadcrumbs)
    }

    @Test
    fun `setBracketPairColorization toggles`() = runTest {
        designManager.setBracketPairColorization(false)
        assertFalse(designManager.state.first().bracketPairColorization)
    }

    @Test
    fun `setCursorStyle changes cursor style`() = runTest {
        designManager.setCursorStyle(CursorStyle.BLOCK)
        assertEquals(CursorStyle.BLOCK, designManager.state.first().cursorStyle)
    }

    @Test
    fun `setCursorBlinking changes cursor blinking`() = runTest {
        designManager.setCursorBlinking(CursorBlinking.PHASE)
        assertEquals(CursorBlinking.PHASE, designManager.state.first().cursorBlinking)
    }

    @Test
    fun `setRenderWhitespace changes whitespace rendering`() = runTest {
        designManager.setRenderWhitespace(WhitespaceRender.ALL)
        assertEquals(WhitespaceRender.ALL, designManager.state.first().renderWhitespace)
    }

    // --- Icon Pack ---

    @Test
    fun `getFileIcon returns correct icon`() {
        assertEquals("kotlin_icon", designManager.getFileIcon("kt"))
        assertEquals("python_icon", designManager.getFileIcon("py"))
        assertEquals("typescript_icon", designManager.getFileIcon("ts"))
    }

    @Test
    fun `getFileIcon returns default for unknown`() {
        assertEquals("file_icon", designManager.getFileIcon("xyz"))
    }

    @Test
    fun `getFolderIcon returns correct icon`() {
        assertEquals("source_folder", designManager.getFolderIcon("src"))
        assertEquals("test_folder", designManager.getFolderIcon("test"))
    }

    @Test
    fun `getFolderIcon returns default for unknown`() {
        assertEquals("folder_icon", designManager.getFolderIcon("random"))
    }

    // --- Theme Colors ---

    @Test
    fun `dark theme has dark background`() {
        val dark = DesignManager.builtInThemes.find { it.name == "Dark (Default)" }!!
        assertEquals("#0F172A", dark.colors.background)
    }

    @Test
    fun `light theme has light background`() {
        val light = DesignManager.builtInThemes.find { it.name == "Light" }!!
        assertEquals("#FFFFFF", light.colors.background)
    }

    @Test
    fun `monokai theme has correct primary`() {
        val monokai = DesignManager.builtInThemes.find { it.name == "Monokai" }!!
        assertEquals("#A6E22E", monokai.colors.primary)
    }

    // --- Panel Types ---

    @Test
    fun `all panel types have display names`() {
        PanelType.entries.forEach {
            assertTrue(it.displayName.isNotEmpty())
        }
    }

    @Test
    fun `panel type count is correct`() {
        assertEquals(10, PanelType.entries.size)
    }
}
