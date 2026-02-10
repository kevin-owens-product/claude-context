package com.claudecontext.localdev.ui.components

import androidx.compose.animation.animateContentSize
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
fun DebugModePanel(
    session: DebugSession?,
    onStartDebug: (String) -> Unit,
    onInstrument: () -> Unit,
    onSubmitLogs: (String) -> Unit,
    onApplyFix: () -> Unit,
    onVerify: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    var bugDescription by remember { mutableStateOf("") }
    var logsInput by remember { mutableStateOf("") }

    Column(modifier = modifier.animateContentSize()) {
        // Phase indicator
        session?.let { s ->
            DebugPhaseIndicator(s.phase)
        }

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (session == null) {
                // Initial state - describe bug
                item {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.BugReport,
                            null,
                            modifier = Modifier.size(40.dp),
                            tint = Color(0xFFEF4444).copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Debug Mode",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Describe the bug. The debugger will generate hypotheses,\ninstrument code with logging, and propose a minimal fix.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Hypotheses
            if (session != null && session.hypotheses.isNotEmpty()) {
                item {
                    Text(
                        "Hypotheses",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
                items(session.hypotheses) { hypothesis ->
                    HypothesisCard(hypothesis)
                }
            }

            // Instrumented files
            if (session != null && session.instrumentedFiles.isNotEmpty()) {
                item {
                    Text(
                        "Instrumented Files",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
                items(session.instrumentedFiles) { file ->
                    InstrumentedFileCard(file)
                }
            }

            // Reproduce phase - collect logs
            if (session?.phase == DebugPhase.REPRODUCE) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFFFEF3C7)
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.PlayArrow, null, tint = Color(0xFFD97706))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Reproduce the bug",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Run your app and reproduce the bug. Then paste the debug output below.",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = logsInput,
                                onValueChange = { logsInput = it },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Runtime logs / output") },
                                minLines = 4,
                                maxLines = 8,
                                textStyle = MaterialTheme.typography.bodySmall.copy(
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 11.sp
                                )
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = {
                                    onSubmitLogs(logsInput)
                                    logsInput = ""
                                },
                                enabled = logsInput.isNotBlank()
                            ) {
                                Text("Submit Logs")
                            }
                        }
                    }
                }
            }

            // Proposed fix
            if (session?.proposedFix != null) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFF10B981).copy(alpha = 0.1f)
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Healing, null, tint = Color(0xFF10B981))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Proposed Fix",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                session.proposedFix!!.description,
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = onApplyFix) {
                                    Icon(Icons.Default.Check, null, Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Apply Fix")
                                }
                            }
                        }
                    }
                }
            }

            // Verify phase
            if (session?.phase == DebugPhase.VERIFY) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFF6366F1).copy(alpha = 0.1f)
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                "Verify the fix",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "Run your app again. Is the bug fixed?",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { onVerify(true) },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFF10B981)
                                    )
                                ) {
                                    Icon(Icons.Default.CheckCircle, null, Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Bug Fixed")
                                }
                                OutlinedButton(onClick = { onVerify(false) }) {
                                    Icon(Icons.Default.Replay, null, Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Still Broken")
                                }
                            }
                        }
                    }
                }
            }

            // Done
            if (session?.phase == DebugPhase.DONE) {
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
                            Column {
                                Text(
                                    "Bug fixed and instrumentation cleaned up",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    "${session.iterations} iteration(s)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        // Input (initial bug description)
        if (session == null || session.phase == DebugPhase.DESCRIBE) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = bugDescription,
                    onValueChange = { bugDescription = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Describe the bug in detail...") },
                    maxLines = 3,
                    textStyle = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (bugDescription.isNotBlank()) {
                            onStartDebug(bugDescription)
                            bugDescription = ""
                        }
                    },
                    enabled = bugDescription.isNotBlank()
                ) {
                    Icon(Icons.Default.Send, "Start debug", tint = Color(0xFFEF4444))
                }
            }
        }

        // Instrument button
        if (session?.phase == DebugPhase.HYPOTHESIZE &&
            session.hypotheses.isNotEmpty()
        ) {
            Button(
                onClick = onInstrument,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
            ) {
                Icon(Icons.Default.Code, null, Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Instrument Code")
            }
        }
    }
}

@Composable
private fun DebugPhaseIndicator(phase: DebugPhase) {
    val phases = DebugPhase.entries.filter {
        it != DebugPhase.CLEAN && it != DebugPhase.DONE
    }
    val currentIndex = phases.indexOf(phase).coerceAtLeast(0)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        phases.forEachIndexed { i, p ->
            val color = when {
                i < currentIndex -> Color(0xFF10B981)
                i == currentIndex -> Color(0xFFEF4444)
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
        color = Color(0xFFEF4444),
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun HypothesisCard(hypothesis: DebugHypothesis) {
    val color = when (hypothesis.likelihood) {
        HypothesisLikelihood.HIGH -> Color(0xFFEF4444)
        HypothesisLikelihood.MEDIUM -> Color(0xFFD97706)
        HypothesisLikelihood.LOW -> Color(0xFF8B949E)
    }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.Top
        ) {
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = color
            ) {
                Text(
                    hypothesis.likelihood.name,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                hypothesis.description,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun InstrumentedFileCard(file: InstrumentedFile) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.InsertDriveFile,
                null,
                modifier = Modifier.size(16.dp),
                tint = Color(0xFFD97706)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(
                    file.path,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    "${file.logStatements.size} debug statements added",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
