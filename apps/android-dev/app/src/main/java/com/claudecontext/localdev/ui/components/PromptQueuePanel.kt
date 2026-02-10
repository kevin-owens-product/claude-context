package com.claudecontext.localdev.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claudecontext.localdev.data.models.*

@Composable
fun PromptQueuePanel(
    queueState: PromptQueueState?,
    onEnqueue: (String, AiMode, QueuePriority) -> Unit,
    onRemove: (String) -> Unit,
    onStartProcessing: () -> Unit,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onRetryFailed: (String) -> Unit,
    onRetryAllFailed: () -> Unit,
    onSetExecutionMode: (QueueExecutionMode) -> Unit,
    onSetPriority: (String, QueuePriority) -> Unit,
    modifier: Modifier = Modifier
) {
    var promptInput by remember { mutableStateOf("") }
    var selectedMode by remember { mutableStateOf(AiMode.AGENT) }
    var selectedPriority by remember { mutableStateOf(QueuePriority.NORMAL) }
    var showAddForm by remember { mutableStateOf(false) }

    val state = queueState ?: PromptQueueState()

    Column(modifier = modifier.animateContentSize()) {
        // Queue status header
        QueueStatusBar(state, onSetExecutionMode)

        // Queue items
        if (state.items.isNotEmpty()) {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(state.items) { item ->
                    QueueItemCard(
                        item = item,
                        onRemove = { onRemove(item.id) },
                        onRetry = { onRetryFailed(item.id) },
                        onSetPriority = { priority -> onSetPriority(item.id, priority) }
                    )
                }
            }
        } else {
            // Empty state
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Queue,
                        null,
                        modifier = Modifier.size(40.dp),
                        tint = Color(0xFF8B5CF6).copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Prompt Queue",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Queue multiple prompts for batch execution.\nSet priorities and dependencies between tasks.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 24.dp)
                    )
                }
            }
        }

        // Action buttons
        val hasFailedItems = state.items.any { it.status == QueuedPromptStatus.FAILED }
        val hasPendingItems = state.items.any { it.status == QueuedPromptStatus.PENDING }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            when (state.status) {
                QueueStatus.IDLE, QueueStatus.COMPLETED, QueueStatus.FAILED, QueueStatus.STOPPED -> {
                    if (hasPendingItems) {
                        Button(
                            onClick = onStartProcessing,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6))
                        ) {
                            Icon(Icons.Default.PlayArrow, null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Process Queue")
                        }
                    }
                    if (hasFailedItems) {
                        OutlinedButton(
                            onClick = onRetryAllFailed,
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Refresh, null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Retry Failed")
                        }
                    }
                }
                QueueStatus.RUNNING -> {
                    Button(
                        onClick = onPause,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706))
                    ) {
                        Icon(Icons.Default.Pause, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Pause")
                    }
                }
                QueueStatus.PAUSED -> {
                    Button(
                        onClick = onResume,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                    ) {
                        Icon(Icons.Default.PlayArrow, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Resume")
                    }
                }
            }
        }

        // Add prompt form
        if (showAddForm) {
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Column(modifier = Modifier.padding(8.dp)) {
                    // Mode selector
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        listOf(AiMode.AGENT, AiMode.DEBUG, AiMode.PLAN).forEach { mode ->
                            FilterChip(
                                selected = mode == selectedMode,
                                onClick = { selectedMode = mode },
                                label = { Text(mode.displayName, style = MaterialTheme.typography.labelSmall) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Priority selector
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        QueuePriority.entries.forEach { priority ->
                            val color = when (priority) {
                                QueuePriority.CRITICAL -> Color(0xFFEF4444)
                                QueuePriority.HIGH -> Color(0xFFD97706)
                                QueuePriority.NORMAL -> Color(0xFF6366F1)
                                QueuePriority.LOW -> Color(0xFF8B949E)
                            }
                            FilterChip(
                                selected = priority == selectedPriority,
                                onClick = { selectedPriority = priority },
                                label = { Text(priority.displayName, style = MaterialTheme.typography.labelSmall) },
                                modifier = Modifier.weight(1f),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = color.copy(alpha = 0.15f),
                                    selectedLabelColor = color
                                )
                            )
                        }
                    }
                }
            }
        }

        // Input bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = { showAddForm = !showAddForm },
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    if (showAddForm) Icons.Default.ExpandMore else Icons.Default.Tune,
                    "Options",
                    tint = Color(0xFF8B5CF6)
                )
            }
            OutlinedTextField(
                value = promptInput,
                onValueChange = { promptInput = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Add prompt to queue...") },
                maxLines = 3,
                textStyle = MaterialTheme.typography.bodySmall
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = {
                    if (promptInput.isNotBlank()) {
                        onEnqueue(promptInput, selectedMode, selectedPriority)
                        promptInput = ""
                    }
                },
                enabled = promptInput.isNotBlank()
            ) {
                Icon(Icons.Default.Add, "Add to Queue", tint = Color(0xFF8B5CF6))
            }
        }
    }
}

