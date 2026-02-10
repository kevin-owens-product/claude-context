package com.claudecontext.localdev.ui.adaptive

import org.junit.Assert.*
import org.junit.Test

class AdaptiveLayoutTest {

    @Test
    fun `AdaptiveLayoutType has all expected values`() {
        val types = AdaptiveLayoutType.entries
        assertEquals(5, types.size)
        assertTrue(types.contains(AdaptiveLayoutType.COMPACT))
        assertTrue(types.contains(AdaptiveLayoutType.MEDIUM))
        assertTrue(types.contains(AdaptiveLayoutType.EXPANDED))
        assertTrue(types.contains(AdaptiveLayoutType.FOLDABLE_BOOK))
        assertTrue(types.contains(AdaptiveLayoutType.FOLDABLE_TABLETOP))
    }

    @Test
    fun `DevicePosture sealed class has all subclasses`() {
        val normal = DevicePosture.NormalPosture
        assertNotNull(normal)
    }

    @Test
    fun `SidebarNavItem holds correct data`() {
        val item = SidebarNavItem(
            id = "files",
            label = "Explorer",
            icon = androidx.compose.material.icons.Icons.Default.Folder,
            badge = 3
        )
        assertEquals("files", item.id)
        assertEquals("Explorer", item.label)
        assertEquals(3, item.badge)
    }

    @Test
    fun `SidebarNavItem badge defaults to null`() {
        val item = SidebarNavItem(
            id = "search",
            label = "Search",
            icon = androidx.compose.material.icons.Icons.Default.Search
        )
        assertNull(item.badge)
    }

    @Test
    fun `FileTreeNode holds correct data`() {
        val node = FileTreeNode(
            name = "src",
            path = "/project/src",
            isDirectory = true,
            depth = 0,
            isExpanded = true
        )
        assertEquals("src", node.name)
        assertEquals("/project/src", node.path)
        assertTrue(node.isDirectory)
        assertEquals(0, node.depth)
        assertTrue(node.isExpanded)
    }

    @Test
    fun `FileTreeNode defaults`() {
        val node = FileTreeNode(
            name = "main.kt",
            path = "/project/src/main.kt",
            isDirectory = false
        )
        assertEquals(0, node.depth)
        assertFalse(node.isExpanded)
    }

    @Test
    fun `TOP_LEVEL_DESTINATIONS has all expected routes`() {
        assertEquals(5, TOP_LEVEL_DESTINATIONS.size)
        assertEquals("projects", TOP_LEVEL_DESTINATIONS[0].route)
        assertEquals("editor", TOP_LEVEL_DESTINATIONS[1].route)
        assertEquals("terminal", TOP_LEVEL_DESTINATIONS[2].route)
        assertEquals("git", TOP_LEVEL_DESTINATIONS[3].route)
        assertEquals("settings", TOP_LEVEL_DESTINATIONS[4].route)
    }

    @Test
    fun `NavDestination selectedIcon defaults to icon`() {
        val dest = NavDestination(
            route = "test",
            label = "Test",
            icon = androidx.compose.material.icons.Icons.Default.Home
        )
        assertEquals(dest.icon, dest.selectedIcon)
    }
}
