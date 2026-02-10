package com.claudecontext.localdev.ui.adaptive

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

/**
 * @prompt-id forge-v4.1:feature:adaptive-navigation:001
 * @generated-at 2024-01-16T00:00:00Z
 * @model claude-3-opus
 */

data class NavDestination(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector = icon
)

val TOP_LEVEL_DESTINATIONS = listOf(
    NavDestination("projects", "Projects", Icons.Default.Folder, Icons.Default.Folder),
    NavDestination("editor", "Editor", Icons.Default.Code, Icons.Default.Code),
    NavDestination("terminal", "Terminal", Icons.Default.Terminal, Icons.Default.Terminal),
    NavDestination("git", "Git", Icons.Default.AccountTree, Icons.Default.AccountTree),
    NavDestination("settings", "Settings", Icons.Default.Settings, Icons.Default.Settings)
)

/**
 * Adaptive navigation that switches between bottom bar, nav rail, and nav drawer
 * based on device layout type.
 */
@Composable
fun AdaptiveNavigation(
    layoutType: AdaptiveLayoutType,
    currentRoute: String,
    onNavigate: (String) -> Unit,
    content: @Composable () -> Unit
) {
    when (layoutType) {
        AdaptiveLayoutType.COMPACT -> {
            // Bottom navigation bar for phones
            Scaffold(
                bottomBar = {
                    NavigationBar {
                        TOP_LEVEL_DESTINATIONS.forEach { dest ->
                            NavigationBarItem(
                                selected = currentRoute == dest.route,
                                onClick = { onNavigate(dest.route) },
                                icon = {
                                    Icon(
                                        if (currentRoute == dest.route) dest.selectedIcon else dest.icon,
                                        contentDescription = dest.label
                                    )
                                },
                                label = { Text(dest.label) }
                            )
                        }
                    }
                }
            ) { padding ->
                Box(modifier = Modifier.padding(padding)) {
                    content()
                }
            }
        }

        AdaptiveLayoutType.MEDIUM,
        AdaptiveLayoutType.FOLDABLE_BOOK,
        AdaptiveLayoutType.FOLDABLE_TABLETOP -> {
            // Navigation rail for medium screens and foldables
            Row(modifier = Modifier.fillMaxSize()) {
                NavigationRail {
                    Spacer(modifier = Modifier.weight(1f))
                    TOP_LEVEL_DESTINATIONS.forEach { dest ->
                        NavigationRailItem(
                            selected = currentRoute == dest.route,
                            onClick = { onNavigate(dest.route) },
                            icon = {
                                Icon(
                                    if (currentRoute == dest.route) dest.selectedIcon else dest.icon,
                                    contentDescription = dest.label
                                )
                            },
                            label = { Text(dest.label) }
                        )
                    }
                    Spacer(modifier = Modifier.weight(1f))
                }
                content()
            }
        }

        AdaptiveLayoutType.EXPANDED -> {
            // Permanent nav drawer for tablets/desktops
            PermanentNavigationDrawer(
                drawerContent = {
                    PermanentDrawerSheet(modifier = Modifier.width(240.dp)) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Claude Context",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 28.dp, vertical = 8.dp)
                        )
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        TOP_LEVEL_DESTINATIONS.forEach { dest ->
                            NavigationDrawerItem(
                                selected = currentRoute == dest.route,
                                onClick = { onNavigate(dest.route) },
                                icon = {
                                    Icon(
                                        if (currentRoute == dest.route) dest.selectedIcon else dest.icon,
                                        contentDescription = dest.label
                                    )
                                },
                                label = { Text(dest.label) },
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )
                        }
                    }
                }
            ) {
                content()
            }
        }
    }
}
