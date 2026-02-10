package com.claudecontext.localdev.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.claudecontext.localdev.service.design.*

@Composable
fun DesignPanel(
    state: DesignManagerState,
    onSetTheme: (String) -> Unit,
    onCreateTheme: (String) -> Unit,
    onDeleteTheme: (String) -> Unit,
    onSetLayout: (String) -> Unit,
    onTogglePanel: (String) -> Unit,
    onSetEditorFontSize: (Int) -> Unit,
    onSetTabSize: (Int) -> Unit,
    onSetShowMinimap: (Boolean) -> Unit,
    onSetShowBreadcrumbs: (Boolean) -> Unit,
    onSetShowIndentGuides: (Boolean) -> Unit,
    onSetBracketPairColorization: (Boolean) -> Unit,
    onSetCursorStyle: (CursorStyle) -> Unit,
    onSetCursorBlinking: (CursorBlinking) -> Unit,
    onSetRenderWhitespace: (WhitespaceRender) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Themes", "Layout", "Editor")

    Column(modifier = modifier.padding(12.dp)) {
        Text(
            "Design Manager",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Tab row
        TabRow(selectedTabIndex = selectedTab) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(title, style = MaterialTheme.typography.labelSmall) }
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        when (selectedTab) {
            0 -> ThemesTab(state, onSetTheme, onCreateTheme, onDeleteTheme)
            1 -> LayoutTab(state, onSetLayout, onTogglePanel)
            2 -> EditorTab(
                state, onSetEditorFontSize, onSetTabSize, onSetShowMinimap,
                onSetShowBreadcrumbs, onSetShowIndentGuides, onSetBracketPairColorization,
                onSetCursorStyle, onSetCursorBlinking, onSetRenderWhitespace
            )
        }
    }
}

