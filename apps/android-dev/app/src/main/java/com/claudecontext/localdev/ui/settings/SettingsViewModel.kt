package com.claudecontext.localdev.ui.settings

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    val toolchainStatus: Map<String, Boolean> = emptyMap()
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val claudeApiService: ClaudeApiService,
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
    }

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            val prefs = context.dataStore.data.first()
            val apiKey = prefs[API_KEY] ?: ""

            _uiState.value = SettingsUiState(
                apiKey = apiKey,
                selectedModel = prefs[SELECTED_MODEL] ?: "claude-sonnet-4-20250514",
                gitUserName = prefs[GIT_USER_NAME] ?: getGitConfig("user.name"),
                gitUserEmail = prefs[GIT_USER_EMAIL] ?: getGitConfig("user.email"),
                darkTheme = prefs[DARK_THEME] ?: true,
                showLineNumbers = prefs[SHOW_LINE_NUMBERS] ?: true,
                wordWrap = prefs[WORD_WRAP] ?: false,
                fontSize = prefs[FONT_SIZE] ?: 13
            )

            if (apiKey.isNotEmpty()) {
                claudeApiService.setApiKey(apiKey)
            }
        }
    }

    fun saveApiKey(key: String) {
        viewModelScope.launch {
            context.dataStore.edit { it[API_KEY] = key }
            claudeApiService.setApiKey(key)
            _uiState.value = _uiState.value.copy(apiKey = key)
        }
    }

    fun setModel(model: String) {
        viewModelScope.launch {
            context.dataStore.edit { it[SELECTED_MODEL] = model }
            _uiState.value = _uiState.value.copy(selectedModel = model)
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
