package com.claudecontext.localdev.ui.adaptive

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import kotlinx.coroutines.flow.collect

/**
 * @prompt-id forge-v4.1:feature:adaptive-layout:001
 * @generated-at 2024-01-16T00:00:00Z
 * @model claude-3-opus
 */

/**
 * Device posture classification for foldable devices
 */
sealed class DevicePosture {
    object NormalPosture : DevicePosture()
    data class BookPosture(val hingePosition: androidx.compose.ui.geometry.Rect) : DevicePosture()
    data class SeparatingPosture(
        val hingePosition: androidx.compose.ui.geometry.Rect,
        val orientation: FoldingFeature.Orientation
    ) : DevicePosture()
}

/**
 * Adaptive layout type based on screen size and fold state
 */
enum class AdaptiveLayoutType {
    COMPACT,        // Phone portrait
    MEDIUM,         // Phone landscape / small tablet
    EXPANDED,       // Tablet / desktop
    FOLDABLE_BOOK,  // Foldable in book/tent posture (vertical fold)
    FOLDABLE_TABLETOP // Foldable in tabletop posture (horizontal fold)
}

/**
 * Composable that provides adaptive layout information to children
 */
@OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
@Composable
fun rememberAdaptiveLayoutType(): AdaptiveLayoutType {
    val context = LocalContext.current
    val activity = context as? Activity
    val configuration = LocalConfiguration.current

    // Get window size class
    val windowSizeClass = if (activity != null) {
        calculateWindowSizeClass(activity)
    } else null

    // Track folding features
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

    return remember(windowSizeClass, foldingFeature, configuration) {
        when {
            // Foldable in half-open posture
            foldingFeature?.state == FoldingFeature.State.HALF_OPENED -> {
                if (foldingFeature?.orientation == FoldingFeature.Orientation.VERTICAL) {
                    AdaptiveLayoutType.FOLDABLE_BOOK
                } else {
                    AdaptiveLayoutType.FOLDABLE_TABLETOP
                }
            }
            // Foldable with separating hinge
            foldingFeature?.isSeparating == true -> {
                if (foldingFeature?.orientation == FoldingFeature.Orientation.VERTICAL) {
                    AdaptiveLayoutType.FOLDABLE_BOOK
                } else {
                    AdaptiveLayoutType.FOLDABLE_TABLETOP
                }
            }
            // Standard size classes
            windowSizeClass?.widthSizeClass == WindowWidthSizeClass.Expanded -> AdaptiveLayoutType.EXPANDED
            windowSizeClass?.widthSizeClass == WindowWidthSizeClass.Medium -> AdaptiveLayoutType.MEDIUM
            else -> AdaptiveLayoutType.COMPACT
        }
    }
}

/**
 * Container that adapts editor+AI panel layout based on device type
 */
@Composable
fun AdaptiveEditorLayout(
    layoutType: AdaptiveLayoutType,
    foldingFeature: FoldingFeature?,
    editorContent: @Composable (Modifier) -> Unit,
    aiPanelContent: @Composable (Modifier) -> Unit,
    sidebarContent: @Composable (Modifier) -> Unit,
    modifier: Modifier = Modifier
) {
    when (layoutType) {
        AdaptiveLayoutType.COMPACT -> {
            // Phone: single column, AI panel as bottom sheet
            CompactLayout(
                editorContent = editorContent,
                aiPanelContent = aiPanelContent,
                modifier = modifier
            )
        }
        AdaptiveLayoutType.MEDIUM -> {
            // Medium: editor takes 60%, AI panel 40%
            MediumLayout(
                editorContent = editorContent,
                aiPanelContent = aiPanelContent,
                modifier = modifier
            )
        }
        AdaptiveLayoutType.EXPANDED -> {
            // Tablet/Desktop: three column - sidebar + editor + AI
            ExpandedLayout(
                sidebarContent = sidebarContent,
                editorContent = editorContent,
                aiPanelContent = aiPanelContent,
                modifier = modifier
            )
        }
        AdaptiveLayoutType.FOLDABLE_BOOK -> {
            // Book posture: editor on left pane, AI on right pane
            FoldableBookLayout(
                foldingFeature = foldingFeature,
                editorContent = editorContent,
                aiPanelContent = aiPanelContent,
                modifier = modifier
            )
        }
        AdaptiveLayoutType.FOLDABLE_TABLETOP -> {
            // Tabletop: editor on top, AI panel + controls on bottom
            FoldableTabletopLayout(
                foldingFeature = foldingFeature,
                editorContent = editorContent,
                aiPanelContent = aiPanelContent,
                modifier = modifier
            )
        }
    }
}

