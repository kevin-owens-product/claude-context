package com.claudecontext.localdev.ui.editor

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditorScreen(
    projectId: Long,
    onBack: () -> Unit,
    viewModel: EditorViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(projectId) {
        viewModel.loadProject(projectId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            uiState.currentFileName ?: "Editor",
                            style = MaterialTheme.typography.titleMedium
                        )
                        uiState.project?.name?.let {
                            Text(
                                it,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    if (uiState.isModified) {
                        IconButton(onClick = { viewModel.saveFile() }) {
                            Icon(Icons.Default.Save, "Save")
                        }
                    }
                    IconButton(onClick = { viewModel.toggleAiAssistant() }) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            "AI Assistant",
                            tint = if (uiState.showAiAssistant)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = { viewModel.runCurrentFile() }) {
                        Icon(Icons.Default.PlayArrow, "Run")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // File tabs
            if (uiState.openFiles.isNotEmpty()) {
                ScrollableTabRow(
                    selectedTabIndex = uiState.openFiles.indexOfFirst { it == uiState.currentFilePath }
                        .coerceAtLeast(0),
                    edgePadding = 0.dp
                ) {
                    uiState.openFiles.forEach { filePath ->
                        val fileName = filePath.substringAfterLast("/")
                        Tab(
                            selected = filePath == uiState.currentFilePath,
                            onClick = { viewModel.openFile(filePath) },
                            text = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        fileName,
                                        style = MaterialTheme.typography.bodySmall,
                                        maxLines = 1
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    IconButton(
                                        onClick = { viewModel.closeFile(filePath) },
                                        modifier = Modifier.size(16.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Close,
                                            "Close",
                                            modifier = Modifier.size(12.dp)
                                        )
                                    }
                                }
                            }
                        )
                    }
                }
            }

            // Editor area
            Row(modifier = Modifier.weight(1f)) {
                // Line numbers
                val lines = uiState.content.lines()
                Column(
                    modifier = Modifier
                        .verticalScroll(rememberScrollState())
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    lines.forEachIndexed { index, _ ->
                        Text(
                            text = "${index + 1}",
                            style = TextStyle(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                            ),
                            modifier = Modifier.padding(vertical = 1.dp)
                        )
                    }
                }

                // Code content
                val verticalScroll = rememberScrollState()
                val horizontalScroll = rememberScrollState()

                BasicTextField(
                    value = uiState.content,
                    onValueChange = { viewModel.updateContent(it) },
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .verticalScroll(verticalScroll)
                        .horizontalScroll(horizontalScroll)
                        .padding(8.dp),
                    textStyle = TextStyle(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    ),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary)
                )
            }

            // AI Assistant panel with Agent/Debug/Plan/Swarm/Queue modes
            if (uiState.showAiAssistant) {
                AiAssistantPanel(
                    currentMode = uiState.aiMode,
                    onModeChanged = { viewModel.setAiMode(it) },
                    // Agent mode
                    agentSession = uiState.agentSession,
                    onAgentStart = { viewModel.startAgentTask(it) },
                    onAgentStop = { viewModel.stopAgent() },
                    onAgentApprove = { viewModel.approveAgentAction() },
                    // Debug mode
                    debugSession = uiState.debugSession,
                    onDebugStart = { viewModel.startDebug(it) },
                    onDebugInstrument = { viewModel.instrumentCode() },
                    onDebugSubmitLogs = { viewModel.submitDebugLogs(it) },
                    onDebugApplyFix = { viewModel.applyDebugFix() },
                    onDebugVerify = { viewModel.verifyDebugFix(it) },
                    // Plan mode
                    planSession = uiState.planSession,
                    onPlanStart = { viewModel.startPlan(it) },
                    onPlanAnswerQuestions = { viewModel.answerPlanQuestions(it) },
                    onPlanExecute = { viewModel.executePlan() },
                    onPlanExecuteStep = { viewModel.executePlanStep(it) },
                    onPlanSave = { viewModel.savePlan() },
                    // Swarm mode
                    swarmSession = uiState.swarmSession,
                    onSwarmStart = { goal, strategy -> viewModel.startSwarm(goal, strategy) },
                    onSwarmStop = { viewModel.stopSwarm() },
                    // Queue mode
                    queueState = uiState.queueState,
                    onQueueEnqueue = { prompt, mode, priority -> viewModel.queueEnqueue(prompt, mode, priority) },
                    onQueueRemove = { viewModel.queueRemove(it) },
                    onQueueStartProcessing = { viewModel.queueStartProcessing() },
                    onQueuePause = { viewModel.queuePause() },
                    onQueueResume = { viewModel.queueResume() },
                    onQueueRetryFailed = { viewModel.queueRetryFailed(it) },
                    onQueueRetryAllFailed = { viewModel.queueRetryAllFailed() },
                    onQueueSetExecutionMode = { viewModel.queueSetExecutionMode(it) },
                    onQueueSetPriority = { id, priority -> viewModel.queueSetPriority(id, priority) },
                    // Session mode
                    sessionManagerState = uiState.sessionManagerState,
                    onCreateSession = { viewModel.createSession(it) },
                    onSwitchSession = { viewModel.switchSession(it) },
                    onDeleteSession = { viewModel.deleteSession(it) },
                    onArchiveSession = { viewModel.archiveSession(it) },
                    onDuplicateSession = { viewModel.duplicateSession(it) },
                    onSearchSessions = { viewModel.searchSessions(it) },
                    onCreateBranch = { sid, name -> viewModel.createBranch(sid, name) },
                    onSwitchBranch = { sid, bid -> viewModel.switchBranch(sid, bid) },
                    onCreateCheckpoint = { sid, name -> viewModel.createCheckpoint(sid, name) },
                    onRestoreCheckpoint = { sid, cid -> viewModel.restoreCheckpoint(sid, cid) },
                    onExportSession = { viewModel.exportSession(it) },
                    // Context mode
                    contextManagerState = uiState.contextManagerState,
                    onAddContextNote = { note, title -> viewModel.addContextNote(note, title) },
                    onRemoveContextEntry = { viewModel.removeContextEntry(it) },
                    onPinContextEntry = { id, pinned -> viewModel.pinContextEntry(id, pinned) },
                    onSetContextPriority = { id, priority -> viewModel.setContextPriority(id, priority) },
                    onSetContextStrategy = { viewModel.setContextStrategy(it) },
                    onSetContextMaxBudget = { viewModel.setContextMaxBudget(it) },
                    onClearAllContext = { viewModel.clearAllContext() },
                    onClearContextByType = { viewModel.clearContextByType(it) },
                    // Design mode
                    designManagerState = uiState.designManagerState,
                    onSetTheme = { viewModel.setDesignTheme(it) },
                    onCreateTheme = { viewModel.createDesignTheme(it) },
                    onDeleteTheme = { viewModel.deleteDesignTheme(it) },
                    onSetLayout = { viewModel.setDesignLayout(it) },
                    onToggleDesignPanel = { viewModel.toggleDesignPanel(it) },
                    onSetEditorFontSize = { viewModel.setEditorFontSize(it) },
                    onSetTabSize = { viewModel.setTabSize(it) },
                    onSetShowMinimap = { viewModel.setShowMinimap(it) },
                    onSetShowBreadcrumbs = { viewModel.setShowBreadcrumbs(it) },
                    onSetShowIndentGuides = { viewModel.setShowIndentGuides(it) },
                    onSetBracketPairColorization = { viewModel.setBracketPairColorization(it) },
                    onSetCursorStyle = { viewModel.setCursorStyle(it) },
                    onSetCursorBlinking = { viewModel.setCursorBlinking(it) },
                    onSetRenderWhitespace = { viewModel.setRenderWhitespace(it) },
                    // General
                    onDismiss = { viewModel.toggleAiAssistant() }
                )
            }

            // Status bar
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        uiState.currentLanguage?.displayName ?: "",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        "Ln ${uiState.cursorLine}, Col ${uiState.cursorColumn}",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        if (uiState.isModified) "Modified" else "Saved",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (uiState.isModified) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }
    }
}
