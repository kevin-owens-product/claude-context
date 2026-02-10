package com.claudecontext.localdev.ui.settings

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.claudecontext.localdev.data.models.ModelProvider
import com.claudecontext.localdev.data.models.ModelRoutingConfig
import com.claudecontext.localdev.service.ai.LocalModelService
import com.claudecontext.localdev.service.ai.MultiModelService
import com.claudecontext.localdev.service.billing.BillingService
import com.claudecontext.localdev.service.claude.ClaudeApiService
import com.claudecontext.localdev.service.packages.PackageManagerService
import com.claudecontext.localdev.service.shell.ShellExecutor
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

private val Context.dataStore by preferencesDataStore(name = "settings")

data class SettingsUiState(
    val apiKey: String = "",
    val selectedModel: String = "claude-sonnet-4-20250514",
    val gitUserName: String = "",
    val gitUserEmail: String = "",
    val darkTheme: Boolean = true,
    val showLineNumbers: Boolean = true,
    val wordWrap: Boolean = false,
    val fontSize: Int = 13,
    val toolchainStatus: Map<String, Boolean> = emptyMap(),
    // Multi-model
    val providerKeys: Map<ModelProvider, String> = emptyMap(),
    val enabledProviders: Set<ModelProvider> = emptySet(),
    val autoRoute: Boolean = true,
    val fastModel: String? = null,
    val codeModel: String? = null,
    val reasoningModel: String? = null,
    // Local model
    val localModelStatus: LocalModelService.LocalModelStatus = LocalModelService.LocalModelStatus(),
    // Billing
    val subscriptionStatus: String = "inactive",
    val subscriptionPlan: String = "",
    val subscriptionExpiry: String = ""
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val claudeApiService: ClaudeApiService,
    private val multiModelService: MultiModelService,
    private val localModelService: LocalModelService,
    private val billingService: BillingService,
    private val shell: ShellExecutor,
    private val packageManager: PackageManagerService
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    companion object {
        val API_KEY = stringPreferencesKey("api_key")
        val SELECTED_MODEL = stringPreferencesKey("selected_model")
        val GIT_USER_NAME = stringPreferencesKey("git_user_name")
        val GIT_USER_EMAIL = stringPreferencesKey("git_user_email")
        val DARK_THEME = booleanPreferencesKey("dark_theme")
        val SHOW_LINE_NUMBERS = booleanPreferencesKey("show_line_numbers")
        val WORD_WRAP = booleanPreferencesKey("word_wrap")
        val FONT_SIZE = intPreferencesKey("font_size")
        val AUTO_ROUTE = booleanPreferencesKey("auto_route")
        val FAST_MODEL = stringPreferencesKey("fast_model")
        val CODE_MODEL = stringPreferencesKey("code_model")
        val REASONING_MODEL = stringPreferencesKey("reasoning_model")

        fun providerKeyPref(provider: ModelProvider) =
            stringPreferencesKey("provider_key_${provider.name}")
        fun providerEnabledPref(provider: ModelProvider) =
            booleanPreferencesKey("provider_enabled_${provider.name}")
    }

    init {
        loadSettings()
        collectLocalModelStatus()
        collectBillingStatus()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            val prefs = context.dataStore.data.first()
            val apiKey = prefs[API_KEY] ?: ""

            // Load provider keys
            val providerKeys = mutableMapOf<ModelProvider, String>()
            val enabledProviders = mutableSetOf<ModelProvider>()

            ModelProvider.entries.forEach { provider ->
                val key = prefs[providerKeyPref(provider)] ?: ""
                if (key.isNotEmpty()) providerKeys[provider] = key
                if (prefs[providerEnabledPref(provider)] == true) enabledProviders.add(provider)
            }

            // Migrate: if old API key exists but no provider key, set it for Anthropic
            if (apiKey.isNotEmpty() && !providerKeys.containsKey(ModelProvider.ANTHROPIC)) {
                providerKeys[ModelProvider.ANTHROPIC] = apiKey
                enabledProviders.add(ModelProvider.ANTHROPIC)
            }

            _uiState.value = SettingsUiState(
                apiKey = apiKey,
                selectedModel = prefs[SELECTED_MODEL] ?: "claude-sonnet-4-20250514",
                gitUserName = prefs[GIT_USER_NAME] ?: getGitConfig("user.name"),
                gitUserEmail = prefs[GIT_USER_EMAIL] ?: getGitConfig("user.email"),
                darkTheme = prefs[DARK_THEME] ?: true,
                showLineNumbers = prefs[SHOW_LINE_NUMBERS] ?: true,
                wordWrap = prefs[WORD_WRAP] ?: false,
                fontSize = prefs[FONT_SIZE] ?: 13,
                providerKeys = providerKeys,
                enabledProviders = enabledProviders,
                autoRoute = prefs[AUTO_ROUTE] ?: true,
                fastModel = prefs[FAST_MODEL],
                codeModel = prefs[CODE_MODEL],
                reasoningModel = prefs[REASONING_MODEL]
            )

            // Configure services
            if (apiKey.isNotEmpty()) {
                claudeApiService.setApiKey(apiKey)
            }
            providerKeys.forEach { (provider, key) ->
                if (enabledProviders.contains(provider)) {
                    multiModelService.configureProvider(provider, key)
                }
            }
            multiModelService.setRoutingConfig(ModelRoutingConfig(
                primaryModel = _uiState.value.selectedModel,
                fastModel = _uiState.value.fastModel,
                codeModel = _uiState.value.codeModel,
                reasoningModel = _uiState.value.reasoningModel,
                autoRoute = _uiState.value.autoRoute
            ))
        }
    }

    private fun collectLocalModelStatus() {
        viewModelScope.launch {
            localModelService.status.collect { status ->
                _uiState.value = _uiState.value.copy(localModelStatus = status)
            }
        }
    }

    private fun collectBillingStatus() {
        viewModelScope.launch {
            billingService.subscriptionState.collect { state ->
                _uiState.value = _uiState.value.copy(
                    subscriptionStatus = state.status,
                    subscriptionPlan = state.plan,
                    subscriptionExpiry = state.expiryDate
                )
            }
        }
    }

    // --- Provider Management ---

    fun saveProviderKey(provider: ModelProvider, key: String) {
        viewModelScope.launch {
            context.dataStore.edit { it[providerKeyPref(provider)] = key }
            val keys = _uiState.value.providerKeys.toMutableMap()
            keys[provider] = key
            _uiState.value = _uiState.value.copy(providerKeys = keys)
            multiModelService.configureProvider(provider, key)

            // Keep backward compatibility for Claude
            if (provider == ModelProvider.ANTHROPIC) {
                context.dataStore.edit { it[API_KEY] = key }
                claudeApiService.setApiKey(key)
                _uiState.value = _uiState.value.copy(apiKey = key)
            }
        }
    }

    fun toggleProvider(provider: ModelProvider, enabled: Boolean) {
        viewModelScope.launch {
            context.dataStore.edit { it[providerEnabledPref(provider)] = enabled }
            val providers = _uiState.value.enabledProviders.toMutableSet()
            if (enabled) providers.add(provider) else providers.remove(provider)
            _uiState.value = _uiState.value.copy(enabledProviders = providers)

            val key = _uiState.value.providerKeys[provider] ?: ""
            if (enabled && key.isNotEmpty()) {
                multiModelService.configureProvider(provider, key)
            }
        }
    }

    // --- Model Routing ---

    fun setAutoRoute(enabled: Boolean) {
        viewModelScope.launch {
            context.dataStore.edit { it[AUTO_ROUTE] = enabled }
            _uiState.value = _uiState.value.copy(autoRoute = enabled)
            updateRoutingConfig()
        }
    }

    fun setFastModel(modelId: String?) {
        viewModelScope.launch {
            if (modelId != null) context.dataStore.edit { it[FAST_MODEL] = modelId }
            else context.dataStore.edit { it.remove(FAST_MODEL) }
            _uiState.value = _uiState.value.copy(fastModel = modelId)
            updateRoutingConfig()
        }
    }

    fun setCodeModel(modelId: String?) {
        viewModelScope.launch {
            if (modelId != null) context.dataStore.edit { it[CODE_MODEL] = modelId }
            else context.dataStore.edit { it.remove(CODE_MODEL) }
            _uiState.value = _uiState.value.copy(codeModel = modelId)
            updateRoutingConfig()
        }
    }

    fun setReasoningModel(modelId: String?) {
        viewModelScope.launch {
            if (modelId != null) context.dataStore.edit { it[REASONING_MODEL] = modelId }
            else context.dataStore.edit { it.remove(REASONING_MODEL) }
            _uiState.value = _uiState.value.copy(reasoningModel = modelId)
            updateRoutingConfig()
        }
    }

    private fun updateRoutingConfig() {
        multiModelService.setRoutingConfig(ModelRoutingConfig(
            primaryModel = _uiState.value.selectedModel,
            fastModel = _uiState.value.fastModel,
            codeModel = _uiState.value.codeModel,
            reasoningModel = _uiState.value.reasoningModel,
            autoRoute = _uiState.value.autoRoute
        ))
    }

    // --- Local Model ---

    fun startLocalModel(modelPath: String) {
        viewModelScope.launch {
            localModelService.startServer(modelPath)
        }
    }

    fun stopLocalModel() {
        localModelService.stopServer()
    }

    // --- Billing ---

    fun subscribe(plan: String) {
        viewModelScope.launch {
            billingService.startSubscription(plan)
        }
    }

    fun manageSubscription() {
        viewModelScope.launch {
            billingService.openManagementPortal()
        }
    }

    // --- Legacy methods ---

    fun saveApiKey(key: String) {
        saveProviderKey(ModelProvider.ANTHROPIC, key)
    }

    fun setModel(model: String) {
        viewModelScope.launch {
            context.dataStore.edit { it[SELECTED_MODEL] = model }
            _uiState.value = _uiState.value.copy(selectedModel = model)
            updateRoutingConfig()
        }
    }

    fun saveGitConfig(name: String, email: String) {
        viewModelScope.launch {
            shell.execute("git config --global user.name \"$name\"")
            shell.execute("git config --global user.email \"$email\"")
            context.dataStore.edit {
                it[GIT_USER_NAME] = name
                it[GIT_USER_EMAIL] = email
            }
            _uiState.value = _uiState.value.copy(gitUserName = name, gitUserEmail = email)
        }
    }

    fun setDarkTheme(enabled: Boolean) {
        viewModelScope.launch {
            context.dataStore.edit { it[DARK_THEME] = enabled }
            _uiState.value = _uiState.value.copy(darkTheme = enabled)
        }
    }

    fun setShowLineNumbers(enabled: Boolean) {
        viewModelScope.launch {
            context.dataStore.edit { it[SHOW_LINE_NUMBERS] = enabled }
            _uiState.value = _uiState.value.copy(showLineNumbers = enabled)
        }
    }

    fun setWordWrap(enabled: Boolean) {
        viewModelScope.launch {
            context.dataStore.edit { it[WORD_WRAP] = enabled }
            _uiState.value = _uiState.value.copy(wordWrap = enabled)
        }
    }

    fun setFontSize(size: Int) {
        viewModelScope.launch {
            context.dataStore.edit { it[FONT_SIZE] = size }
            _uiState.value = _uiState.value.copy(fontSize = size)
        }
    }

    fun checkToolchain() {
        viewModelScope.launch {
            val tools = listOf(
                "git", "python3", "node", "npm", "java", "kotlin",
                "rustc", "cargo", "go", "gcc", "make"
            )
            val status = mutableMapOf<String, Boolean>()
            for (tool in tools) {
                status[tool] = shell.isCommandAvailable(tool)
            }
            _uiState.value = _uiState.value.copy(toolchainStatus = status)
        }
    }

    private suspend fun getGitConfig(key: String): String {
        val result = shell.execute("git config --global $key")
        return if (result.isSuccess) result.stdout.trim() else ""
    }
}
