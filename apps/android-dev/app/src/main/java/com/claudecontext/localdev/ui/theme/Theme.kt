package com.claudecontext.localdev.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val ClaudePrimary = Color(0xFFD97706)
private val ClaudeOnPrimary = Color(0xFFFFFFFF)
private val ClaudeSecondary = Color(0xFF6366F1)
private val ClaudeTertiary = Color(0xFF10B981)
private val ClaudeError = Color(0xFFEF4444)

private val DarkBackground = Color(0xFF0F172A)
private val DarkSurface = Color(0xFF1E293B)
private val DarkSurfaceVariant = Color(0xFF334155)
private val DarkOnBackground = Color(0xFFF1F5F9)
private val DarkOnSurface = Color(0xFFE2E8F0)

private val LightBackground = Color(0xFFF8FAFC)
private val LightSurface = Color(0xFFFFFFFF)
private val LightSurfaceVariant = Color(0xFFF1F5F9)
private val LightOnBackground = Color(0xFF0F172A)
private val LightOnSurface = Color(0xFF1E293B)

private val DarkColorScheme = darkColorScheme(
    primary = ClaudePrimary,
    onPrimary = ClaudeOnPrimary,
    secondary = ClaudeSecondary,
    tertiary = ClaudeTertiary,
    error = ClaudeError,
    background = DarkBackground,
    surface = DarkSurface,
    surfaceVariant = DarkSurfaceVariant,
    onBackground = DarkOnBackground,
    onSurface = DarkOnSurface,
    onSurfaceVariant = Color(0xFFCBD5E1)
)

private val LightColorScheme = lightColorScheme(
    primary = ClaudePrimary,
    onPrimary = ClaudeOnPrimary,
    secondary = ClaudeSecondary,
    tertiary = ClaudeTertiary,
    error = ClaudeError,
    background = LightBackground,
    surface = LightSurface,
    surfaceVariant = LightSurfaceVariant,
    onBackground = LightOnBackground,
    onSurface = LightOnSurface,
    onSurfaceVariant = Color(0xFF64748B)
)

@Composable
fun ClaudeLocalDevTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
