package com.claudecontext.localdev.ui.components

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.claudecontext.localdev.service.context.*

@Composable
fun ContextPanel(
    state: ContextManagerState,
    onAddFile: (String) -> Unit,
    onAddNote: (String, String) -> Unit,
    onRemoveEntry: (String) -> Unit,
    onPinEntry: (String, Boolean) -> Unit,
    onSetPriority: (String, ContextPriority) -> Unit,
    onSetStrategy: (ContextStrategy) -> Unit,
    onSetMaxBudget: (Int) -> Unit,
    onClearAll: () -> Unit,
    onClearByType: (ContextType) -> Unit,
    modifier: Modifier = Modifier
) {
    var showAddNote by remember { mutableStateOf(false) }
    var noteTitle by remember { mutableStateOf("") }
    var noteContent by remember { mutableStateOf("") }

    Column(modifier = modifier.padding(12.dp)) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Context Window",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Row {
                IconButton(onClick = { showAddNote = !showAddNote }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.NoteAdd, "Add Note", Modifier.size(18.dp))
                }
                IconButton(onClick = onClearAll, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.ClearAll, "Clear", Modifier.size(18.dp))
                }
            }
        }

        // Token budget bar
        val budget = state.budget
        Column(modifier = Modifier.padding(vertical = 4.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "${budget.usedTokens.formatTokens()} / ${budget.maxTokens.formatTokens()} tokens",
                    style = MaterialTheme.typography.labelSmall
                )
                Text(
                    "${(budget.usagePercent * 100).toInt()}% used",
                    style = MaterialTheme.typography.labelSmall,
                    color = when {
                        budget.usagePercent > 0.9f -> MaterialTheme.colorScheme.error
                        budget.usagePercent > 0.7f -> Color(0xFFF59E0B)
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            }
            LinearProgressIndicator(
                progress = { budget.usagePercent.coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().height(6.dp),
                color = when {
                    budget.usagePercent > 0.9f -> MaterialTheme.colorScheme.error
                    budget.usagePercent > 0.7f -> Color(0xFFF59E0B)
                    else -> MaterialTheme.colorScheme.primary
                },
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )
        }

        // Strategy selector
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            ContextStrategy.entries.forEach { strategy ->
                FilterChip(
                    selected = state.contextStrategy == strategy,
                    onClick = { onSetStrategy(strategy) },
                    label = {
                        Text(
                            strategy.displayName,
                            style = MaterialTheme.typography.labelSmall
                        )
                    },
                    modifier = Modifier.height(28.dp)
                )
            }
        }

        // Add note input
        if (showAddNote) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
            ) {
                OutlinedTextField(
                    value = noteTitle,
                    onValueChange = { noteTitle = it },
                    placeholder = { Text("Note title") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = noteContent,
                    onValueChange = { noteContent = it },
                    placeholder = { Text("Note content...") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3,
                    textStyle = MaterialTheme.typography.bodySmall
                )
                FilledTonalButton(
                    onClick = {
                        if (noteTitle.isNotBlank() && noteContent.isNotBlank()) {
                            onAddNote(noteContent, noteTitle)
                            noteTitle = ""
                            noteContent = ""
                            showAddNote = false
                        }
                    },
                    modifier = Modifier.align(Alignment.End).padding(top = 4.dp)
                ) {
                    Text("Add Note", style = MaterialTheme.typography.labelSmall)
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Context entries grouped by type
        val groupedEntries = state.entries.groupBy { it.type }

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            groupedEntries.forEach { (type, entries) ->
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "${type.displayName} (${entries.size})",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        TextButton(
                            onClick = { onClearByType(type) },
                            modifier = Modifier.height(24.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                        ) {
                            Text("Clear", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }

                items(entries, key = { it.id }) { entry ->
                    ContextEntryCard(
                        entry = entry,
                        onRemove = { onRemoveEntry(entry.id) },
                        onPin = { onPinEntry(entry.id, !entry.pinned) },
                        onSetPriority = { onSetPriority(entry.id, it) }
                    )
                }
            }
        }
    }
}

@Composable
private fun ContextEntryCard(
    entry: ContextEntry,
    onRemove: () -> Unit,
    onPin: () -> Unit,
    onSetPriority: (ContextPriority) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (entry.pinned)
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
            else
                MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(6.dp)
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        when (entry.type) {
                            ContextType.FILE, ContextType.FILE_SNIPPET -> Icons.Default.Description
                            ContextType.DIRECTORY_TREE -> Icons.Default.FolderOpen
                            ContextType.GIT_DIFF -> Icons.Default.Compare
                            ContextType.ERROR_LOG -> Icons.Default.Error
                            ContextType.TERMINAL_OUTPUT -> Icons.Default.Terminal
                            ContextType.USER_NOTE -> Icons.Default.Note
                            ContextType.CONVERSATION_SUMMARY -> Icons.Default.Chat
                            else -> Icons.Default.Article
                        },
                        entry.type.displayName,
                        modifier = Modifier.size(14.dp),
                        tint = when (entry.priority) {
                            ContextPriority.CRITICAL -> MaterialTheme.colorScheme.error
                            ContextPriority.HIGH -> Color(0xFFF59E0B)
                            ContextPriority.NORMAL -> MaterialTheme.colorScheme.primary
                            ContextPriority.LOW -> MaterialTheme.colorScheme.onSurfaceVariant
                            ContextPriority.BACKGROUND -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        }
                    )
                    Text(
                        entry.source.substringAfterLast("/"),
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (entry.pinned) {
                        Icon(Icons.Default.PushPin, "Pinned", Modifier.size(10.dp))
                    }
                }
                Row {
                    Text(
                        entry.tokenEstimate.formatTokens(),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    IconButton(onClick = onPin, modifier = Modifier.size(20.dp)) {
                        Icon(
                            if (entry.pinned) Icons.Default.PushPin else Icons.Default.PushPin,
                            "Pin",
                            Modifier.size(12.dp),
                            tint = if (entry.pinned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = onRemove, modifier = Modifier.size(20.dp)) {
                        Icon(Icons.Default.Close, "Remove", Modifier.size(12.dp))
                    }
                }
            }

            // Preview of content when expanded
            if (expanded) {
                Text(
                    entry.content.take(200) + if (entry.content.length > 200) "..." else "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}

private fun Int.formatTokens(): String {
    return when {
        this >= 1_000_000 -> "${this / 1_000_000}M"
        this >= 1_000 -> "${this / 1_000}k"
        else -> "$this"
    }
}
