@file:OptIn(ExperimentalFoundationApi::class)

package com.claudecontext.localdev.ui.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    onComplete: () -> Unit,
    onSetApiKey: (String, String) -> Unit
) {
    val pages = listOf(
        OnboardingPage(
            icon = Icons.Default.Code,
            title = "Code Anywhere",
            description = "A full development environment in your pocket. Edit code, run builds, and manage projects directly from your phone.",
            color = Color(0xFF6366F1)
        ),
        OnboardingPage(
            icon = Icons.Default.SmartToy,
            title = "AI-Powered Modes",
            description = "Agent, Debug, Plan, Swarm, and Queue modes. Let AI handle the heavy lifting while you guide the direction.",
            color = Color(0xFF10B981)
        ),
        OnboardingPage(
            icon = Icons.Default.Hub,
            title = "Multi-Model Support",
            description = "Route tasks to the best AI model. Use Claude, GPT, Gemini, Mistral, or local models - all in one app.",
            color = Color(0xFFF59E0B)
        ),
        OnboardingPage(
            icon = Icons.Default.Key,
            title = "Set Up Your API Key",
            description = "Enter at least one API key to get started. You can add more providers later in Settings.",
            color = Color(0xFFEC4899),
            isApiKeyStep = true
        )
    )

    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()
    var apiProvider by remember { mutableStateOf("anthropic") }
    var apiKey by remember { mutableStateOf("") }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Skip button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.End
            ) {
                if (pagerState.currentPage < pages.size - 1) {
                    TextButton(onClick = {
                        scope.launch {
                            pagerState.animateScrollToPage(pages.size - 1)
                        }
                    }) {
                        Text("Skip")
                    }
                }
            }

            // Pages
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f)
            ) { page ->
                val pageData = pages[page]
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Icon
                    Surface(
                        modifier = Modifier.size(100.dp),
                        shape = CircleShape,
                        color = pageData.color.copy(alpha = 0.15f)
                    ) {
                        Icon(
                            pageData.icon,
                            contentDescription = null,
                            modifier = Modifier
                                .padding(24.dp)
                                .fillMaxSize(),
                            tint = pageData.color
                        )
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    Text(
                        pageData.title,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        pageData.description,
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // API Key input on last step
                    if (pageData.isApiKeyStep) {
                        Spacer(modifier = Modifier.height(32.dp))

                        // Provider selector
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("anthropic" to "Claude", "openai" to "OpenAI", "google" to "Gemini").forEach { (id, label) ->
                                FilterChip(
                                    selected = apiProvider == id,
                                    onClick = { apiProvider = id },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = apiKey,
                            onValueChange = { apiKey = it },
                            label = { Text("API Key") },
                            placeholder = { Text("sk-...") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            "Your key is stored locally and encrypted. Never sent to our servers.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            // Page indicators
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.Center
            ) {
                repeat(pages.size) { index ->
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 4.dp)
                            .size(if (index == pagerState.currentPage) 10.dp else 8.dp)
                            .clip(CircleShape)
                            .background(
                                if (index == pagerState.currentPage) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                            )
                    )
                }
            }

            // Bottom buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (pagerState.currentPage > 0) {
                    OutlinedButton(
                        onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) } },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Back")
                    }
                }

                Button(
                    onClick = {
                        if (pagerState.currentPage < pages.size - 1) {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        } else {
                            // Final step - save API key and complete
                            if (apiKey.isNotBlank()) {
                                onSetApiKey(apiProvider, apiKey)
                            }
                            onComplete()
                        }
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        if (pagerState.currentPage < pages.size - 1) "Next"
                        else if (apiKey.isNotBlank()) "Get Started"
                        else "Skip for Now"
                    )
                }
            }
        }
    }
}

private data class OnboardingPage(
    val icon: ImageVector,
    val title: String,
    val description: String,
    val color: Color,
    val isApiKeyStep: Boolean = false
)
