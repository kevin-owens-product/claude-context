package com.claudecontext.localdev.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.claudecontext.localdev.data.models.AiMode

@Composable
fun ModeSwitcher(
    currentMode: AiMode,
    onModeSelected: (AiMode) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        AiMode.entries.forEach { mode ->
            val isSelected = mode == currentMode
            val (icon, color) = when (mode) {
                AiMode.AGENT -> Icons.Default.SmartToy to Color(0xFF6366F1)
                AiMode.DEBUG -> Icons.Default.BugReport to Color(0xFFEF4444)
                AiMode.PLAN -> Icons.Default.Architecture to Color(0xFF10B981)
                AiMode.SWARM -> Icons.Default.Hub to Color(0xFFF59E0B)
                AiMode.QUEUE -> Icons.Default.Queue to Color(0xFF8B5CF6)
            }

            ModeChip(
                label = mode.displayName,
                icon = icon,
                color = color,
                isSelected = isSelected,
                onClick = { onModeSelected(mode) },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun ModeChip(
    label: String,
    icon: ImageVector,
    color: Color,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
        color = if (isSelected) color.copy(alpha = 0.15f) else Color.Transparent,
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(vertical = 8.dp, horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                icon,
                contentDescription = label,
                modifier = Modifier.size(18.dp),
                tint = if (isSelected) color else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) color else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
