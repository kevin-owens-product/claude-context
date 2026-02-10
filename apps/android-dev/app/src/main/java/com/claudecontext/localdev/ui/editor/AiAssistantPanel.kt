package com.claudecontext.localdev.ui.editor

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.ui.components.AgentModePanel
import com.claudecontext.localdev.ui.components.DebugModePanel
import com.claudecontext.localdev.ui.components.ModeSwitcher
import com.claudecontext.localdev.ui.components.PlanModePanel
import com.claudecontext.localdev.ui.components.SwarmPanel
import com.claudecontext.localdev.ui.components.PromptQueuePanel

/**
 * Main AI panel with Agent/Debug/Plan/Swarm/Queue mode tabs.
 */
@Composable
fun AiAssistantPanel(
    currentMode: AiMode,
    onModeChanged: (AiMode) -> Unit,
    // Agent mode
    agentSession: AgentSession?,
    onAgentStart: (String) -> Unit,
    onAgentStop: () -> Unit,
    onAgentApprove: () -> Unit,
    // Debug mode
    debugSession: DebugSession?,
    onDebugStart: (String) -> Unit,
    onDebugInstrument: () -> Unit,
    onDebugSubmitLogs: (String) -> Unit,
    onDebugApplyFix: () -> Unit,
    onDebugVerify: (Boolean) -> Unit,
    // Plan mode
    planSession: PlanSession?,
    onPlanStart: (String) -> Unit,
    onPlanAnswerQuestions: (Map<String, String>) -> Unit,
    onPlanExecute: () -> Unit,
    onPlanExecuteStep: (String) -> Unit,
    onPlanSave: () -> Unit,
    // Swarm mode
    swarmSession: SwarmSession?,
    onSwarmStart: (String, SwarmStrategy) -> Unit,
    onSwarmStop: () -> Unit,
    // Queue mode
    queueState: PromptQueueState?,
    onQueueEnqueue: (String, AiMode, QueuePriority) -> Unit,
    onQueueRemove: (String) -> Unit,
    onQueueStartProcessing: () -> Unit,
    onQueuePause: () -> Unit,
    onQueueResume: () -> Unit,
    onQueueRetryFailed: (String) -> Unit,
    onQueueRetryAllFailed: () -> Unit,
    onQueueSetExecutionMode: (QueueExecutionMode) -> Unit,
    onQueueSetPriority: (String, QueuePriority) -> Unit,
    // General
    onDismiss: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.55f),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 2.dp,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
    ) {
        Column {
            // Header with close button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "Claude AI",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Default.Close, "Close", modifier = Modifier.size(16.dp))
                }
            }

            // Mode switcher
            ModeSwitcher(
                currentMode = currentMode,
                onModeSelected = onModeChanged,
                modifier = Modifier.padding(horizontal = 12.dp)
            )

            Spacer(modifier = Modifier.height(4.dp))
            HorizontalDivider()

            // Mode-specific content
            when (currentMode) {
                AiMode.AGENT -> AgentModePanel(
                    session = agentSession,
                    onStartTask = onAgentStart,
                    onStop = onAgentStop,
                    onApprove = onAgentApprove,
                    modifier = Modifier.weight(1f)
                )
                AiMode.DEBUG -> DebugModePanel(
                    session = debugSession,
                    onStartDebug = onDebugStart,
                    onInstrument = onDebugInstrument,
                    onSubmitLogs = onDebugSubmitLogs,
                    onApplyFix = onDebugApplyFix,
                    onVerify = onDebugVerify,
                    modifier = Modifier.weight(1f)
                )
                AiMode.PLAN -> PlanModePanel(
                    session = planSession,
                    onStartPlan = onPlanStart,
                    onAnswerQuestions = onPlanAnswerQuestions,
                    onExecutePlan = onPlanExecute,
                    onExecuteStep = onPlanExecuteStep,
                    onSavePlan = onPlanSave,
                    modifier = Modifier.weight(1f)
                )
                AiMode.SWARM -> SwarmPanel(
                    session = swarmSession,
                    onStartSwarm = onSwarmStart,
                    onStop = onSwarmStop,
                    modifier = Modifier.weight(1f)
                )
                AiMode.QUEUE -> PromptQueuePanel(
                    queueState = queueState,
                    onEnqueue = onQueueEnqueue,
                    onRemove = onQueueRemove,
                    onStartProcessing = onQueueStartProcessing,
                    onPause = onQueuePause,
                    onResume = onQueueResume,
                    onRetryFailed = onQueueRetryFailed,
                    onRetryAllFailed = onQueueRetryAllFailed,
                    onSetExecutionMode = onQueueSetExecutionMode,
                    onSetPriority = onQueueSetPriority,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
