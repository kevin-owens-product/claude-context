package com.claudecontext.localdev.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
fun SwarmPanel(
    session: SwarmSession?,
    onStartSwarm: (String, SwarmStrategy) -> Unit,
    onStop: () -> Unit,
    modifier: Modifier = Modifier
) {
    var goalInput by remember { mutableStateOf("") }
    var selectedStrategy by remember { mutableStateOf(SwarmStrategy.DIVIDE_AND_CONQUER) }
    var showStrategyPicker by remember { mutableStateOf(false) }

    Column(modifier = modifier.animateContentSize()) {
        if (session != null) {
            // Status header
            SwarmStatusBar(session)

            // Worker grid
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Subtask overview
                if (session.subtasks.isNotEmpty()) {
                    item {
                        Text(
                            "Subtasks",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                    items(session.subtasks) { subtask ->
                        SubtaskCard(subtask, session.workers)
                    }
                }

                // Worker status
                if (session.workers.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Workers",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                    items(session.workers) { worker ->
                        WorkerCard(worker)
                    }
                }

                // Merge result
                session.mergeResult?.let { merge ->
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        MergeResultCard(merge)
                    }
                }
            }

            // Stop button if running
            if (session.status in listOf(SwarmStatus.RUNNING, SwarmStatus.DECOMPOSING, SwarmStatus.PLANNING)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Button(
                        onClick = onStop,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                    ) {
                        Icon(Icons.Default.Stop, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Stop Swarm")
                    }
                }
            }
        } else {
            // Empty state + input
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Hub,
                        null,
                        modifier = Modifier.size(40.dp),
                        tint = Color(0xFFF59E0B).copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Swarm Mode",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Spawn multiple agents working in parallel.\nDescribe a complex goal and pick a strategy.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 24.dp)
                    )
                }
            }

            // Strategy picker
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                SwarmStrategy.entries.forEach { strategy ->
                    val isSelected = strategy == selectedStrategy
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedStrategy = strategy },
                        label = { Text(strategy.displayName, style = MaterialTheme.typography.labelSmall) },
                        modifier = Modifier.weight(1f),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFFF59E0B).copy(alpha = 0.15f),
                            selectedLabelColor = Color(0xFFF59E0B)
                        )
                    )
                }
            }

            // Input bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = goalInput,
                    onValueChange = { goalInput = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Describe the complex goal for the swarm...") },
                    maxLines = 3,
                    textStyle = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (goalInput.isNotBlank()) {
                            onStartSwarm(goalInput, selectedStrategy)
                            goalInput = ""
                        }
                    },
                    enabled = goalInput.isNotBlank()
                ) {
                    Icon(Icons.Default.Send, "Start Swarm", tint = Color(0xFFF59E0B))
                }
            }
        }
    }
}

@Composable
private fun SwarmStatusBar(session: SwarmSession) {
    val (statusText, statusColor) = when (session.status) {
        SwarmStatus.PLANNING -> "Planning..." to Color(0xFF6366F1)
        SwarmStatus.DECOMPOSING -> "Breaking down task..." to Color(0xFFF59E0B)
        SwarmStatus.RUNNING -> "Workers active" to Color(0xFF10B981)
        SwarmStatus.MERGING -> "Merging results..." to Color(0xFF6366F1)
        SwarmStatus.REVIEWING -> "Review needed" to Color(0xFFD97706)
        SwarmStatus.COMPLETED -> "Swarm completed" to Color(0xFF10B981)
        SwarmStatus.FAILED -> "Swarm failed" to Color(0xFFEF4444)
        SwarmStatus.STOPPED -> "Stopped" to Color(0xFF8B949E)
    }

    val activeCount = session.workers.count { it.status == SwarmWorkerStatus.RUNNING }
    val completedCount = session.workers.count { it.status == SwarmWorkerStatus.COMPLETED }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (session.status in listOf(SwarmStatus.RUNNING, SwarmStatus.DECOMPOSING, SwarmStatus.MERGING)) {
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
            "$activeCount active | $completedCount/${session.workers.size} done | ${session.strategy.displayName}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    // Progress bar
    if (session.workers.isNotEmpty()) {
        val progress = completedCount.toFloat() / session.workers.size
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp)),
            color = Color(0xFFF59E0B)
        )
    }
}

