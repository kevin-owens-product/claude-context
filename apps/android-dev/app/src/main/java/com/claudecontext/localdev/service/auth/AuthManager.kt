package com.claudecontext.localdev.service.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

// --- Data Models ---

data class AuthState(
    val isAuthenticated: Boolean = false,
    val user: UserProfile? = null,
    val token: AuthToken? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val biometricEnabled: Boolean = false
)

data class UserProfile(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String? = null,
    val plan: SubscriptionPlan = SubscriptionPlan.FREE,
    val createdAt: Long = 0,
    val lastLoginAt: Long = 0
)

data class AuthToken(
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: Long,
    val tokenType: String = "Bearer"
)

enum class SubscriptionPlan {
    FREE, MONTHLY, ANNUAL, ENTERPRISE
}

// --- API Request/Response Models ---

private data class LoginRequest(
    val email: String,
    val password: String
)

private data class SignupRequest(
    val email: String,
    val password: String,
    val name: String
)

private data class RefreshTokenRequest(
    @SerializedName("refresh_token") val refreshToken: String
)

private data class PasswordResetRequest(
    val email: String
)

private data class UpdateProfileRequest(
    val name: String?,
    @SerializedName("avatar_url") val avatarUrl: String?
)

private data class AuthApiResponse(
    val success: Boolean,
    val message: String? = null,
    val user: ApiUserProfile? = null,
    val token: ApiTokenResponse? = null
)

private data class ApiUserProfile(
    val id: String,
    val email: String,
    val name: String,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    val plan: String = "FREE",
    @SerializedName("created_at") val createdAt: Long = 0,
    @SerializedName("last_login_at") val lastLoginAt: Long = 0
)

private data class ApiTokenResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    @SerializedName("expires_at") val expiresAt: Long,
    @SerializedName("token_type") val tokenType: String = "Bearer"
)

// --- AuthManager ---

@Singleton
class AuthManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {
    companion object {
        private const val BASE_URL = "https://api.claudecontext.com/v1/auth"
        private const val ENCRYPTED_PREFS_FILE = "auth_secure_prefs"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_TOKEN_EXPIRES_AT = "token_expires_at"
        private const val KEY_TOKEN_TYPE = "token_type"
        private const val KEY_USER_JSON = "user_json"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
        private const val TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000L // 5 minutes before expiry
    }

    private val _authState = MutableStateFlow(AuthState())
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var tokenRefreshJob: Job? = null

    private val encryptedPrefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            ENCRYPTED_PREFS_FILE,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    init {
        restoreSession()
    }

    // --- Session Restoration ---

    private fun restoreSession() {
        val accessToken = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
        val refreshToken = encryptedPrefs.getString(KEY_REFRESH_TOKEN, null)
        val expiresAt = encryptedPrefs.getLong(KEY_TOKEN_EXPIRES_AT, 0L)
        val tokenType = encryptedPrefs.getString(KEY_TOKEN_TYPE, "Bearer") ?: "Bearer"
        val userJson = encryptedPrefs.getString(KEY_USER_JSON, null)
        val biometricEnabled = encryptedPrefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)