@Composable
private fun ThemesTab(
    state: DesignManagerState,
    onSetTheme: (String) -> Unit,
    onCreateTheme: (String) -> Unit,
    onDeleteTheme: (String) -> Unit
) {
    var newThemeName by remember { mutableStateOf("") }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Current theme preview
        item {
            ThemePreview(state.activeTheme)
        }

        // Theme list
        item {
            Text(
                "Available Themes",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        items(state.themes) { theme ->
            ThemeCard(
                theme = theme,
                isActive = theme.id == state.activeTheme.id,
                onSelect = { onSetTheme(theme.id) },
                onDelete = if (!theme.isBuiltIn) {{ onDeleteTheme(theme.id) }} else null
            )
        }

        // Create new theme
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = newThemeName,
                    onValueChange = { newThemeName = it },
                    placeholder = { Text("New theme name...") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.width(4.dp))
                FilledTonalButton(
                    onClick = {
                        if (newThemeName.isNotBlank()) {
                            onCreateTheme(newThemeName)
                            newThemeName = ""
                        }
                    },
                    enabled = newThemeName.isNotBlank()
                ) {
                    Text("Create", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
private fun ThemePreview(theme: DesignTheme) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(
                "Preview: ${theme.name}",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(6.dp))

            // Color swatches
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                ColorSwatch(theme.colors.primary, "Primary")
                ColorSwatch(theme.colors.secondary, "Secondary")
                ColorSwatch(theme.colors.success, "Success")
                ColorSwatch(theme.colors.warning, "Warning")
                ColorSwatch(theme.colors.error, "Error")
                ColorSwatch(theme.colors.info, "Info")
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Syntax color swatches
            Text("Syntax", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                ColorSwatch(theme.colors.syntaxKeyword, "Keyword")
                ColorSwatch(theme.colors.syntaxString, "String")
                ColorSwatch(theme.colors.syntaxFunction, "Function")
                ColorSwatch(theme.colors.syntaxType, "Type")
                ColorSwatch(theme.colors.syntaxNumber, "Number")
                ColorSwatch(theme.colors.syntaxComment, "Comment")
            }
        }
    }
}

@Composable
private fun ColorSwatch(hexColor: String, label: String) {
    val color = try {
        Color(android.graphics.Color.parseColor(hexColor.take(7)))
    } catch (e: Exception) {
        Color.Gray
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(color)
                .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), CircleShape)
        )
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ThemeCard(
    theme: DesignTheme,
    isActive: Boolean,
    onSelect: () -> Unit,
    onDelete: (() -> Unit)?
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(6.dp)
    ) {
        Row(
            modifier = Modifier.padding(10.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Mini color preview
                Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    listOf(theme.colors.primary, theme.colors.background, theme.colors.syntaxKeyword)
                        .forEach { hex ->
                            val color = try { Color(android.graphics.Color.parseColor(hex.take(7))) } catch (e: Exception) { Color.Gray }
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(color)
                            )
                        }
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        theme.name,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal
                    )
                    Text(
                        if (theme.isDark) "Dark" else "Light",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Row {
                if (isActive) {
                    Icon(Icons.Default.Check, "Active", Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                }
                if (onDelete != null) {
                    IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Delete, "Delete", Modifier.size(14.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun LayoutTab(
    state: DesignManagerState,
    onSetLayout: (String) -> Unit,
    onTogglePanel: (String) -> Unit
) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        // Layout presets
        item {
            Text(
                "Layout Presets",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold
            )
        }

        items(state.layouts) { layout ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSetLayout(layout.id) },
                colors = CardDefaults.cardColors(
                    containerColor = if (layout.id == state.activeLayout.id)
                        MaterialTheme.colorScheme.primaryContainer
                    else MaterialTheme.colorScheme.surfaceVariant
                ),
                shape = RoundedCornerShape(6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(10.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(layout.name, style = MaterialTheme.typography.bodySmall,
                            fontWeight = if (layout.id == state.activeLayout.id) FontWeight.Bold else FontWeight.Normal)
                        Text("${layout.panels.count { it.visible }} panels",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (layout.id == state.activeLayout.id) {
                        Icon(Icons.Default.Check, "Active", Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }

        // Panel toggles for active layout
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Active Panels",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold
            )
        }

        items(state.activeLayout.panels) { panel ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(panel.type.displayName, style = MaterialTheme.typography.bodySmall)
                Switch(
                    checked = panel.visible,
                    onCheckedChange = { onTogglePanel(panel.id) }
                )
            }
        }
    }
}

@Composable
private fun EditorTab(
    state: DesignManagerState,
    onSetEditorFontSize: (Int) -> Unit,
    onSetTabSize: (Int) -> Unit,
    onSetShowMinimap: (Boolean) -> Unit,
    onSetShowBreadcrumbs: (Boolean) -> Unit,
    onSetShowIndentGuides: (Boolean) -> Unit,
    onSetBracketPairColorization: (Boolean) -> Unit,
    onSetCursorStyle: (CursorStyle) -> Unit,
    onSetCursorBlinking: (CursorBlinking) -> Unit,
    onSetRenderWhitespace: (WhitespaceRender) -> Unit
) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        // Font size
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Font Size", style = MaterialTheme.typography.bodySmall)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { onSetEditorFontSize(state.activeTheme.typography.editorFontSize - 1) },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(Icons.Default.Remove, "Decrease", Modifier.size(14.dp))
                    }
                    Text(
                        "${state.activeTheme.typography.editorFontSize}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(
                        onClick = { onSetEditorFontSize(state.activeTheme.typography.editorFontSize + 1) },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(Icons.Default.Add, "Increase", Modifier.size(14.dp))
                    }
                }
            }
        }

        // Tab size
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Tab Size", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf(2, 4, 8).forEach { size ->
                        FilterChip(
                            selected = state.activeTheme.spacing.tabSize == size,
                            onClick = { onSetTabSize(size) },
                            label = { Text("$size", style = MaterialTheme.typography.labelSmall) },
                            modifier = Modifier.height(28.dp)
                        )
                    }
                }
            }
        }

        // Toggles
        item { SettingToggle("Minimap", state.showMinimap, onSetShowMinimap) }
        item { SettingToggle("Breadcrumbs", state.showBreadcrumbs, onSetShowBreadcrumbs) }
        item { SettingToggle("Indent Guides", state.showIndentGuides, onSetShowIndentGuides) }
        item { SettingToggle("Bracket Pair Colors", state.bracketPairColorization, onSetBracketPairColorization) }

        // Cursor style
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Cursor Style", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    CursorStyle.entries.forEach { style ->
                        FilterChip(
                            selected = state.cursorStyle == style,
                            onClick = { onSetCursorStyle(style) },
                            label = { Text(style.name.lowercase().replaceFirstChar { it.uppercase() },
                                style = MaterialTheme.typography.labelSmall) },
                            modifier = Modifier.height(28.dp)
                        )
                    }
                }
            }
        }

        // Whitespace rendering
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Whitespace", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    WhitespaceRender.entries.forEach { render ->
                        FilterChip(
                            selected = state.renderWhitespace == render,
                            onClick = { onSetRenderWhitespace(render) },
                            label = { Text(render.name.lowercase().replaceFirstChar { it.uppercase() },
                                style = MaterialTheme.typography.labelSmall) },
                            modifier = Modifier.height(28.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingToggle(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
