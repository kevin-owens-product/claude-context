package com.claudecontext.localdev.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
fun AgentModePanel(
    session: AgentSession?,
    onStartTask: (String) -> Unit,
    onStop: () -> Unit,
    onApprove: () -> Unit,
    modifier: Modifier = Modifier
) {
    var taskInput by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(session?.actions?.size) {
        val size = session?.actions?.size ?: 0
        if (size > 0) listState.animateScrollToItem(size - 1)
    }

    Column(modifier = modifier.animateContentSize()) {
        // Status header
        session?.let { s ->
            AgentStatusBar(s)
        }

        // Action log
        if (session != null && session.actions.isNotEmpty()) {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(session.actions) { action ->
                    AgentActionItem(action)
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
                        Icons.Default.SmartToy,
                        null,
                        modifier = Modifier.size(40.dp),
                        tint = Color(0xFF6366F1).copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Agent Mode",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Describe a task and the agent will autonomously\nread files, edit code, run commands, and iterate.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 24.dp)
                    )
                }
            }
        }

        // Approval bar
        if (session?.status == AgentSessionStatus.WAITING_APPROVAL) {
            Surface(
                color = Color(0xFFFEF3C7),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Warning, null, tint = Color(0xFFD97706))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Agent needs approval to continue",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        onClick = onApprove,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706))
                    ) {
                        Text("Approve")
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
            val isRunning = session?.status in listOf(
                AgentSessionStatus.THINKING, AgentSessionStatus.EXECUTING
            )

            OutlinedTextField(
                value = taskInput,
                onValueChange = { taskInput = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Describe what you want the agent to do...") },
                maxLines = 3,
                textStyle = MaterialTheme.typography.bodySmall,
                enabled = !isRunning
            )
            Spacer(modifier = Modifier.width(8.dp))

            if (isRunning) {
                IconButton(onClick = onStop) {
                    Icon(Icons.Default.Stop, "Stop", tint = MaterialTheme.colorScheme.error)
                }
            } else {
                IconButton(
                    onClick = {
                        if (taskInput.isNotBlank()) {
                            onStartTask(taskInput)
                            taskInput = ""
                        }
                    },
                    enabled = taskInput.isNotBlank()
                ) {
                    Icon(Icons.Default.Send, "Start", tint = Color(0xFF6366F1))
                }
            }
        }
    }
}

@Composable
private fun AgentStatusBar(session: AgentSession) {
    val (statusText, statusColor) = when (session.status) {
        AgentSessionStatus.IDLE -> "Ready" to MaterialTheme.colorScheme.onSurfaceVariant
        AgentSessionStatus.THINKING -> "Thinking..." to Color(0xFF6366F1)
        AgentSessionStatus.EXECUTING -> "Executing..." to Color(0xFFD97706)
        AgentSessionStatus.WAITING_APPROVAL -> "Waiting for approval" to Color(0xFFD97706)
        AgentSessionStatus.COMPLETED -> "Completed" to Color(0xFF10B981)
        AgentSessionStatus.FAILED -> "Failed" to Color(0xFFEF4444)
        AgentSessionStatus.STOPPED -> "Stopped" to Color(0xFF8B949E)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (session.status == AgentSessionStatus.THINKING ||
                session.status == AgentSessionStatus.EXECUTING
            ) {
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
            "${session.actions.size} actions | ${session.filesModified.size} files | iter ${session.iterations}/${session.maxIterations}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun AgentActionItem(action: AgentAction) {
    val (icon, color) = when (action.tool) {
        AgentToolType.READ_FILE -> Icons.Default.Description to Color(0xFF58A6FF)
        AgentToolType.EDIT_FILE -> Icons.Default.Edit to Color(0xFFD97706)
        AgentToolType.CREATE_FILE -> Icons.Default.NoteAdd to Color(0xFF10B981)
        AgentToolType.DELETE_FILE -> Icons.Default.Delete to Color(0xFFEF4444)
        AgentToolType.SHELL_COMMAND -> Icons.Default.Terminal to Color(0xFFA78BFA)
        AgentToolType.SEARCH_CODEBASE -> Icons.Default.Search to Color(0xFF58A6FF)
        AgentToolType.LIST_DIRECTORY -> Icons.Default.FolderOpen to Color(0xFF8B949E)
        AgentToolType.BUILD -> Icons.Default.Build to Color(0xFFD97706)
        AgentToolType.TEST -> Icons.Default.Science to Color(0xFF6366F1)
        AgentToolType.LINT -> Icons.Default.Rule to Color(0xFF10B981)
        AgentToolType.GIT_OPERATION -> Icons.Default.AccountTree to Color(0xFFF97583)
    }

    val statusIcon = when (action.status) {
        AgentActionStatus.PENDING -> Icons.Default.Schedule
        AgentActionStatus.RUNNING -> Icons.Default.Sync
        AgentActionStatus.SUCCESS -> Icons.Default.CheckCircle
        AgentActionStatus.FAILED -> Icons.Default.Error
        AgentActionStatus.NEEDS_APPROVAL -> Icons.Default.Warning
    }

    var expanded by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { expanded = !expanded }
            ) {
                Icon(icon, null, tint = color, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    action.description,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.weight(1f),
                    maxLines = if (expanded) Int.MAX_VALUE else 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (action.durationMs > 0) {
                    Text(
                        "${action.durationMs}ms",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                }
                Icon(
                    statusIcon,
                    null,
                    modifier = Modifier.size(14.dp),
                    tint = when (action.status) {
                        AgentActionStatus.SUCCESS -> Color(0xFF10B981)
                        AgentActionStatus.FAILED -> Color(0xFFEF4444)
                        AgentActionStatus.RUNNING -> Color(0xFFD97706)
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            }

            if (expanded && action.output != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Surface(
                    color = Color(0xFF0D1117),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        action.output!!.take(500),
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontSize = 10.sp,
                            color = Color(0xFFC9D1D9)
                        ),
                        modifier = Modifier.padding(8.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun Modifier.clickable(onClick: () -> Unit): Modifier {
    return this.then(
        Modifier.clip(RoundedCornerShape(4.dp))
    ).then(
        androidx.compose.foundation.clickable(onClick = onClick).let { Modifier }
    )
}
