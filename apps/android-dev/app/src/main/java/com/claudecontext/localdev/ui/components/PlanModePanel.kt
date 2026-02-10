package com.claudecontext.localdev.ui.components

import androidx.compose.animation.animateContentSize
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claudecontext.localdev.data.models.*

@Composable
fun PlanModePanel(
    session: PlanSession?,
    onStartPlan: (String) -> Unit,
    onAnswerQuestions: (Map<String, String>) -> Unit,
    onExecutePlan: () -> Unit,
    onExecuteStep: (String) -> Unit,
    onSavePlan: () -> Unit,
    modifier: Modifier = Modifier
) {
    var goalInput by remember { mutableStateOf("") }

    Column(modifier = modifier.animateContentSize()) {
        // Phase indicator
        session?.let { s ->
            PlanPhaseIndicator(s.phase)
        }

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (session == null) {
                item {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Architecture,
                            null,
                            modifier = Modifier.size(40.dp),
                            tint = Color(0xFF10B981).copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Plan Mode",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Describe a feature or change. The planner will research\nyour codebase, create a step-by-step plan, then execute it.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Clarifying questions
            if (session != null && session.questions.isNotEmpty() &&
                session.phase == PlanPhase.CLARIFY
            ) {
                item {
                    Text(
                        "Clarifying Questions",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
                item {
                    ClarifyingQuestionsCard(
                        questions = session.questions,
                        onSubmit = onAnswerQuestions
                    )
                }
            }

            // Research findings
            if (session != null && session.researchFindings.isNotEmpty()) {
                item {
                    Text(
                        "Codebase Research",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
                items(session.researchFindings) { finding ->
                    ResearchFindingCard(finding)
                }
            }

            // The plan
            if (session?.plan != null) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                session.plan!!.title,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                session.plan!!.summary,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        IconButton(onClick = onSavePlan) {
                            Icon(Icons.Default.Save, "Save plan")
                        }
                    }
                }

                items(session.plan!!.steps) { step ->
                    PlanStepCard(
                        step = step,
                        canExecute = session.phase == PlanPhase.REVIEW ||
                                session.phase == PlanPhase.EXECUTE,
                        onExecute = { onExecuteStep(step.id) }
                    )
                }

                // Execute all button
                if (session.phase == PlanPhase.REVIEW) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = onExecutePlan,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF10B981)
                            )
                        ) {
                            Icon(Icons.Default.PlayArrow, null, Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Execute All Steps")
                        }
                    }
                }
            }

            // Execution progress
            if (session?.phase == PlanPhase.EXECUTE || session?.phase == PlanPhase.DONE) {
                val completed = session.plan?.steps?.count { it.status == PlanStepStatus.COMPLETED } ?: 0
                val total = session.plan?.steps?.size ?: 0

                item {
                    LinearProgressIndicator(
                        progress = { if (total > 0) completed.toFloat() / total else 0f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        color = Color(0xFF10B981)
                    )
                    Text(
                        "$completed / $total steps completed",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Done
            if (session?.phase == PlanPhase.DONE) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFF10B981).copy(alpha = 0.1f)
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF10B981))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                "Plan execution complete",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // Goal input
        if (session == null || session.phase == PlanPhase.CLARIFY && session.questions.isEmpty()) {
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
                    placeholder = { Text("Describe the feature or change to plan...") },
                    maxLines = 3,
                    textStyle = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (goalInput.isNotBlank()) {
                            onStartPlan(goalInput)
                            goalInput = ""
                        }
                    },
                    enabled = goalInput.isNotBlank()
                ) {
                    Icon(Icons.Default.Send, "Start plan", tint = Color(0xFF10B981))
                }
            }
        }
    }
}

@Composable
private fun PlanPhaseIndicator(phase: PlanPhase) {
    val phases = PlanPhase.entries.filter { it != PlanPhase.DONE }
    val currentIndex = phases.indexOf(phase).coerceAtLeast(0)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        phases.forEachIndexed { i, _ ->
            val color = when {
                i < currentIndex -> Color(0xFF10B981)
                i == currentIndex -> Color(0xFF10B981).copy(alpha = 0.7f)
                else -> MaterialTheme.colorScheme.surfaceVariant
            }
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .height(3.dp),
                color = color,
                shape = RoundedCornerShape(2.dp)
            ) {}
        }
    }
    Text(
        phase.displayName,
        modifier = Modifier.padding(horizontal = 12.dp),
        style = MaterialTheme.typography.labelSmall,
        color = Color(0xFF10B981),
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun ClarifyingQuestionsCard(
    questions: List<ClarifyingQuestion>,
    onSubmit: (Map<String, String>) -> Unit
) {
    val answers = remember { mutableStateMapOf<String, String>() }

    Card {
        Column(modifier = Modifier.padding(12.dp)) {
            questions.forEach { q ->
                Text(
                    q.question,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = answers[q.question] ?: "",
                    onValueChange = { answers[q.question] = it },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodySmall,
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            Button(
                onClick = { onSubmit(answers.toMap()) },
                enabled = answers.values.any { it.isNotBlank() }
            ) {
                Text("Continue")
            }
        }
    }
}

@Composable
private fun ResearchFindingCard(finding: ResearchFinding) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(
                finding.file,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontFamily = FontFamily.Monospace,
                    fontSize = 11.sp
                ),
                color = Color(0xFF58A6FF)
            )
            Text(
                finding.summary,
                style = MaterialTheme.typography.bodySmall
            )
            Text(
                finding.relevance,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun PlanStepCard(
    step: PlanStep,
    canExecute: Boolean,
    onExecute: () -> Unit
) {
    val (statusIcon, statusColor) = when (step.status) {
        PlanStepStatus.PENDING -> Icons.Default.RadioButtonUnchecked to MaterialTheme.colorScheme.onSurfaceVariant
        PlanStepStatus.IN_PROGRESS -> Icons.Default.Sync to Color(0xFFD97706)
        PlanStepStatus.COMPLETED -> Icons.Default.CheckCircle to Color(0xFF10B981)
        PlanStepStatus.SKIPPED -> Icons.Default.SkipNext to Color(0xFF8B949E)
        PlanStepStatus.FAILED -> Icons.Default.Error to Color(0xFFEF4444)
    }

    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(statusIcon, null, tint = statusColor, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    step.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    step.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (step.files.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        step.files.joinToString(", "),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontSize = 10.sp
                        ),
                        color = Color(0xFF58A6FF)
                    )
                }
            }

            if (canExecute && step.status == PlanStepStatus.PENDING) {
                IconButton(
                    onClick = onExecute,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.PlayArrow,
                        "Execute step",
                        tint = Color(0xFF10B981),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