@Composable
private fun CompactLayout(
    editorContent: @Composable (Modifier) -> Unit,
    aiPanelContent: @Composable (Modifier) -> Unit,
    modifier: Modifier = Modifier
) {
    // On phone: full-screen editor with AI as a draggable bottom sheet
    var showAiPanel by remember { mutableStateOf(false) }

    Box(modifier = modifier.fillMaxSize()) {
        editorContent(Modifier.fillMaxSize())

        if (showAiPanel) {
            // AI Panel slides up from bottom
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.6f)
                    .align(Alignment.BottomCenter),
                tonalElevation = 3.dp,
                shadowElevation = 8.dp,
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
            ) {
                Column {
                    // Drag handle
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            modifier = Modifier
                                .width(32.dp)
                                .height(4.dp),
                            shape = RoundedCornerShape(2.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                        ) {}
                    }
                    aiPanelContent(Modifier.fillMaxSize())
                }
            }
        }
    }
}

@Composable
private fun MediumLayout(
    editorContent: @Composable (Modifier) -> Unit,
    aiPanelContent: @Composable (Modifier) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(modifier = modifier.fillMaxSize()) {
        // Editor: 60%
        editorContent(Modifier.weight(0.6f).fillMaxHeight())

        // Divider
        VerticalDivider()

        // AI Panel: 40%
        aiPanelContent(Modifier.weight(0.4f).fillMaxHeight())
    }
}

@Composable
private fun ExpandedLayout(
    sidebarContent: @Composable (Modifier) -> Unit,
    editorContent: @Composable (Modifier) -> Unit,
    aiPanelContent: @Composable (Modifier) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(modifier = modifier.fillMaxSize()) {
        // Sidebar: 240dp fixed
        sidebarContent(Modifier.width(240.dp).fillMaxHeight())

        VerticalDivider()

        // Editor: flex
        editorContent(Modifier.weight(1f).fillMaxHeight())

        VerticalDivider()

        // AI Panel: 360dp fixed
        aiPanelContent(Modifier.width(360.dp).fillMaxHeight())
    }
}

@Composable
private fun FoldableBookLayout(
    foldingFeature: FoldingFeature?,
    editorContent: @Composable (Modifier) -> Unit,
    aiPanelContent: @Composable (Modifier) -> Unit,
    modifier: Modifier = Modifier
) {
    // Book mode: content split at the fold hinge
    val hingePadding = if (foldingFeature != null) {
        (foldingFeature.bounds.right - foldingFeature.bounds.left).coerceAtLeast(0)
    } else 0

    Row(modifier = modifier.fillMaxSize()) {
        // Left pane - Editor
        editorContent(Modifier.weight(1f).fillMaxHeight())

        // Hinge gap
        if (hingePadding > 0) {
            Spacer(modifier = Modifier.width(hingePadding.dp))
        }

        // Right pane - AI Panel
        aiPanelContent(Modifier.weight(1f).fillMaxHeight())
    }
}

@Composable
private fun FoldableTabletopLayout(
    foldingFeature: FoldingFeature?,
    editorContent: @Composable (Modifier) -> Unit,
    aiPanelContent: @Composable (Modifier) -> Unit,
    modifier: Modifier = Modifier
) {
    // Tabletop: split horizontally at the fold
    val hingePadding = if (foldingFeature != null) {
        (foldingFeature.bounds.bottom - foldingFeature.bounds.top).coerceAtLeast(0)
    } else 0

    Column(modifier = modifier.fillMaxSize()) {
        // Top pane - Editor (screen facing up)
        editorContent(Modifier.weight(1f).fillMaxWidth())

        // Hinge gap
        if (hingePadding > 0) {
            Spacer(modifier = Modifier.height(hingePadding.dp))
        }

        // Bottom pane - AI controls (on the "keyboard" half)
        aiPanelContent(Modifier.weight(1f).fillMaxWidth())
    }
}

@Composable
fun VerticalDivider(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .fillMaxHeight()
            .width(1.dp),
        color = MaterialTheme.colorScheme.outlineVariant
    ) {}
}
