package com.claudecontext.localdev.ui.adaptive

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/**
 * @prompt-id forge-v4.1:feature:adaptive-sidebar:001
 * @generated-at 2024-01-16T00:00:00Z
 * @model claude-3-opus
 */

data class SidebarNavItem(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val badge: Int? = null
)

/**
 * Collapsible sidebar for tablet/desktop layouts.
 * Shows icons only when collapsed, full labels when expanded.
 */
@Composable
fun AdaptiveSidebar(
    items: List<SidebarNavItem>,
    selectedId: String,
    onItemSelected: (String) -> Unit,
    isExpanded: Boolean,
    onToggleExpanded: () -> Unit,
    fileTree: List<FileTreeNode> = emptyList(),
    onFileSelected: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        tonalElevation = 1.dp
    ) {
        Column(modifier = Modifier.fillMaxHeight()) {
            // Header with collapse toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = if (isExpanded) Arrangement.SpaceBetween else Arrangement.Center
            ) {
                if (isExpanded) {
                    Text(
                        "Claude Context",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                IconButton(onClick = onToggleExpanded) {
                    Icon(
                        if (isExpanded) Icons.Default.MenuOpen else Icons.Default.Menu,
                        contentDescription = "Toggle sidebar"
                    )
                }
            }

            HorizontalDivider()

            // Navigation items
            items.forEach { item ->
                val isSelected = item.id == selectedId
                SidebarItem(
                    item = item,
                    isSelected = isSelected,
                    isExpanded = isExpanded,
                    onClick = { onItemSelected(item.id) }
                )
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // File tree (only when expanded)
            if (isExpanded) {
                Text(
                    "Files",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
                LazyColumn(
                    modifier = Modifier.weight(1f)
                ) {
                    items(fileTree) { node ->
                        FileTreeItem(
                            node = node,
                            onClick = { onFileSelected(node.path) }
                        )
                    }
                }
            } else {
                Spacer(modifier = Modifier.weight(1f))
            }

            // Bottom actions
            HorizontalDivider()
            SidebarItem(
                item = SidebarNavItem("settings", "Settings", Icons.Default.Settings),
                isSelected = selectedId == "settings",
                isExpanded = isExpanded,
                onClick = { onItemSelected("settings") }
            )
        }
    }
}

@Composable
private fun SidebarItem(
    item: SidebarNavItem,
    isSelected: Boolean,
    isExpanded: Boolean,
    onClick: () -> Unit
) {
    val backgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.secondaryContainer
    } else {
        MaterialTheme.colorScheme.surfaceContainerLow
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 2.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(backgroundColor)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            item.icon,
            contentDescription = item.label,
            modifier = Modifier.size(20.dp),
            tint = if (isSelected)
                MaterialTheme.colorScheme.onSecondaryContainer
            else
                MaterialTheme.colorScheme.onSurfaceVariant
        )

        if (isExpanded) {
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                item.label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (isSelected)
                    MaterialTheme.colorScheme.onSecondaryContainer
                else
                    MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            item.badge?.let { count ->
                Badge(
                    containerColor = MaterialTheme.colorScheme.error
                ) {
                    Text("$count")
                }
            }
        }
    }
}

data class FileTreeNode(
    val name: String,
    val path: String,
    val isDirectory: Boolean,
    val depth: Int = 0,
    val isExpanded: Boolean = false
)

@Composable
private fun FileTreeItem(
    node: FileTreeNode,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(
                start = (16 + node.depth * 16).dp,
                end = 8.dp,
                top = 4.dp,
                bottom = 4.dp
            ),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            if (node.isDirectory) {
                if (node.isExpanded) Icons.Default.FolderOpen else Icons.Default.Folder
            } else {
                Icons.Default.InsertDriveFile
            },
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = if (node.isDirectory)
                MaterialTheme.colorScheme.primary
            else
                MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            node.name,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