@Composable
private fun QueueStatusBar(
    state: PromptQueueState,
    onSetExecutionMode: (QueueExecutionMode) -> Unit
) {
    val (statusText, statusColor) = when (state.status) {
        QueueStatus.IDLE -> "Idle" to MaterialTheme.colorScheme.onSurfaceVariant
        QueueStatus.RUNNING -> "Processing..." to Color(0xFF8B5CF6)
        QueueStatus.PAUSED -> "Paused" to Color(0xFFD97706)
        QueueStatus.STOPPED -> "Stopped" to Color(0xFF8B949E)
        QueueStatus.COMPLETED -> "All done" to Color(0xFF10B981)
        QueueStatus.FAILED -> "Some failed" to Color(0xFFEF4444)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (state.status == QueueStatus.RUNNING) {
                CircularProgressIndicator(
                    modifier = Modifier.size(14.dp),
                    strokeWidth = 2.dp,
                    color = statusColor
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                statusText,
                style = MaterialTheme.typography.labelMedium,
                color = statusColor,
                fontWeight = FontWeight.SemiBold
            )
        }
        Text(
            "${state.completedCount}/${state.totalCount} | ${state.executionMode.displayName}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    // Progress bar
    if (state.totalCount > 0) {
        val progress = state.completedCount.toFloat() / state.totalCount
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp)),
            color = Color(0xFF8B5CF6)
        )
    }

    // Execution mode selector
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        QueueExecutionMode.entries.forEach { mode ->
            FilterChip(
                selected = mode == state.executionMode,
                onClick = { onSetExecutionMode(mode) },
                label = { Text(mode.displayName, style = MaterialTheme.typography.labelSmall) },
                modifier = Modifier.weight(1f),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF8B5CF6).copy(alpha = 0.15f),
                    selectedLabelColor = Color(0xFF8B5CF6)
                ),
                enabled = state.status != QueueStatus.RUNNING
            )
        }
    }
}

@Composable
private fun QueueItemCard(
    item: QueuedPrompt,
    onRemove: () -> Unit,
    onRetry: () -> Unit,
    onSetPriority: (QueuePriority) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    val statusColor = when (item.status) {
        QueuedPromptStatus.PENDING -> Color(0xFF8B949E)
        QueuedPromptStatus.RUNNING -> Color(0xFF8B5CF6)
        QueuedPromptStatus.COMPLETED -> Color(0xFF10B981)
        QueuedPromptStatus.FAILED -> Color(0xFFEF4444)
        QueuedPromptStatus.SKIPPED -> Color(0xFF8B949E)
        QueuedPromptStatus.BLOCKED -> Color(0xFFD97706)
        QueuedPromptStatus.RETRYING -> Color(0xFFF59E0B)
    }

    val statusIcon = when (item.status) {
        QueuedPromptStatus.PENDING -> Icons.Default.Schedule
        QueuedPromptStatus.RUNNING -> Icons.Default.Sync
        QueuedPromptStatus.COMPLETED -> Icons.Default.CheckCircle
        QueuedPromptStatus.FAILED -> Icons.Default.Error
        QueuedPromptStatus.SKIPPED -> Icons.Default.SkipNext
        QueuedPromptStatus.BLOCKED -> Icons.Default.Block
        QueuedPromptStatus.RETRYING -> Icons.Default.Refresh
    }

    val priorityColor = when (item.priority) {
        QueuePriority.CRITICAL -> Color(0xFFEF4444)
        QueuePriority.HIGH -> Color(0xFFD97706)
        QueuePriority.NORMAL -> Color(0xFF6366F1)
        QueuePriority.LOW -> Color(0xFF8B949E)
    }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Priority indicator
                Box(
                    modifier = Modifier
                        .size(4.dp, 24.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(priorityColor)
                )
                Spacer(modifier = Modifier.width(8.dp))

                // Status icon
                if (item.status == QueuedPromptStatus.RUNNING) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        strokeWidth = 2.dp,
                        color = statusColor
                    )
                } else {
                    Icon(statusIcon, null, tint = statusColor, modifier = Modifier.size(14.dp))
                }
                Spacer(modifier = Modifier.width(8.dp))

                // Prompt text
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        item.prompt,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        maxLines = if (expanded) Int.MAX_VALUE else 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Mode badge
                        Text(
                            item.mode.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        // Priority badge
                        Text(
                            item.priority.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = priorityColor
                        )
                        // Retry count
                        if (item.retryCount > 0) {
                            Text(
                                "retry ${item.retryCount}/${item.maxRetries}",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFFF59E0B)
                            )
                        }
                    }
                }

                // Duration
                item.result?.let { result ->
                    if (result.durationMs > 0) {
                        Text(
                            "${result.durationMs / 1000}s",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                }

                // Actions
                if (item.status == QueuedPromptStatus.PENDING) {
                    IconButton(onClick = onRemove, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, "Remove", modifier = Modifier.size(14.dp))
                    }
                }
                if (item.status == QueuedPromptStatus.FAILED) {
                    IconButton(onClick = onRetry, modifier = Modifier.size(24.dp)) {
                        Icon(
                            Icons.Default.Refresh, "Retry",
                            modifier = Modifier.size(14.dp),
                            tint = Color(0xFFF59E0B)
                        )
                    }
                }
            }

            // Expanded: show result
            if (expanded && item.result != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    color = Color(0xFF0D1117),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Column(modifier = Modifier.padding(8.dp)) {
                        if (item.result!!.error != null) {
                            Text(
                                "Error: ${item.result!!.error}",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 10.sp,
                                    color = Color(0xFFEF4444)
                                )
                            )
                        }
                        if (item.result!!.output.isNotEmpty()) {
                            Text(
                                item.result!!.output.take(400),
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 10.sp,
                                    color = Color(0xFFC9D1D9)
                                )
                            )
                        }
                        if (item.result!!.filesModified.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Files: ${item.result!!.filesModified.joinToString(", ")}",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF10B981)
                            )
                        }
                    }
                }
            }
        }
    }
}
