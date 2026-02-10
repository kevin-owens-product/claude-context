@file:OptIn(ExperimentalMaterial3Api::class)

package com.claudecontext.localdev.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.claudecontext.localdev.data.models.ModelCatalog
import com.claudecontext.localdev.data.models.ModelProvider
import com.claudecontext.localdev.data.models.ModelTier

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
            // AI Model Providers
            SettingsSection("AI Model Providers") {
                Text(
                    "Configure API keys for each provider. Enable multiple providers to use multi-model routing.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )

                // Provider cards
                val editableProviders = listOf(
                    ModelProvider.ANTHROPIC, ModelProvider.OPENAI, ModelProvider.GOOGLE,
                    ModelProvider.MISTRAL, ModelProvider.GROQ, ModelProvider.OPENROUTER
                )

                editableProviders.forEach { provider ->
                    ProviderCard(
                        provider = provider,
                        apiKey = uiState.providerKeys[provider] ?: "",
                        isEnabled = uiState.enabledProviders.contains(provider),
                        onSaveKey = { key -> viewModel.saveProviderKey(provider, key) },
                        onToggle = { enabled -> viewModel.toggleProvider(provider, enabled) }
                    )
                }
            }

            HorizontalDivider()

            // Model Routing
            SettingsSection("Model Routing") {
                SettingsToggle(
                    title = "Auto-Route",
                    subtitle = "Automatically select the best model for each task",
                    checked = uiState.autoRoute,
                    onCheckedChange = { viewModel.setAutoRoute(it) }
                )

                // Primary model selector
                Text(
                    "Primary Model",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )

                val availableModels = ModelCatalog.models.filter { model ->
                    uiState.enabledProviders.contains(model.provider)
                }

                if (availableModels.isNotEmpty()) {
                    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                        availableModels.forEach { model ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                RadioButton(
                                    selected = uiState.selectedModel == model.id,
                                    onClick = { viewModel.setModel(model.id) }
                                )
                                Column {
                                    Text(model.displayName, style = MaterialTheme.typography.bodyMedium)
                                    Text(
                                        "${model.provider.displayName} | ${model.costEstimate}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                } else {
                    Text(
                        "Configure at least one provider above to see available models",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }

                // Fast/Code/Reasoning model overrides
                if (uiState.autoRoute && availableModels.size > 1) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Routing Overrides (optional)",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                    Text(
                        "Assign specific models to task types. Leave empty for auto-selection.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp)
                    )

                    ModelOverrideSelector(
                        label = "Fast (simple Q&A, docs)",
                        selectedModel = uiState.fastModel,
                        models = availableModels.filter { it.tier == ModelTier.FAST },
                        onSelect = { viewModel.setFastModel(it) }
                    )
                    ModelOverrideSelector(
                        label = "Code (generation, editing)",
                        selectedModel = uiState.codeModel,
                        models = availableModels,
                        onSelect = { viewModel.setCodeModel(it) }
                    )
                    ModelOverrideSelector(
                        label = "Reasoning (planning, analysis)",
                        selectedModel = uiState.reasoningModel,
                        models = availableModels.filter { it.tier == ModelTier.PREMIUM || it.tier == ModelTier.STANDARD },
                        onSelect = { viewModel.setReasoningModel(it) }
                    )
                }
            }

            HorizontalDivider()

            // Local Model
            SettingsSection("Local Model") {
                Text(
                    "Run a local open-source model for routing and simple queries. Requires llama.cpp and a GGUF model file.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )

                val localStatus = uiState.localModelStatus
                if (localStatus.isRunning) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF10B981).copy(alpha = 0.1f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.CheckCircle, null,
                                tint = Color(0xFF10B981),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "Running: ${localStatus.modelName}",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    "Port ${localStatus.port} | ${localStatus.requestCount} requests",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Button(
                                onClick = { viewModel.stopLocalModel() },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                            ) {
                                Text("Stop")
                            }
                        }
                    }
                } else {
                    var localModelPath by remember { mutableStateOf("") }

                    OutlinedTextField(
                        value = localModelPath,
                        onValueChange = { localModelPath = it },
                        label = { Text("GGUF Model Path") },
                        placeholder = { Text("/sdcard/models/phi-3-mini-Q4_K_M.gguf") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = { viewModel.startLocalModel(localModelPath) },
                        modifier = Modifier.padding(horizontal = 16.dp),
                        enabled = localModelPath.isNotBlank()
                    ) {
                        Text("Start Local Model")
                    }

                    localStatus.error?.let { error ->
                        Text(
                            error,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            HorizontalDivider()

            // Subscription
            SettingsSection("Subscription") {
                val isSubscribed = uiState.subscriptionStatus == "active"

                if (isSubscribed) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF6366F1).copy(alpha = 0.1f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Star, null,
                                tint = Color(0xFF6366F1),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    "Pro Subscriber",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "Plan: ${uiState.subscriptionPlan} | Renews: ${uiState.subscriptionExpiry}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { viewModel.manageSubscription() },
                        modifier = Modifier.padding(horizontal = 16.dp)
                    ) {
                        Text("Manage Subscription")
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "Upgrade to Pro",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Unlock multi-model routing, swarm mode, prompt queue, and unlimited sessions.",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { viewModel.subscribe("monthly") },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("$5/mo", fontWeight = FontWeight.Bold)
                                        Text("Monthly", style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                                Button(
                                    onClick = { viewModel.subscribe("annual") },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("$50/yr", fontWeight = FontWeight.Bold)
                                        Text("Save 17%", style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
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
                                Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.tertiary)
                            } else {
                                Icon(Icons.Default.Cancel, null, tint = MaterialTheme.colorScheme.error)
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

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    "Claude Local Dev v2.0.0",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    "Build & test code locally on Android & iOS",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun ProviderCard(
    provider: ModelProvider,
    apiKey: String,
    isEnabled: Boolean,
    onSaveKey: (String) -> Unit,
    onToggle: (Boolean) -> Unit
) {
    var key by remember(apiKey) { mutableStateOf(apiKey) }
    var showKey by remember { mutableStateOf(false) }
    var expanded by remember { mutableStateOf(false) }

    val providerColor = when (provider) {
        ModelProvider.ANTHROPIC -> Color(0xFFD97706)
        ModelProvider.OPENAI -> Color(0xFF10B981)
        ModelProvider.GOOGLE -> Color(0xFF4285F4)
        ModelProvider.MISTRAL -> Color(0xFFFF7000)
        ModelProvider.GROQ -> Color(0xFFEF4444)
        ModelProvider.OPENROUTER -> Color(0xFF6366F1)
        else -> MaterialTheme.colorScheme.primary
    }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isEnabled) providerColor.copy(alpha = 0.05f) else MaterialTheme.colorScheme.surface,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        provider.displayName,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        "${ModelCatalog.getByProvider(provider).size} models available",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Switch(
                    checked = isEnabled,
                    onCheckedChange = onToggle,
                    colors = SwitchDefaults.colors(checkedTrackColor = providerColor)
                )
            }

            if (expanded || !isEnabled) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = key,
                    onValueChange = { key = it },
                    label = { Text("API Key") },
                    modifier = Modifier.fillMaxWidth(),
                    visualTransformation = if (showKey) VisualTransformation.None
                    else PasswordVisualTransformation(),
                    trailingIcon = {
                        Row {
                            IconButton(onClick = { showKey = !showKey }) {
                                Icon(
                                    if (showKey) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    "Toggle"
                                )
                            }
                            if (key != apiKey && key.isNotBlank()) {
                                IconButton(onClick = { onSaveKey(key) }) {
                                    Icon(Icons.Default.Save, "Save", tint = providerColor)
                                }
                            }
                        }
                    },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodySmall
                )
            }

            if (isEnabled) {
                TextButton(onClick = { expanded = !expanded }) {
                    Text(if (expanded) "Hide key" else "Edit key")
                }
            }
        }
    }
}

@Composable
private fun ModelOverrideSelector(
    label: String,
    selectedModel: String?,
    models: List<com.claudecontext.localdev.data.models.AiModel>,
    onSelect: (String?) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.weight(1f)
        )
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded }
        ) {
            OutlinedTextField(
                value = selectedModel?.let { id -> models.find { it.id == id }?.displayName } ?: "Auto",
                onValueChange = {},
                readOnly = true,
                modifier = Modifier
                    .width(160.dp)
                    .menuAnchor(),
                textStyle = MaterialTheme.typography.bodySmall,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) }
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                DropdownMenuItem(
                    text = { Text("Auto") },
                    onClick = {
                        onSelect(null)
                        expanded = false
                    }
                )
                models.forEach { model ->
                    DropdownMenuItem(
                        text = { Text("${model.displayName} (${model.costEstimate})") },
                        onClick = {
                            onSelect(model.id)
                            expanded = false
                        }
                    )
                }
            }
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
