package com.claudecontext.localdev.ui.adaptive

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import com.claudecontext.localdev.ui.editor.EditorViewModel

/**
 * @prompt-id forge-v4.1:feature:adaptive-editor-screen:001
 * @generated-at 2024-01-16T00:00:00Z
 * @model claude-3-opus
 */

/**
 * Adaptive wrapper around EditorScreen that changes layout based on device type.
 * - Phone: Standard single-column with AI panel toggle
 * - Tablet: Side-by-side editor + AI panel (always visible)
 * - Foldable: Split at fold hinge, editor on one side, AI on other
 */
@Composable
fun AdaptiveEditorScreen(
    projectId: Long,
    onBack: () -> Unit,
    viewModel: EditorViewModel = hiltViewModel()
) {
    val layoutType = rememberAdaptiveLayoutType()
    val uiState by viewModel.uiState.collectAsState()

    // Track folding feature
    val context = LocalContext.current
    val activity = context as? Activity
    var foldingFeature by remember { mutableStateOf<FoldingFeature?>(null) }

    if (activity != null) {
        LaunchedEffect(activity) {
            WindowInfoTracker.getOrCreate(activity)
                .windowLayoutInfo(activity)
                .collect { layoutInfo: WindowLayoutInfo ->
                    foldingFeature = layoutInfo.displayFeatures
                        .filterIsInstance<FoldingFeature>()
                        .firstOrNull()
                }
        }
    }

    // Force AI panel visible on larger screens
    LaunchedEffect(layoutType) {
        when (layoutType) {
            AdaptiveLayoutType.EXPANDED,
            AdaptiveLayoutType.MEDIUM,
            AdaptiveLayoutType.FOLDABLE_BOOK -> {
                if (!uiState.showAiAssistant) {
                    viewModel.toggleAiAssistant()
                }
            }
            else -> { /* phone: user controls visibility */ }
        }
    }

    // Sidebar state for expanded layout
    var sidebarExpanded by remember { mutableStateOf(true) }
    val sidebarNavItems = listOf(
        SidebarNavItem("files", "Explorer", Icons.Default.Folder),
        SidebarNavItem("search", "Search", Icons.Default.Search),
        SidebarNavItem("git", "Source Control", Icons.Default.AccountTree),
        SidebarNavItem("debug", "Run & Debug", Icons.Default.BugReport),
        SidebarNavItem("extensions", "Extensions", Icons.Default.Extension)
    )
    var selectedSidebarItem by remember { mutableStateOf("files") }

    AdaptiveEditorLayout(
        layoutType = layoutType,
        foldingFeature = foldingFeature,
        sidebarContent = { mod ->
            AdaptiveSidebar(
                items = sidebarNavItems,
                selectedId = selectedSidebarItem,
                onItemSelected = { selectedSidebarItem = it },
                isExpanded = sidebarExpanded,
                onToggleExpanded = { sidebarExpanded = !sidebarExpanded },
                modifier = mod
            )
        },
        editorContent = { mod ->
            // The actual editor content without the AI panel
            EditorContent(
                viewModel = viewModel,
                uiState = uiState,
                onBack = onBack,
                modifier = mod,
                showAiToggle = layoutType == AdaptiveLayoutType.COMPACT
            )
        },
        aiPanelContent = { mod ->
            if (uiState.showAiAssistant) {
                AiPanelContent(
                    viewModel = viewModel,
                    uiState = uiState,
                    modifier = mod
                )
            }
        }
    )
}

@Composable
private fun EditorContent(
    viewModel: EditorViewModel,
    uiState: com.claudecontext.localdev.ui.editor.EditorUiState,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    showAiToggle: Boolean = true
) {
    // Simplified editor (file tabs + code area + status bar) without AI panel
    // Delegates to original EditorScreen composable pieces
    Column(modifier = modifier) {
        // Compact top bar
        Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 2.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Back")
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        uiState.currentFileName ?: "Editor",
                        style = MaterialTheme.typography.titleSmall
                    )
                }
                if (uiState.isModified) {
                    IconButton(onClick = { viewModel.saveFile() }) {
                        Icon(Icons.Default.Save, "Save")
                    }
                }
                if (showAiToggle) {
                    IconButton(onClick = { viewModel.toggleAiAssistant() }) {
                        Icon(
                            Icons.Default.AutoAwesome, "AI",
                            tint = if (uiState.showAiAssistant)
                                MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                IconButton(onClick = { viewModel.runCurrentFile() }) {
                    Icon(Icons.Default.PlayArrow, "Run")
                }
            }
        }

        // File tabs
        if (uiState.openFiles.isNotEmpty()) {
            ScrollableTabRow(
                selectedTabIndex = uiState.openFiles.indexOfFirst { it == uiState.currentFilePath }
                    .coerceAtLeast(0),
                edgePadding = 0.dp
            ) {
                uiState.openFiles.forEach { filePath ->
                    Tab(
                        selected = filePath == uiState.currentFilePath,
                        onClick = { viewModel.openFile(filePath) },
                        text = {
                            Text(
                                filePath.substringAfterLast("/"),
                                style = MaterialTheme.typography.bodySmall,
                                maxLines = 1
                            )
                        }
                    )
                }
            }
        }

        // Editor area (code text field)
        Box(modifier = Modifier.weight(1f)) {
            BasicTextField(
                value = uiState.content,
                onValueChange = { viewModel.updateContent(it) },
                modifier = Modifier
                    .fillMaxSize()
                    .padding(8.dp),
                textStyle = TextStyle(
                    fontFamily = FontFamily.Monospace,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                ),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary)
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

@Composable
private fun AiPanelContent(
    viewModel: EditorViewModel,
    uiState: com.claudecontext.localdev.ui.editor.EditorUiState,
    modifier: Modifier = Modifier
) {
    // Wrap the full AiAssistantPanel
    Surface(
        modifier = modifier,
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        tonalElevation = 1.dp
    ) {
        com.claudecontext.localdev.ui.editor.AiAssistantPanel(
            currentMode = uiState.aiMode,
            onModeChanged = { viewModel.setAiMode(it) },
            agentSession = uiState.agentSession,
            onAgentStart = { viewModel.startAgentTask(it) },
            onAgentStop = { viewModel.stopAgent() },
            onAgentApprove = { viewModel.approveAgentAction() },
            debugSession = uiState.debugSession,
            onDebugStart = { viewModel.startDebug(it) },
            onDebugInstrument = { viewModel.instrumentCode() },
            onDebugSubmitLogs = { viewModel.submitDebugLogs(it) },
            onDebugApplyFix = { viewModel.applyDebugFix() },
            onDebugVerify = { viewModel.verifyDebugFix(it) },
            planSession = uiState.planSession,
            onPlanStart = { viewModel.startPlan(it) },
            onPlanAnswerQuestions = { viewModel.answerPlanQuestions(it) },
            onPlanExecute = { viewModel.executePlan() },
            onPlanExecuteStep = { viewModel.executePlanStep(it) },
            onPlanSave = { viewModel.savePlan() },
            swarmSession = uiState.swarmSession,
            onSwarmStart = { goal, strategy -> viewModel.startSwarm(goal, strategy) },
            onSwarmStop = { viewModel.stopSwarm() },
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
            onDismiss = { viewModel.toggleAiAssistant() }
        )
    }
}
