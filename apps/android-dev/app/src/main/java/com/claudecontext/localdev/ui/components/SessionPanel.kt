package com.claudecontext.localdev.ui.components

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.claudecontext.localdev.service.session.*

@Composable
fun SessionPanel(
    state: SessionManagerState,
    onCreateSession: (String) -> Unit,
    onSwitchSession: (String) -> Unit,
    onDeleteSession: (String) -> Unit,
    onArchiveSession: (String) -> Unit,
    onDuplicateSession: (String) -> Unit,
    onSearchSessions: (String) -> Unit,
    onCreateBranch: (String, String) -> Unit,
    onSwitchBranch: (String, String?) -> Unit,
    onCreateCheckpoint: (String, String) -> Unit,
    onRestoreCheckpoint: (String, String) -> Unit,
    onExportSession: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var showNewSession by remember { mutableStateOf(false) }
    var newSessionTitle by remember { mutableStateOf("") }
    var selectedSessionForBranch by remember { mutableStateOf<String?>(null) }
    var newBranchName by remember { mutableStateOf("") }

    Column(modifier = modifier.padding(12.dp)) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Sessions",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = { showNewSession = !showNewSession }) {
                Icon(Icons.Default.Add, "New Session")
            }
        }

        // New session input
        if (showNewSession) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = newSessionTitle,
                    onValueChange = { newSessionTitle = it },
                    placeholder = { Text("Session title...") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.width(4.dp))
                FilledTonalButton(
                    onClick = {
                        if (newSessionTitle.isNotBlank()) {
                            onCreateSession(newSessionTitle)
                            newSessionTitle = ""
                            showNewSession = false
                        }
                    },
                    enabled = newSessionTitle.isNotBlank()
                ) {
                    Text("Create", style = MaterialTheme.typography.labelSmall)
                }
            }
        }

        // Search
        OutlinedTextField(
            value = searchQuery,
            onValueChange = {
                searchQuery = it
                onSearchSessions(it)
            },
            placeholder = { Text("Search sessions...") },
            leadingIcon = { Icon(Icons.Default.Search, "Search", Modifier.size(18.dp)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            textStyle = MaterialTheme.typography.bodySmall
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Session list
        val sessions = if (searchQuery.isNotEmpty()) state.searchResults else state.recentSessions
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(sessions, key = { it.id }) { session ->
                SessionCard(
                    session = session,
                    isActive = session.id == state.activeSessionId,
                    onSelect = { onSwitchSession(session.id) },
                    onDelete = { onDeleteSession(session.id) },
                    onArchive = { onArchiveSession(session.id) },
                    onDuplicate = { onDuplicateSession(session.id) },
                    onExport = { onExportSession(session.id) },
                    onCreateBranch = {
                        selectedSessionForBranch = session.id
                    },
                    onSwitchBranch = { branchId -> onSwitchBranch(session.id, branchId) }
                )
            }
        }

        // Branch creation dialog
        if (selectedSessionForBranch != null) {
            AlertDialog(
                onDismissRequest = { selectedSessionForBranch = null },
                title = { Text("Create Branch") },
                text = {
                    OutlinedTextField(
                        value = newBranchName,
                        onValueChange = { newBranchName = it },
                        placeholder = { Text("Branch name...") },
                        singleLine = true
                    )
                },
                confirmButton = {
                    TextButton(onClick = {
                        selectedSessionForBranch?.let { onCreateBranch(it, newBranchName) }
                        newBranchName = ""
                        selectedSessionForBranch = null
                    }) { Text("Create") }
                },
                dismissButton = {
                    TextButton(onClick = { selectedSessionForBranch = null }) { Text("Cancel") }
                }
            )
        }
    }
}

@Composable
private fun SessionCard(
    session: Session,
    isActive: Boolean,
    onSelect: () -> Unit,
    onDelete: () -> Unit,
    onArchive: () -> Unit,
    onDuplicate: () -> Unit,
    onExport: () -> Unit,
    onCreateBranch: () -> Unit,
    onSwitchBranch: (String?) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        session.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Mode chip
                        Surface(
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                session.mode.displayName,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        // Message count
                        Text(
                            "${session.messages.size} msgs",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        // Branch indicator
                        if (session.branches.isNotEmpty()) {
                            Icon(
                                Icons.Default.AccountTree,
                                "Branches",
                                modifier = Modifier.size(12.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                "${session.branches.size}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        // Status
                        if (session.status != SessionStatus.ACTIVE) {
                            Surface(
                                color = when (session.status) {
                                    SessionStatus.ARCHIVED -> MaterialTheme.colorScheme.surfaceVariant
                                    SessionStatus.COMPLETED -> MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                                    SessionStatus.FAILED -> MaterialTheme.colorScheme.error.copy(alpha = 0.2f)
                                    else -> MaterialTheme.colorScheme.surfaceVariant
                                },
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    session.status.name.lowercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                            }
                        }
                    }
                }
                IconButton(onClick = { expanded = !expanded }, modifier = Modifier.size(24.dp)) {
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        "More",
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            // Tags
            if (session.tags.isNotEmpty()) {
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    session.tags.take(3).forEach { tag ->
                        Surface(
                            color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                "#$tag",
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                }
            }

            // Expanded actions
            if (expanded) {
                Spacer(modifier = Modifier.height(6.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(4.dp))

                // Branches section
                if (session.branches.isNotEmpty()) {
                    Text("Branches:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                    Row(
                        modifier = Modifier.padding(vertical = 2.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        FilterChip(
                            selected = session.activeBranchId == null,
                            onClick = { onSwitchBranch(null) },
                            label = { Text("main", style = MaterialTheme.typography.labelSmall) }
                        )
                        session.branches.forEach { branch ->
                            FilterChip(
                                selected = session.activeBranchId == branch.id,
                                onClick = { onSwitchBranch(branch.id) },
                                label = { Text(branch.name, style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }
                }

                // Checkpoints
                if (session.checkpoints.isNotEmpty()) {
                    Text("Checkpoints: ${session.checkpoints.size}", style = MaterialTheme.typography.labelSmall)
                }

                // Actions row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    TextButton(onClick = onCreateBranch, modifier = Modifier.height(32.dp)) {
                        Icon(Icons.Default.AccountTree, null, Modifier.size(14.dp))
                        Spacer(Modifier.width(2.dp))
                        Text("Branch", style = MaterialTheme.typography.labelSmall)
                    }
                    TextButton(onClick = onDuplicate, modifier = Modifier.height(32.dp)) {
                        Icon(Icons.Default.ContentCopy, null, Modifier.size(14.dp))
                        Spacer(Modifier.width(2.dp))
                        Text("Copy", style = MaterialTheme.typography.labelSmall)
                    }
                    TextButton(onClick = onExport, modifier = Modifier.height(32.dp)) {
                        Icon(Icons.Default.FileDownload, null, Modifier.size(14.dp))
                        Spacer(Modifier.width(2.dp))
                        Text("Export", style = MaterialTheme.typography.labelSmall)
                    }
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = onArchive, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Archive, "Archive", Modifier.size(14.dp))
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Delete, "Delete", Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
    }
}
