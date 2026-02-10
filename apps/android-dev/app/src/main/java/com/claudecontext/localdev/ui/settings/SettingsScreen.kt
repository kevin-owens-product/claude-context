package com.claudecontext.localdev.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Claude API section
            SettingsSection("Claude API") {
                var apiKey by remember { mutableStateOf(uiState.apiKey) }
                var showKey by remember { mutableStateOf(false) }

                OutlinedTextField(
                    value = apiKey,
                    onValueChange = { apiKey = it },
                    label = { Text("API Key") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    visualTransformation = if (showKey) VisualTransformation.None
                    else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showKey = !showKey }) {
                            Icon(
                                if (showKey) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                "Toggle visibility"
                            )
                        }
                    },
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { viewModel.saveApiKey(apiKey) },
                    modifier = Modifier.padding(horizontal = 16.dp)
                ) {
                    Text("Save API Key")
                }

                // Model selector
                var selectedModel by remember { mutableStateOf(uiState.selectedModel) }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Model",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    listOf(
                        "claude-sonnet-4-20250514" to "Claude Sonnet 4 (Fast)",
                        "claude-opus-4-20250514" to "Claude Opus 4 (Best)"
                    ).forEach { (model, label) ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            RadioButton(
                                selected = selectedModel == model,
                                onClick = {
                                    selectedModel = model
                                    viewModel.setModel(model)
                                }
                            )
                            Text(label, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }

            HorizontalDivider()

            // Git configuration
            SettingsSection("Git") {
                var gitName by remember { mutableStateOf(uiState.gitUserName) }
                var gitEmail by remember { mutableStateOf(uiState.gitUserEmail) }

                OutlinedTextField(
                    value = gitName,
                    onValueChange = { gitName = it },
                    label = { Text("User Name") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = gitEmail,
                    onValueChange = { gitEmail = it },
                    label = { Text("User Email") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { viewModel.saveGitConfig(gitName, gitEmail) },
                    modifier = Modifier.padding(horizontal = 16.dp)
                ) {
                    Text("Save Git Config")
                }
            }

            HorizontalDivider()

            // Editor settings
            SettingsSection("Editor") {
                SettingsToggle(
                    title = "Dark Theme",
                    subtitle = "Use dark color scheme",
                    checked = uiState.darkTheme,
                    onCheckedChange = { viewModel.setDarkTheme(it) }
                )
                SettingsToggle(
                    title = "Line Numbers",
                    subtitle = "Show line numbers in editor",
                    checked = uiState.showLineNumbers,
                    onCheckedChange = { viewModel.setShowLineNumbers(it) }
                )
                SettingsToggle(
                    title = "Word Wrap",
                    subtitle = "Wrap long lines in editor",
                    checked = uiState.wordWrap,
                    onCheckedChange = { viewModel.setWordWrap(it) }
                )

                // Font size
                Text(
                    "Font Size: ${uiState.fontSize}sp",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = uiState.fontSize.toFloat(),
                    onValueChange = { viewModel.setFontSize(it.toInt()) },
                    valueRange = 10f..24f,
                    steps = 13,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            HorizontalDivider()

            // Toolchain status
            SettingsSection("Installed Tools") {
                uiState.toolchainStatus.forEach { (tool, installed) ->
                    ListItem(
                        headlineContent = { Text(tool) },
                        trailingContent = {
                            if (installed) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    null,
                                    tint = MaterialTheme.colorScheme.tertiary
                                )
                            } else {
                                Icon(
                                    Icons.Default.Cancel,
                                    null,
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    )
                }
                if (uiState.toolchainStatus.isEmpty()) {
                    Button(
                        onClick = { viewModel.checkToolchain() },
                        modifier = Modifier.padding(horizontal = 16.dp)
                    ) {
                        Text("Check Toolchain")
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // App info
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    "Claude Local Dev v1.0.0",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    "Build & test code locally on Android",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun SettingsSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            color = MaterialTheme.colorScheme.primary
        )
        content()
        Spacer(modifier = Modifier.height(8.dp))
    }
}

@Composable
private fun SettingsToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = { Text(subtitle) },
        trailingContent = {
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    )
}
