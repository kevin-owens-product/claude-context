package com.claudecontext.localdev.ui.auth

import android.app.Activity
import android.app.Application
import android.util.Patterns
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.claudecontext.localdev.service.auth.AuthManager
import com.claudecontext.localdev.service.auth.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    // Form fields
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val rememberMe: Boolean = false,

    // Form validation errors
    val nameError: String? = null,
    val emailError: String? = null,
    val passwordError: String? = null,
    val confirmPasswordError: String? = null,

    // Mode toggles
    val isLoginMode: Boolean = true,
    val isForgotPasswordMode: Boolean = false,

    // State from AuthManager
    val isAuthenticated: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,

    // Biometric
    val biometricAvailable: Boolean = false,
    val biometricEnabled: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    application: Application,
    private val authManager: AuthManager
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        observeAuthState()
        checkBiometricAvailability()
    }

    private fun observeAuthState() {
        viewModelScope.launch {
            authManager.authState.collect { authState ->
                _uiState.value = _uiState.value.copy(
                    isAuthenticated = authState.isAuthenticated,
                    isLoading = authState.isLoading,
                    error = authState.error ?: _uiState.value.error,
                    biometricEnabled = authState.biometricEnabled
                )
            }
        }
    }

    private fun checkBiometricAvailability() {
        _uiState.value = _uiState.value.copy(
            biometricAvailable = authManager.isBiometricAvailable()
        )
    }

    // --- Form Field Updates ---

    fun updateName(name: String) {
        _uiState.value = _uiState.value.copy(
            name = name,
            nameError = null
        )
    }

    fun updateEmail(email: String) {
        _uiState.value = _uiState.value.copy(
            email = email,
            emailError = null
        )
    }

    fun updatePassword(password: String) {
        _uiState.value = _uiState.value.copy(
            password = password,
            passwordError = null,
            confirmPasswordError = null
        )
    }

    fun updateConfirmPassword(confirmPassword: String) {
        _uiState.value = _uiState.value.copy(
            confirmPassword = confirmPassword,
            confirmPasswordError = null
        )
    }

    fun updateRememberMe(rememberMe: Boolean) {
        _uiState.value = _uiState.value.copy(rememberMe = rememberMe)
    }

    // --- Mode Switching ---

    fun setLoginMode(isLogin: Boolean) {
        _uiState.value = _uiState.value.copy(
            isLoginMode = isLogin,
            isForgotPasswordMode = false,
            nameError = null,
            emailError = null,
            passwordError = null,
            confirmPasswordError = null,
            error = null,
            successMessage = null
        )
    }

    fun setForgotPasswordMode(isForgotPassword: Boolean) {
        _uiState.value = _uiState.value.copy(
            isForgotPasswordMode = isForgotPassword,
            emailError = null,
            error = null,
            successMessage = null
        )
    }

    // --- Clear Messages ---

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
        authManager.clearError()
    }

    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }

    // --- Login ---

    fun login() {
        val state = _uiState.value

        // Validate
        val emailError = validateEmail(state.email)
        val passwordError = validateLoginPassword(state.password)

        if (emailError != null || passwordError != null) {
            _uiState.value = state.copy(
                emailError = emailError,
                passwordError = passwordError
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(error = null, successMessage = null)
            val result = authManager.login(state.email.trim(), state.password)

            if (result.isSuccess && state.rememberMe) {
                authManager.setBiometricEnabled(
                    authManager.isBiometricAvailable()
                )
            }

            if (result.isFailure) {
                _uiState.value = _uiState.value.copy(
                    error = result.exceptionOrNull()?.message ?: "Login failed"
                )
            }
        }
    }

    // --- Signup ---

    fun signup() {
        val state = _uiState.value

        // Validate all fields
        val nameError = validateName(state.name)
        val emailError = validateEmail(state.email)
        val passwordError = validateSignupPassword(state.password)
        val confirmPasswordError = validateConfirmPassword(state.password, state.confirmPassword)

        if (nameError != null || emailError != null ||
            passwordError != null || confirmPasswordError != null
        ) {
            _uiState.value = state.copy(
                nameError = nameError,
                emailError = emailError,
                passwordError = passwordError,
                confirmPasswordError = confirmPasswordError
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(error = null, successMessage = null)
            val result = authManager.signup(
                email = state.email.trim(),
                password = state.password,
                name = state.name.trim()
            )

            if (result.isFailure) {
                _uiState.value = _uiState.value.copy(
                    error = result.exceptionOrNull()?.message ?: "Signup failed"
                )
            }
        }
    }

    // --- Logout ---

    fun logout() {
        viewModelScope.launch {
            authManager.logout()
            _uiState.value = AuthUiState(
                biometricAvailable = authManager.isBiometricAvailable()
            )
        }
    }

    // --- Biometric Auth ---

    fun authenticateWithBiometric() {
        val app = getApplication<Application>()

        // Find the current activity from the application context.
        // In a real Compose app this is typically provided via LocalContext.current.
        // Here we use a utility approach to get the foreground activity.
        val activity = getCurrentActivity(app)
        if (activity == null || activity !is FragmentActivity) {
            _uiState.value = _uiState.value.copy(
                error = "Unable to launch biometric prompt. Please try again."
            )
            return
        }

        authManager.authenticateWithBiometric(
            activity = activity,
            onSuccess = {
                // Auth state will be updated by the observer
            },
            onError = { errorMessage ->
                _uiState.value = _uiState.value.copy(error = errorMessage)
            }
        )
    }

    private fun getCurrentActivity(app: Application): Activity? {
        try {
            val activityThread = Class.forName("android.app.ActivityThread")
            val currentActivityThread = activityThread.getMethod("currentActivityThread").invoke(null)
            val activitiesField = activityThread.getDeclaredField("mActivities")
            activitiesField.isAccessible = true

            @Suppress("UNCHECKED_CAST")
            val activities = activitiesField.get(currentActivityThread) as? android.util.ArrayMap<Any, Any>
                ?: return null

            for (activityRecord in activities.values) {
                val activityRecordClass = activityRecord.javaClass
                val pausedField = activityRecordClass.getDeclaredField("paused")
                pausedField.isAccessible = true

                if (!pausedField.getBoolean(activityRecord)) {
                    val activityField = activityRecordClass.getDeclaredField("activity")
                    activityField.isAccessible = true
                    return activityField.get(activityRecord) as? Activity
                }
            }
        } catch (_: Exception) {
            // Reflection-based approach failed; fall back gracefully
        }
        return null
    }

    // --- Forgot Password ---

    fun requestPasswordReset() {
        val state = _uiState.value

        val emailError = validateEmail(state.email)
        if (emailError != null) {
            _uiState.value = state.copy(emailError = emailError)
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(error = null, successMessage = null)
            val result = authManager.requestPasswordReset(state.email.trim())

            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(
                    successMessage = result.getOrNull(),
                    isForgotPasswordMode = false
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    error = result.exceptionOrNull()?.message ?: "Password reset failed"
                )
            }
        }
    }

    // --- Validation ---

    private fun validateName(name: String): String? {
        val trimmed = name.trim()
        return when {
            trimmed.isEmpty() -> "Name is required"
            trimmed.length < 2 -> "Name must be at least 2 characters"
            trimmed.length > 100 -> "Name must be less than 100 characters"
            !trimmed.matches(Regex("^[a-zA-Z\\s.'-]+$")) ->
                "Name can only contain letters, spaces, hyphens, apostrophes, and dots"
            else -> null
        }
    }

    private fun validateEmail(email: String): String? {
        val trimmed = email.trim()
        return when {
            trimmed.isEmpty() -> "Email is required"
            !Patterns.EMAIL_ADDRESS.matcher(trimmed).matches() -> "Please enter a valid email address"
            trimmed.length > 254 -> "Email address is too long"
            else -> null
        }
    }

    private fun validateLoginPassword(password: String): String? {
        return when {
            password.isEmpty() -> "Password is required"
            else -> null
        }
    }

    private fun validateSignupPassword(password: String): String? {
        return when {
            password.isEmpty() -> "Password is required"
            password.length < 8 -> "Password must be at least 8 characters"
            password.length > 128 -> "Password must be less than 128 characters"
            !password.any { it.isUpperCase() } -> "Password must contain at least one uppercase letter"
            !password.any { it.isLowerCase() } -> "Password must contain at least one lowercase letter"
            !password.any { it.isDigit() } -> "Password must contain at least one number"
            !password.any { !it.isLetterOrDigit() } ->
                "Password must contain at least one special character"
            else -> null
        }
    }

    private fun validateConfirmPassword(password: String, confirmPassword: String): String? {
        return when {
            confirmPassword.isEmpty() -> "Please confirm your password"
            confirmPassword != password -> "Passwords do not match"
            else -> null
        }
    }
}