        if (accessToken != null && refreshToken != null && userJson != null) {
            val token = AuthToken(
                accessToken = accessToken,
                refreshToken = refreshToken,
                expiresAt = expiresAt,
                tokenType = tokenType
            )
            val user = try {
                gson.fromJson(userJson, UserProfile::class.java)
            } catch (e: Exception) {
                null
            }

            if (user != null) {
                val isExpired = System.currentTimeMillis() >= expiresAt
                _authState.value = AuthState(
                    isAuthenticated = !isExpired,
                    user = user,
                    token = token,
                    biometricEnabled = biometricEnabled
                )

                if (isExpired) {
                    scope.launch { refreshTokenSilently() }
                } else {
                    scheduleTokenRefresh(token)
                }
            }
        } else {
            _authState.value = AuthState(biometricEnabled = biometricEnabled)
        }
    }

    // --- Login ---

    suspend fun login(email: String, password: String): Result<UserProfile> =
        withContext(Dispatchers.IO) {
            _authState.value = _authState.value.copy(isLoading = true, error = null)

            try {
                val requestBody = gson.toJson(LoginRequest(email, password))
                val response = makeApiRequest("POST", "$BASE_URL/login", requestBody)

                if (response.success && response.user != null && response.token != null) {
                    val user = response.user.toDomain()
                    val token = response.token.toDomain()

                    persistSession(user, token)
                    scheduleTokenRefresh(token)

                    _authState.value = _authState.value.copy(
                        isAuthenticated = true,
                        user = user,
                        token = token,
                        isLoading = false,
                        error = null
                    )
                    Result.success(user)
                } else {
                    val errorMsg = response.message ?: "Login failed. Please check your credentials."
                    _authState.value = _authState.value.copy(
                        isLoading = false,
                        error = errorMsg
                    )
                    Result.failure(AuthException(errorMsg))
                }
            } catch (e: Exception) {
                val errorMsg = mapNetworkError(e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = errorMsg
                )
                Result.failure(AuthException(errorMsg, e))
            }
        }

    // --- Signup ---

    suspend fun signup(email: String, password: String, name: String): Result<UserProfile> =
        withContext(Dispatchers.IO) {
            _authState.value = _authState.value.copy(isLoading = true, error = null)

            try {
                val requestBody = gson.toJson(SignupRequest(email, password, name))
                val response = makeApiRequest("POST", "$BASE_URL/register", requestBody)

                if (response.success && response.user != null && response.token != null) {
                    val user = response.user.toDomain()
                    val token = response.token.toDomain()

                    persistSession(user, token)
                    scheduleTokenRefresh(token)

                    _authState.value = _authState.value.copy(
                        isAuthenticated = true,
                        user = user,
                        token = token,
                        isLoading = false,
                        error = null
                    )
                    Result.success(user)
                } else {
                    val errorMsg = response.message ?: "Signup failed. Please try again."
                    _authState.value = _authState.value.copy(
                        isLoading = false,
                        error = errorMsg
                    )
                    Result.failure(AuthException(errorMsg))
                }
            } catch (e: Exception) {
                val errorMsg = mapNetworkError(e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = errorMsg
                )
                Result.failure(AuthException(errorMsg, e))
            }
        }

    // --- Logout ---

    suspend fun logout() = withContext(Dispatchers.IO) {
        tokenRefreshJob?.cancel()
        tokenRefreshJob = null

        val currentToken = _authState.value.token
        if (currentToken != null) {
            try {
                makeApiRequest(
                    "POST",
                    "$BASE_URL/logout",
                    "{}",
                    currentToken.accessToken
                )
            } catch (_: Exception) {
                // Best effort server-side logout; proceed with local cleanup regardless
            }
        }

        clearPersistedSession()
        _authState.value = AuthState(
            biometricEnabled = _authState.value.biometricEnabled
        )
    }

    // --- Token Refresh ---

    suspend fun refreshToken(): Result<AuthToken> = withContext(Dispatchers.IO) {
        val currentToken = _authState.value.token
            ?: return@withContext Result.failure(AuthException("No token available"))

        try {
            val requestBody = gson.toJson(RefreshTokenRequest(currentToken.refreshToken))
            val response = makeApiRequest("POST", "$BASE_URL/refresh", requestBody)

            if (response.success && response.token != null) {
                val newToken = response.token.toDomain()
                val user = if (response.user != null) response.user.toDomain() else _authState.value.user

                if (user != null) {
                    persistSession(user, newToken)
                } else {
                    persistToken(newToken)
                }
                scheduleTokenRefresh(newToken)

                _authState.value = _authState.value.copy(
                    isAuthenticated = true,
                    token = newToken,
                    user = user ?: _authState.value.user,
                    error = null
                )
                Result.success(newToken)
            } else {
                val errorMsg = response.message ?: "Token refresh failed"
                handleTokenExpired()
                Result.failure(AuthException(errorMsg))
            }
        } catch (e: Exception) {
            handleTokenExpired()
            Result.failure(AuthException("Token refresh failed", e))
        }
    }

    private suspend fun refreshTokenSilently() {
        val result = refreshToken()
        if (result.isFailure) {
            _authState.value = _authState.value.copy(
                isAuthenticated = false,
                error = "Session expired. Please log in again."
            )
        }
    }

    private fun scheduleTokenRefresh(token: AuthToken) {
        tokenRefreshJob?.cancel()
        val delayMs = (token.expiresAt - System.currentTimeMillis()) - TOKEN_REFRESH_THRESHOLD_MS
        if (delayMs > 0) {
            tokenRefreshJob = scope.launch {
                delay(delayMs)
                refreshTokenSilently()
            }
        } else {
            scope.launch { refreshTokenSilently() }
        }
    }

    private fun handleTokenExpired() {
        tokenRefreshJob?.cancel()
        tokenRefreshJob = null
        _authState.value = _authState.value.copy(
            isAuthenticated = false,
            token = null,
            error = "Session expired. Please log in again."
        )
        clearPersistedSession()
    }

    // --- Password Reset ---

    suspend fun requestPasswordReset(email: String): Result<String> =
        withContext(Dispatchers.IO) {
            _authState.value = _authState.value.copy(isLoading = true, error = null)

            try {
                val requestBody = gson.toJson(PasswordResetRequest(email))
                val response = makeApiRequest("POST", "$BASE_URL/password-reset", requestBody)

                _authState.value = _authState.value.copy(isLoading = false)

                if (response.success) {
                    val msg = response.message
                        ?: "Password reset link sent to $email. Please check your inbox."
                    Result.success(msg)
                } else {
                    val errorMsg = response.message ?: "Failed to send password reset email."
                    _authState.value = _authState.value.copy(error = errorMsg)
                    Result.failure(AuthException(errorMsg))
                }
            } catch (e: Exception) {
                val errorMsg = mapNetworkError(e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = errorMsg
                )
                Result.failure(AuthException(errorMsg, e))
            }
        }

    // --- Profile Management ---

    suspend fun getUserProfile(): Result<UserProfile> = withContext(Dispatchers.IO) {
        val accessToken = _authState.value.token?.accessToken
            ?: return@withContext Result.failure(AuthException("Not authenticated"))

        try {
            val response = makeApiRequest("GET", "$BASE_URL/profile", null, accessToken)

            if (response.success && response.user != null) {
                val user = response.user.toDomain()
                persistUser(user)

                _authState.value = _authState.value.copy(user = user)
                Result.success(user)
            } else {
                val errorMsg = response.message ?: "Failed to fetch profile."
                Result.failure(AuthException(errorMsg))
            }
        } catch (e: Exception) {
            val errorMsg = mapNetworkError(e)
            Result.failure(AuthException(errorMsg, e))
        }
    }

    suspend fun updateUserProfile(name: String?, avatarUrl: String?): Result<UserProfile> =
        withContext(Dispatchers.IO) {
            val accessToken = _authState.value.token?.accessToken
                ?: return@withContext Result.failure(AuthException("Not authenticated"))

            _authState.value = _authState.value.copy(isLoading = true, error = null)

            try {
                val requestBody = gson.toJson(UpdateProfileRequest(name, avatarUrl))
                val response = makeApiRequest("PUT", "$BASE_URL/profile", requestBody, accessToken)

                if (response.success && response.user != null) {
                    val user = response.user.toDomain()
                    persistUser(user)

                    _authState.value = _authState.value.copy(
                        user = user,
                        isLoading = false,
                        error = null
                    )
                    Result.success(user)
                } else {
                    val errorMsg = response.message ?: "Failed to update profile."
                    _authState.value = _authState.value.copy(
                        isLoading = false,
                        error = errorMsg
                    )
                    Result.failure(AuthException(errorMsg))
                }
            } catch (e: Exception) {
                val errorMsg = mapNetworkError(e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = errorMsg
                )
                Result.failure(AuthException(errorMsg, e))
            }
        }

    // --- Biometric Authentication ---

    fun isBiometricAvailable(): Boolean {
        val biometricManager = BiometricManager.from(context)
        return biometricManager.canAuthenticate(BIOMETRIC_STRONG) ==
            BiometricManager.BIOMETRIC_SUCCESS
    }

    fun setBiometricEnabled(enabled: Boolean) {
        encryptedPrefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
        _authState.value = _authState.value.copy(biometricEnabled = enabled)
    }

    fun authenticateWithBiometric(
        activity: FragmentActivity,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        if (!isBiometricAvailable()) {
            onError("Biometric authentication is not available on this device.")
            return
        }

        if (!_authState.value.biometricEnabled) {
            onError("Biometric authentication is not enabled. Please enable it in settings.")
            return
        }

        val storedToken = encryptedPrefs.getString(KEY_ACCESS_TOKEN, null)
        if (storedToken == null) {
            onError("No saved session found. Please log in with email and password first.")
            return
        }

        val executor = ContextCompat.getMainExecutor(context)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                // Restore session from encrypted storage
                restoreSession()
                if (_authState.value.isAuthenticated) {
                    onSuccess()
                } else {
                    // Token may have expired; try to refresh
                    scope.launch {
                        val refreshResult = refreshToken()
                        withContext(Dispatchers.Main) {
                            if (refreshResult.isSuccess) {
                                onSuccess()
                            } else {
                                onError("Session expired. Please log in with email and password.")
                            }
                        }
                    }
                }
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                val message = when (errorCode) {
                    BiometricPrompt.ERROR_USER_CANCELED,
                    BiometricPrompt.ERROR_NEGATIVE_BUTTON -> "Authentication cancelled."
                    BiometricPrompt.ERROR_LOCKOUT -> "Too many attempts. Try again later."
                    BiometricPrompt.ERROR_LOCKOUT_PERMANENT ->
                        "Biometric permanently locked. Use device credentials."
                    BiometricPrompt.ERROR_NO_BIOMETRICS ->
                        "No biometric credentials enrolled on this device."
                    BiometricPrompt.ERROR_HW_NOT_PRESENT ->
                        "No biometric hardware available."
                    else -> errString.toString()
                }
                onError(message)
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                // Called on a single failed attempt; the system will show its own message.
                // onAuthenticationError will be called if max attempts are exceeded.
            }
        }

        val biometricPrompt = BiometricPrompt(activity, executor, callback)

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Biometric Login")
            .setSubtitle("Authenticate to access Claude Context")
            .setDescription("Use your fingerprint or face to log in securely.")
            .setNegativeButtonText("Cancel")
            .setAllowedAuthenticators(BIOMETRIC_STRONG)
            .build()

        biometricPrompt.authenticate(promptInfo)
    }

    // --- Utility: Get Access Token for API Calls ---

    fun getAccessToken(): String? {
        val token = _authState.value.token ?: return null
        if (System.currentTimeMillis() >= token.expiresAt) {
            return null
        }
        return token.accessToken
    }

    fun isLoggedIn(): Boolean = _authState.value.isAuthenticated

    fun clearError() {
        _authState.value = _authState.value.copy(error = null)
    }

    // --- Persistence ---

    private fun persistSession(user: UserProfile, token: AuthToken) {
        encryptedPrefs.edit()
            .putString(KEY_ACCESS_TOKEN, token.accessToken)
            .putString(KEY_REFRESH_TOKEN, token.refreshToken)
            .putLong(KEY_TOKEN_EXPIRES_AT, token.expiresAt)
            .putString(KEY_TOKEN_TYPE, token.tokenType)
            .putString(KEY_USER_JSON, gson.toJson(user))
            .apply()
    }

    private fun persistToken(token: AuthToken) {
        encryptedPrefs.edit()
            .putString(KEY_ACCESS_TOKEN, token.accessToken)
            .putString(KEY_REFRESH_TOKEN, token.refreshToken)
            .putLong(KEY_TOKEN_EXPIRES_AT, token.expiresAt)
            .putString(KEY_TOKEN_TYPE, token.tokenType)
            .apply()
    }

    private fun persistUser(user: UserProfile) {
        encryptedPrefs.edit()
            .putString(KEY_USER_JSON, gson.toJson(user))
            .apply()
    }

    private fun clearPersistedSession() {
        encryptedPrefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_TOKEN_EXPIRES_AT)
            .remove(KEY_TOKEN_TYPE)
            .remove(KEY_USER_JSON)
            .apply()
    }

    // --- Network Layer ---

    private fun makeApiRequest(
        method: String,
        urlString: String,
        body: String?,
        bearerToken: String? = null
    ): AuthApiResponse {
        val url = URL(urlString)
        val connection = url.openConnection() as HttpURLConnection

        try {
            connection.requestMethod = method
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            connection.setRequestProperty("Accept", "application/json")
            connection.connectTimeout = 30_000
            connection.readTimeout = 30_000

            if (bearerToken != null) {
                connection.setRequestProperty("Authorization", "Bearer $bearerToken")
            }

            if (body != null && method != "GET") {
                connection.doOutput = true
                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(body)
                    writer.flush()
                }
            }

            val responseCode = connection.responseCode
            val inputStream = if (responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }

            val responseBody = BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8))
                .use { reader -> reader.readText() }

            if (responseCode in 200..299) {
                return try {
                    gson.fromJson(responseBody, AuthApiResponse::class.java)
                } catch (e: Exception) {
                    AuthApiResponse(success = false, message = "Invalid server response")
                }
            }

            // Parse error response
            val errorResponse = try {
                gson.fromJson(responseBody, AuthApiResponse::class.java)
            } catch (e: Exception) {
                null
            }

            val errorMessage = when (responseCode) {
                401 -> errorResponse?.message ?: "Invalid credentials"
                403 -> errorResponse?.message ?: "Access denied"
                404 -> errorResponse?.message ?: "Service not found"
                409 -> errorResponse?.message ?: "Account already exists"
                422 -> errorResponse?.message ?: "Invalid request data"
                429 -> errorResponse?.message ?: "Too many requests. Please try again later."
                in 500..599 -> errorResponse?.message ?: "Server error. Please try again later."
                else -> errorResponse?.message ?: "Request failed (HTTP $responseCode)"
            }

            return AuthApiResponse(success = false, message = errorMessage)
        } finally {
            connection.disconnect()
        }
    }

    private fun mapNetworkError(e: Exception): String {
        return when (e) {
            is java.net.UnknownHostException ->
                "No internet connection. Please check your network settings."
            is java.net.SocketTimeoutException ->
                "Connection timed out. Please try again."
            is java.net.ConnectException ->
                "Unable to connect to server. Please try again later."
            is javax.net.ssl.SSLException ->
                "Secure connection failed. Please check your network."
            is AuthException -> e.message ?: "Authentication error"
            else -> "An unexpected error occurred: ${e.localizedMessage ?: "Unknown error"}"
        }
    }

    // --- Domain Mapping ---

    private fun ApiUserProfile.toDomain(): UserProfile = UserProfile(
        id = id,
        email = email,
        name = name,
        avatarUrl = avatarUrl,
        plan = try {
            SubscriptionPlan.valueOf(plan.uppercase())
        } catch (_: IllegalArgumentException) {
            SubscriptionPlan.FREE
        },
        createdAt = createdAt,
        lastLoginAt = lastLoginAt
    )

    private fun ApiTokenResponse.toDomain(): AuthToken = AuthToken(
        accessToken = accessToken,
        refreshToken = refreshToken,
        expiresAt = expiresAt,
        tokenType = tokenType
    )
}

class AuthException(message: String, cause: Throwable? = null) : Exception(message, cause)