@Composable
private fun SubtaskCard(subtask: SwarmSubtask, workers: List<SwarmWorker>) {
    val statusColor = when (subtask.status) {
        PlanStepStatus.PENDING -> Color(0xFF8B949E)
        PlanStepStatus.IN_PROGRESS -> Color(0xFFF59E0B)
        PlanStepStatus.COMPLETED -> Color(0xFF10B981)
        PlanStepStatus.FAILED -> Color(0xFFEF4444)
        PlanStepStatus.SKIPPED -> Color(0xFF8B949E)
    }

    val statusIcon = when (subtask.status) {
        PlanStepStatus.PENDING -> Icons.Default.Schedule
        PlanStepStatus.IN_PROGRESS -> Icons.Default.Sync
        PlanStepStatus.COMPLETED -> Icons.Default.CheckCircle
        PlanStepStatus.FAILED -> Icons.Default.Error
        PlanStepStatus.SKIPPED -> Icons.Default.SkipNext
    }

    val assignedWorker = workers.find { it.subtaskId == subtask.id }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(statusIcon, null, tint = statusColor, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    subtask.title,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (assignedWorker != null) {
                    Text(
                        assignedWorker.name,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            if (subtask.files.isNotEmpty()) {
                Text(
                    "${subtask.files.size} files",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun WorkerCard(worker: SwarmWorker) {
    var expanded by remember { mutableStateOf(false) }

    val statusColor = when (worker.status) {
        SwarmWorkerStatus.IDLE -> Color(0xFF8B949E)
        SwarmWorkerStatus.RUNNING -> Color(0xFF10B981)
        SwarmWorkerStatus.COMPLETED -> Color(0xFF10B981)
        SwarmWorkerStatus.FAILED -> Color(0xFFEF4444)
        SwarmWorkerStatus.BLOCKED -> Color(0xFFD97706)
    }

    val roleIcon = when (worker.role) {
        "frontend" -> Icons.Default.Web
        "backend" -> Icons.Default.Storage
        "testing" -> Icons.Default.Science
        "devops" -> Icons.Default.Settings
        "review" -> Icons.Default.RateReview
        "implement" -> Icons.Default.Code
        else -> Icons.Default.SmartToy
    }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Status dot
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(roleIcon, null, modifier = Modifier.size(16.dp), tint = Color(0xFFF59E0B))
                Spacer(modifier = Modifier.width(6.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        worker.name,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        worker.role,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // File count
                if (worker.filesModified.isNotEmpty()) {
                    Text(
                        "${worker.filesModified.size} files",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF10B981)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }

                // Duration
                if (worker.startedAt != null && worker.completedAt != null) {
                    val duration = (worker.completedAt!! - worker.startedAt!!) / 1000
                    Text(
                        "${duration}s",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                if (worker.status == SwarmWorkerStatus.RUNNING) {
                    Spacer(modifier = Modifier.width(8.dp))
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        strokeWidth = 2.dp,
                        color = statusColor
                    )
                }
            }

            // Expanded: show action log
            if (expanded && worker.agentSession != null) {
                Spacer(modifier = Modifier.height(6.dp))
                val actions = worker.agentSession!!.actions.takeLast(5)
                actions.forEach { action ->
                    Row(
                        modifier = Modifier.padding(start = 16.dp, top = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val actionIcon = when (action.status) {
                            AgentActionStatus.SUCCESS -> Icons.Default.CheckCircle
                            AgentActionStatus.FAILED -> Icons.Default.Error
                            AgentActionStatus.RUNNING -> Icons.Default.Sync
                            else -> Icons.Default.Schedule
                        }
                        Icon(
                            actionIcon, null,
                            modifier = Modifier.size(10.dp),
                            tint = when (action.status) {
                                AgentActionStatus.SUCCESS -> Color(0xFF10B981)
                                AgentActionStatus.FAILED -> Color(0xFFEF4444)
                                else -> Color(0xFF8B949E)
                            }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            action.description,
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                if (worker.output.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        color = Color(0xFF0D1117),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            worker.output.take(300),
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 10.sp,
                                color = Color(0xFFC9D1D9)
                            ),
                            modifier = Modifier.padding(6.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MergeResultCard(merge: SwarmMergeResult) {
    val borderColor = if (merge.success) Color(0xFF10B981) else Color(0xFFEF4444)

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (merge.success) Icons.Default.MergeType else Icons.Default.Warning,
                    null,
                    tint = borderColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Merge Result",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                merge.summary,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (merge.conflicts.isNotEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                merge.conflicts.forEach { conflict ->
                    Row(
                        modifier = Modifier.padding(start = 8.dp, top = 2.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            Icons.Default.Warning, null,
                            modifier = Modifier.size(12.dp),
                            tint = Color(0xFFEF4444)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Column {
                            Text(
                                conflict.file,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                conflict.description,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            conflict.resolution?.let { res ->
                                Text(
                                    "Fix: $res",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF10B981)
                                )
                            }
                        }
                    }
                }
            }

            if (merge.filesModified.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "${merge.filesModified.size} files modified total",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
