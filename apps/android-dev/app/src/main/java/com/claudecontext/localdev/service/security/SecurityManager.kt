package com.claudecontext.localdev.service.security

import android.content.Context
import android.content.pm.ApplicationInfo
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URI
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

data class SecurityState(
    val encryptionReady: Boolean = false,
    val auditLogCount: Int = 0,
    val rateLimitStatus: Map<String, RateLimitInfo> = emptyMap(),
    val securityAlerts: List<SecurityAlert> = emptyList(),
    val isRooted: Boolean = false,
    val isDebugged: Boolean = false
)

data class RateLimitInfo(
    val endpoint: String,
    val limit: Int,
    val remaining: Int,
    val resetAt: Long,
    val windowMs: Long = 60_000
)

data class AuditLog(
    val id: String = UUID.randomUUID().toString(),
    val timestamp: Long = System.currentTimeMillis(),
    val userId: String? = null,
    val action: AuditAction,
    val target: String,
    val details: String = "",
    val ipAddress: String? = null,
    val hash: String = ""
)

enum class AuditAction {
    API_CALL,
    FILE_READ,
    FILE_WRITE,
    FILE_DELETE,
    AUTH_LOGIN,
    AUTH_LOGOUT,
    AUTH_FAILED,
    ADMIN_ACTION,
    SHELL_COMMAND,
    SETTINGS_CHANGE,
    EXPORT,
    IMPORT
}

data class SecurityAlert(
    val id: String,
    val level: AlertLevel,
    val message: String,
    val timestamp: Long
)

enum class AlertLevel { INFO, WARNING, CRITICAL }

data class SanitizationResult(
    val sanitized: String,
    val wasModified: Boolean,
    val warnings: List<String> = emptyList()
)

// ---------------------------------------------------------------------------
// Rate-limit configuration per subscription plan
// ---------------------------------------------------------------------------

data class RateLimitConfig(
    val endpoint: String,
    val maxRequests: Int,
    val windowMs: Long = 60_000,
    val cooldownMs: Long = 10_000
)

// ---------------------------------------------------------------------------
// Security Manager
// ---------------------------------------------------------------------------

@Singleton
class SecurityManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {

    // -- Observable state ---------------------------------------------------

    private val _state = MutableStateFlow(SecurityState())
    val state: StateFlow<SecurityState> = _state.asStateFlow()

    // -- Android Keystore ---------------------------------------------------

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    private val secureRandom = SecureRandom()

    // -- Encrypted shared preferences for API key storage -------------------

    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val encryptedPrefs by lazy {
        EncryptedSharedPreferences.create(
            context,
            ENCRYPTED_PREFS_FILE,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    // -- Rate limiting state ------------------------------------------------

    private val rateLimitWindows = ConcurrentHashMap<String, MutableList<Long>>()
    private val rateLimitCooldowns = ConcurrentHashMap<String, Long>()
    private val rateLimitMutex = Mutex()

    // -- Audit log state ----------------------------------------------------

    private val auditLogs = mutableListOf<AuditLog>()
    private val auditMutex = Mutex()
    private var auditDir: File? = null

    // -- Default rate limit configs per plan ---------------------------------

    private var activeRateLimitConfigs: List<RateLimitConfig> = DEFAULT_FREE_LIMITS

    // =======================================================================
    //  Initialization
    // =======================================================================

    fun initialize() {
        ensureKeystoreKeyExists()
        auditDir = File(context.filesDir, "audit_logs").apply { mkdirs() }
        loadAuditLogs()

        val rooted = detectRoot()
        val debugged = detectDebugger()

        val alerts = mutableListOf<SecurityAlert>()
        if (rooted) {
            alerts.add(
                SecurityAlert(
                    id = UUID.randomUUID().toString(),
                    level = AlertLevel.CRITICAL,
                    message = "Device appears to be rooted. Security may be compromised.",
                    timestamp = System.currentTimeMillis()
                )
            )
        }
        if (debugged) {
            alerts.add(
                SecurityAlert(
                    id = UUID.randomUUID().toString(),
                    level = AlertLevel.WARNING,
                    message = "Debugger detected. This is not allowed in production builds.",
                    timestamp = System.currentTimeMillis()
                )
            )
        }

        _state.value = _state.value.copy(
            encryptionReady = true,
            auditLogCount = auditLogs.size,
            isRooted = rooted,
            isDebugged = debugged,
            securityAlerts = alerts
        )
    }

    // =======================================================================
    //  Encryption  (AES-256-GCM)
    // =======================================================================

    /**
     * Encrypts arbitrary data using the Keystore-backed AES-256-GCM key.
     * Returns a Base64-encoded string of  IV || ciphertext || auth-tag .
     */
    fun encrypt(plaintext: String): String {
        val key = getOrCreateKeystoreKey()
        val cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        val combined = ByteArray(iv.size + ciphertext.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(ciphertext, 0, combined, iv.size, ciphertext.size)
        return Base64.encodeToString(combined, Base64.NO_WRAP)
    }

    /**
     * Decrypts a Base64-encoded blob previously produced by [encrypt].
     */
    fun decrypt(encoded: String): String {
        val combined = Base64.decode(encoded, Base64.NO_WRAP)
        val iv = combined.copyOfRange(0, GCM_IV_LENGTH)
        val ciphertext = combined.copyOfRange(GCM_IV_LENGTH, combined.size)

        val key = getOrCreateKeystoreKey()
        val cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        val plainBytes = cipher.doFinal(ciphertext)
        return String(plainBytes, Charsets.UTF_8)
    }

    /**
     * Encrypts an API key and stores it in EncryptedSharedPreferences.
     */
    fun encryptAndStoreApiKey(keyName: String, apiKey: String) {
        val encrypted = encrypt(apiKey)
        encryptedPrefs.edit().putString(keyName, encrypted).apply()
    }

    /**
     * Retrieves and decrypts an API key from EncryptedSharedPreferences.
     */
    fun decryptApiKey(keyName: String): String? {
        val encrypted = encryptedPrefs.getString(keyName, null) ?: return null
        return try {
            decrypt(encrypted)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Removes a stored API key.
     */
    fun removeApiKey(keyName: String) {
        encryptedPrefs.edit().remove(keyName).apply()
    }

    /**
     * Derives a 256-bit AES key from [password] and [salt] using PBKDF2-HMAC-SHA256.
     */
    fun deriveKeyFromPassword(password: String, salt: ByteArray): SecretKey {
        val spec = PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH)
        val factory = SecretKeyFactory.getInstance(PBKDF2_ALGORITHM)
        val secret = factory.generateSecret(spec)
        return SecretKeySpec(secret.encoded, KeyProperties.KEY_ALGORITHM_AES)
    }

    /**
     * Generates a cryptographically random salt for PBKDF2.
     */
    fun generateSalt(): ByteArray {
        val salt = ByteArray(PBKDF2_SALT_LENGTH)
        secureRandom.nextBytes(salt)
        return salt
    }

    /**
     * Encrypts [plaintext] using a password-derived key (AES-256-GCM).
     * Returns Base64( salt || iv || ciphertext ).
     */
    fun encryptWithPassword(plaintext: String, password: String): String {
        val salt = generateSalt()
        val key = deriveKeyFromPassword(password, salt)
        val cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        val combined = ByteArray(salt.size + iv.size + ciphertext.size)
        System.arraycopy(salt, 0, combined, 0, salt.size)
        System.arraycopy(iv, 0, combined, salt.size, iv.size)
        System.arraycopy(ciphertext, 0, combined, salt.size + iv.size, ciphertext.size)
        return Base64.encodeToString(combined, Base64.NO_WRAP)
    }

    /**
     * Decrypts a blob produced by [encryptWithPassword].
     */
    fun decryptWithPassword(encoded: String, password: String): String {
        val combined = Base64.decode(encoded, Base64.NO_WRAP)
        val salt = combined.copyOfRange(0, PBKDF2_SALT_LENGTH)
        val iv = combined.copyOfRange(PBKDF2_SALT_LENGTH, PBKDF2_SALT_LENGTH + GCM_IV_LENGTH)
        val ciphertext = combined.copyOfRange(PBKDF2_SALT_LENGTH + GCM_IV_LENGTH, combined.size)

        val key = deriveKeyFromPassword(password, salt)
        val cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        return String(cipher.doFinal(ciphertext), Charsets.UTF_8)
    }

    // =======================================================================
    //  Input Sanitization
    // =======================================================================

    /**
     * Sanitizes generic user input destined for the AI layer.
     * Strips known prompt-injection patterns and enforces max length.
     */
    fun sanitizeInput(input: String, maxLength: Int = MAX_INPUT_LENGTH): SanitizationResult {
        val warnings = mutableListOf<String>()
        var text = input

        // Enforce max length
        if (text.length > maxLength) {
            text = text.take(maxLength)
            warnings.add("Input truncated to $maxLength characters")
        }

        // Strip null bytes
        if (text.contains('\u0000')) {
            text = text.replace("\u0000", "")
            warnings.add("Null bytes removed")
        }

        // Strip common prompt-injection delimiters
        val injectionPatterns = listOf(
            Regex("""<\|im_start\|>.*?<\|im_end\|>""", RegexOption.DOT_MATCHES_ALL),
            Regex("""<\|system\|>.*?<\|end\|>""", RegexOption.DOT_MATCHES_ALL),
            Regex("""###\s*(SYSTEM|INSTRUCTION|OVERRIDE)\s*###""", RegexOption.IGNORE_CASE),
            Regex("""\[INST\].*?\[/INST\]""", RegexOption.DOT_MATCHES_ALL),
            Regex("""<<SYS>>.*?<</SYS>>""", RegexOption.DOT_MATCHES_ALL)
        )

        for (pattern in injectionPatterns) {
            if (pattern.containsMatchIn(text)) {
                text = pattern.replace(text, "")
                warnings.add("Potential prompt-injection pattern removed")
            }
        }

        // Strip control characters (keep \n, \r, \t)
        val controlCharRegex = Regex("""[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]""")
        if (controlCharRegex.containsMatchIn(text)) {
            text = controlCharRegex.replace(text, "")
            warnings.add("Control characters removed")
        }

        return SanitizationResult(
            sanitized = text.trim(),
            wasModified = text.trim() != input,
            warnings = warnings
        )
    }

    /**
     * Validates and sanitizes a file path, preventing path-traversal attacks.
     */
    fun validateFilePath(path: String, allowedBaseDir: String): SanitizationResult {
        val warnings = mutableListOf<String>()
        var sanitized = path

        // Reject null bytes
        if (sanitized.contains('\u0000')) {
            return SanitizationResult(
                sanitized = "",
                wasModified = true,
                warnings = listOf("Path contains null bytes -- rejected")
            )
        }

        // Normalize separators
        sanitized = sanitized.replace('\\', '/')

        // Collapse multiple slashes
        sanitized = sanitized.replace(Regex("/+"), "/")

        // Check for traversal sequences
        val traversalPatterns = listOf("..", "~", "./", "%2e%2e", "%2f", "%252e")
        for (pattern in traversalPatterns) {
            if (sanitized.lowercase().contains(pattern.lowercase())) {
                sanitized = sanitized.replace(pattern, "", ignoreCase = true)
                warnings.add("Path traversal pattern '$pattern' removed")
            }
        }

        // Resolve and check that the canonical path stays under the allowed base
        try {
            val resolvedBase = File(allowedBaseDir).canonicalPath
            val resolvedPath = File(allowedBaseDir, sanitized).canonicalPath
            if (!resolvedPath.startsWith(resolvedBase)) {
                return SanitizationResult(
                    sanitized = "",
                    wasModified = true,
                    warnings = listOf("Path escapes allowed directory -- rejected")
                )
            }
            sanitized = resolvedPath
        } catch (e: Exception) {
            return SanitizationResult(
                sanitized = "",
                wasModified = true,
                warnings = listOf("Path resolution failed: ${e.message}")
            )
        }

        return SanitizationResult(
            sanitized = sanitized,
            wasModified = sanitized != path,
            warnings = warnings
        )
    }

    /**
     * Sanitizes a shell command, blocking dangerous commands.
     */
    fun sanitizeShellCommand(command: String): SanitizationResult {
        val warnings = mutableListOf<String>()
        val trimmed = command.trim()

        if (trimmed.isEmpty()) {
            return SanitizationResult(sanitized = "", wasModified = false)
        }

        // Blocked command patterns (dangerous operations)
        val blockedPatterns = listOf(
            Regex("""rm\s+-[^\s]*r[^\s]*f""", RegexOption.IGNORE_CASE),         // rm -rf
            Regex("""rm\s+-[^\s]*f[^\s]*r""", RegexOption.IGNORE_CASE),         // rm -fr
            Regex("""rm\s+(-rf|-fr)\s+/\s*$"""),                                // rm -rf /
            Regex("""mkfs\.""", RegexOption.IGNORE_CASE),                        // mkfs.*
            Regex("""dd\s+if=.*of=/dev/""", RegexOption.IGNORE_CASE),           // dd to device
            Regex(""":>\s*/"""),                                                 // truncate root files
            Regex(""">\s*/dev/[sh]d[a-z]"""),                                    // overwrite block devices
            Regex("""chmod\s+-R\s+777\s+/"""),                                   // chmod 777 /
            Regex("""chown\s+-R\s+.*\s+/\s*$"""),                                // chown -R ... /
            Regex("""fork\s*bomb|:\(\)\{""", RegexOption.IGNORE_CASE),           // fork bomb
            Regex("""\|\s*mail\s""", RegexOption.IGNORE_CASE),                   // piping to mail
            Regex("""curl\s+.*\|\s*(ba)?sh""", RegexOption.IGNORE_CASE),         // curl | sh
            Regex("""wget\s+.*\|\s*(ba)?sh""", RegexOption.IGNORE_CASE),         // wget | sh
            Regex("""python[23]?\s+-c\s+.*import\s+os""", RegexOption.IGNORE_CASE),
            Regex("""shutdown|reboot|halt|poweroff""", RegexOption.IGNORE_CASE),
            Regex("""iptables\s+-F""", RegexOption.IGNORE_CASE),                 // flush iptables
            Regex(""">\s*/etc/passwd"""),                                         // overwrite passwd
            Regex(""">\s*/etc/shadow""")                                          // overwrite shadow
        )

        for (pattern in blockedPatterns) {
            if (pattern.containsMatchIn(trimmed)) {
                return SanitizationResult(
                    sanitized = "",
                    wasModified = true,
                    warnings = listOf("Blocked dangerous command: matched pattern '${pattern.pattern}'")
                )
            }
        }

        // Warn on potentially risky but allowed commands
        val riskyPatterns = listOf(
            "sudo" to "Command uses sudo elevation",
            "su " to "Command uses su elevation",
            "> /dev/" to "Command writes to device file",
            "eval " to "Command uses eval",
            "exec " to "Command uses exec"
        )
        for ((pattern, warning) in riskyPatterns) {
            if (trimmed.contains(pattern, ignoreCase = true)) {
                warnings.add(warning)
            }
        }

        // Enforce max command length
        if (trimmed.length > MAX_COMMAND_LENGTH) {
            return SanitizationResult(
                sanitized = trimmed.take(MAX_COMMAND_LENGTH),
                wasModified = true,
                warnings = warnings + "Command truncated to $MAX_COMMAND_LENGTH characters"
            )
        }

        return SanitizationResult(
            sanitized = trimmed,
            wasModified = false,
            warnings = warnings
        )
    }

    /**
     * Validates a URL string.
     */
    fun validateUrl(url: String): SanitizationResult {
        val warnings = mutableListOf<String>()
        val trimmed = url.trim()

        if (trimmed.isEmpty()) {
            return SanitizationResult(sanitized = "", wasModified = true, warnings = listOf("Empty URL"))
        }

        // Reject javascript: and data: URIs
        val scheme = trimmed.lowercase()
        if (scheme.startsWith("javascript:") || scheme.startsWith("data:") || scheme.startsWith("vbscript:")) {
            return SanitizationResult(
                sanitized = "",
                wasModified = true,
                warnings = listOf("Blocked dangerous URL scheme")
            )
        }

        // Basic URI parse check
        try {
            val uri = URI(trimmed)
            val parsedScheme = uri.scheme?.lowercase()
            if (parsedScheme != null && parsedScheme !in ALLOWED_URL_SCHEMES) {
                return SanitizationResult(
                    sanitized = "",
                    wasModified = true,
                    warnings = listOf("Disallowed URL scheme: $parsedScheme")
                )
            }
            if (uri.host.isNullOrBlank() && parsedScheme in listOf("http", "https")) {
                return SanitizationResult(
                    sanitized = "",
                    wasModified = true,
                    warnings = listOf("URL is missing host")
                )
            }
        } catch (e: Exception) {
            return SanitizationResult(
                sanitized = "",
                wasModified = true,
                warnings = listOf("Malformed URL: ${e.message}")
            )
        }

        // Check for encoded traversal
        if (trimmed.contains("%2e%2e", ignoreCase = true) || trimmed.contains("%252e", ignoreCase = true)) {
            warnings.add("URL contains encoded path-traversal sequences")
        }

        // Max URL length
        if (trimmed.length > MAX_URL_LENGTH) {
            return SanitizationResult(
                sanitized = trimmed.take(MAX_URL_LENGTH),
                wasModified = true,
                warnings = warnings + "URL truncated to $MAX_URL_LENGTH characters"
            )
        }

        return SanitizationResult(sanitized = trimmed, wasModified = false, warnings = warnings)
    }

    /**
     * Sanitizes a search query to prevent SQL / NoSQL injection.
     */
    fun sanitizeSearchQuery(query: String): SanitizationResult {
        val warnings = mutableListOf<String>()
        var sanitized = query.trim()

        if (sanitized.length > MAX_SEARCH_QUERY_LENGTH) {
            sanitized = sanitized.take(MAX_SEARCH_QUERY_LENGTH)
            warnings.add("Query truncated to $MAX_SEARCH_QUERY_LENGTH characters")
        }

        // SQL injection patterns
        val sqlPatterns = listOf(
            Regex("""(['";])\s*(OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\s""", RegexOption.IGNORE_CASE),
            Regex("""--\s*$"""),
            Regex("""/\*.*\*/""", RegexOption.DOT_MATCHES_ALL),
            Regex(""";\s*(DROP|DELETE|UPDATE|INSERT|ALTER)\s""", RegexOption.IGNORE_CASE),
            Regex("""'\s*OR\s+'[^']*'\s*=\s*'""", RegexOption.IGNORE_CASE),
            Regex("""1\s*=\s*1"""),
            Regex("""SLEEP\s*\(""", RegexOption.IGNORE_CASE),
            Regex("""BENCHMARK\s*\(""", RegexOption.IGNORE_CASE),
            Regex("""LOAD_FILE\s*\(""", RegexOption.IGNORE_CASE),
            Regex("""INTO\s+(OUT|DUMP)FILE""", RegexOption.IGNORE_CASE)
        )

        for (pattern in sqlPatterns) {
            if (pattern.containsMatchIn(sanitized)) {
                sanitized = pattern.replace(sanitized, "")
                warnings.add("SQL injection pattern removed")
            }
        }

        // NoSQL injection patterns (MongoDB-style operators)
        val nosqlPatterns = listOf(
            Regex("""\$\s*(gt|gte|lt|lte|ne|in|nin|regex|where|exists|type|mod|all|size|elemMatch|or|and|not|nor)\b""", RegexOption.IGNORE_CASE),
            Regex("""\{\s*['"]\$""")
        )

        for (pattern in nosqlPatterns) {
            if (pattern.containsMatchIn(sanitized)) {
                sanitized = pattern.replace(sanitized, "")
                warnings.add("NoSQL injection pattern removed")
            }
        }

        // Escape special characters for safe querying
        val specialChars = listOf("'", "\"", ";", "\\", "\u0000")
        for (char in specialChars) {
            if (sanitized.contains(char)) {
                sanitized = sanitized.replace(char, "")
                warnings.add("Special character removed: ${if (char == "\u0000") "null byte" else char}")
            }
        }

        return SanitizationResult(
            sanitized = sanitized,
            wasModified = sanitized != query.trim(),
            warnings = warnings
        )
    }

    /**
     * Strips XSS vectors from HTML content.
     */
    fun sanitizeHtml(html: String): SanitizationResult {
        val warnings = mutableListOf<String>()
        var sanitized = html

        if (sanitized.length > MAX_INPUT_LENGTH) {
            sanitized = sanitized.take(MAX_INPUT_LENGTH)
            warnings.add("HTML content truncated")
        }

        // Remove script tags and content
        val scriptRegex = Regex("""<\s*script[^>]*>.*?<\s*/\s*script\s*>""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        if (scriptRegex.containsMatchIn(sanitized)) {
            sanitized = scriptRegex.replace(sanitized, "")
            warnings.add("Script tags removed")
        }

        // Remove event handler attributes
        val eventHandlerRegex = Regex("""\s+on\w+\s*=\s*(['"]).*?\1""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        if (eventHandlerRegex.containsMatchIn(sanitized)) {
            sanitized = eventHandlerRegex.replace(sanitized, "")
            warnings.add("Event handler attributes removed")
        }

        // Remove javascript: URLs in attributes
        val jsUrlRegex = Regex("""(href|src|action)\s*=\s*(['"])\s*javascript:.*?\2""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        if (jsUrlRegex.containsMatchIn(sanitized)) {
            sanitized = jsUrlRegex.replace(sanitized, "")
            warnings.add("JavaScript URLs in attributes removed")
        }

        // Remove data: URLs in src attributes
        val dataUrlRegex = Regex("""src\s*=\s*(['"])\s*data:.*?\1""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        if (dataUrlRegex.containsMatchIn(sanitized)) {
            sanitized = dataUrlRegex.replace(sanitized, "")
            warnings.add("Data URLs in src removed")
        }

        // Remove iframe, object, embed, applet tags
        val dangerousTags = listOf("iframe", "object", "embed", "applet", "form", "base", "meta")
        for (tag in dangerousTags) {
            val tagRegex = Regex("""<\s*/?$tag[^>]*>""", RegexOption.IGNORE_CASE)
            if (tagRegex.containsMatchIn(sanitized)) {
                sanitized = tagRegex.replace(sanitized, "")
                warnings.add("Dangerous <$tag> tag removed")
            }
        }

        // Remove style attributes with expressions/url
        val styleExprRegex = Regex("""style\s*=\s*(['"]).*?(expression|url)\s*\(.*?\1""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        if (styleExprRegex.containsMatchIn(sanitized)) {
            sanitized = styleExprRegex.replace(sanitized, "")
            warnings.add("Dangerous style expressions removed")
        }

        // Encode remaining angle brackets that are not part of allowed tags
        // (simple approach: encode < and > not in known-safe tags)
        sanitized = sanitized
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")

        return SanitizationResult(
            sanitized = sanitized,
            wasModified = sanitized != html,
            warnings = warnings
        )
    }

    // =======================================================================
    //  Audit Logging
    // =======================================================================

    /**
     * Records an audit log entry with a tamper-proof hash chain.
     */
    suspend fun logAudit(
        action: AuditAction,
        target: String,
        details: String = "",
        userId: String? = null,
        ipAddress: String? = null
    ): AuditLog = auditMutex.withLock {
        val previousHash = auditLogs.lastOrNull()?.hash ?: GENESIS_HASH
        val entry = AuditLog(
            action = action,
            target = target,
            details = details,
            userId = userId,
            ipAddress = ipAddress
        )
        val hash = computeLogHash(entry, previousHash)
        val hashedEntry = entry.copy(hash = hash)

        auditLogs.add(hashedEntry)
        persistAuditLog(hashedEntry)

        _state.value = _state.value.copy(auditLogCount = auditLogs.size)
        hashedEntry
    }

    /**
     * Convenience: log an API call.
     */
    suspend fun logApiCall(
        endpoint: String,
        responseCode: Int,
        userId: String? = null
    ) {
        logAudit(
            action = AuditAction.API_CALL,
            target = endpoint,
            details = "response_code=$responseCode",
            userId = userId
        )
    }

    /**
     * Convenience: log a file operation.
     */
    suspend fun logFileOperation(
        action: AuditAction,
        filePath: String,
        userId: String? = null
    ) {
        require(action in listOf(AuditAction.FILE_READ, AuditAction.FILE_WRITE, AuditAction.FILE_DELETE)) {
            "Action must be FILE_READ, FILE_WRITE, or FILE_DELETE"
        }
        logAudit(action = action, target = filePath, userId = userId)
    }

    /**
     * Convenience: log an auth event.
     */
    suspend fun logAuthEvent(
        action: AuditAction,
        userId: String?,
        details: String = ""
    ) {
        require(action in listOf(AuditAction.AUTH_LOGIN, AuditAction.AUTH_LOGOUT, AuditAction.AUTH_FAILED)) {
            "Action must be AUTH_LOGIN, AUTH_LOGOUT, or AUTH_FAILED"
        }
        logAudit(action = action, target = "auth", details = details, userId = userId)
    }

    /**
     * Convenience: log an admin action.
     */
    suspend fun logAdminAction(target: String, details: String, userId: String?) {
        logAudit(action = AuditAction.ADMIN_ACTION, target = target, details = details, userId = userId)
    }

    /**
     * Convenience: log a shell command execution.
     */
    suspend fun logShellCommand(command: String, userId: String? = null) {
        logAudit(action = AuditAction.SHELL_COMMAND, target = "shell", details = command, userId = userId)
    }

    /**
     * Retrieves audit logs, optionally filtered by action and/or time range.
     */
    suspend fun getAuditLogs(
        action: AuditAction? = null,
        fromTimestamp: Long? = null,
        toTimestamp: Long? = null,
        userId: String? = null,
        limit: Int = 100
    ): List<AuditLog> = auditMutex.withLock {
        auditLogs.asSequence()
            .filter { log -> action == null || log.action == action }
            .filter { log -> fromTimestamp == null || log.timestamp >= fromTimestamp }
            .filter { log -> toTimestamp == null || log.timestamp <= toTimestamp }
            .filter { log -> userId == null || log.userId == userId }
            .sortedByDescending { it.timestamp }
            .take(limit)
            .toList()
    }

    /**
     * Verifies the integrity of the audit log hash chain.
     * Returns true if no tampering detected.
     */
    suspend fun verifyAuditLogIntegrity(): Boolean = auditMutex.withLock {
        if (auditLogs.isEmpty()) return@withLock true

        var previousHash = GENESIS_HASH
        for (log in auditLogs) {
            val expectedHash = computeLogHash(log.copy(hash = ""), previousHash)
            if (log.hash != expectedHash) return@withLock false
            previousHash = log.hash
        }
        true
    }

    /**
     * Rotates audit logs, keeping only entries from the last [retentionDays] days.
     */
    suspend fun rotateAuditLogs(retentionDays: Int = LOG_RETENTION_DAYS) = auditMutex.withLock {
        val cutoff = System.currentTimeMillis() - (retentionDays.toLong() * 24 * 60 * 60 * 1000)
        val removed = auditLogs.filter { it.timestamp < cutoff }
        auditLogs.removeAll { it.timestamp < cutoff }

        // Remove old files from disk
        val dir = auditDir ?: return@withLock
        removed.forEach { log ->
            File(dir, "${log.id}.json").delete()
        }

        _state.value = _state.value.copy(auditLogCount = auditLogs.size)
    }

    /**
     * Exports all audit logs to a JSON string.
     */
    suspend fun exportAuditLogsToJson(): String = withContext(Dispatchers.IO) {
        auditMutex.withLock {
            gson.toJson(auditLogs)
        }
    }

    /**
     * Exports audit logs to a file and returns the file path.
     */
    suspend fun exportAuditLogsToFile(): String = withContext(Dispatchers.IO) {
        val json = exportAuditLogsToJson()
        val exportFile = File(
            context.getExternalFilesDir(null) ?: context.filesDir,
            "audit_export_${System.currentTimeMillis()}.json"
        )
        exportFile.writeText(json)
        exportFile.absolutePath
    }

    // =======================================================================
    //  Rate Limiting  (sliding window)
    // =======================================================================

    /**
     * Checks whether the given [endpoint] is within its rate limit.
     * If allowed, records the request; otherwise returns a [RateLimitInfo]
     * with remaining = 0.
     */
    suspend fun checkRateLimit(endpoint: String): RateLimitInfo = rateLimitMutex.withLock {
        val config = activeRateLimitConfigs.find { it.endpoint == endpoint }
            ?: RateLimitConfig(endpoint = endpoint, maxRequests = DEFAULT_RATE_LIMIT)

        val now = System.currentTimeMillis()

        // Enforce cooldown if in effect
        val cooldownUntil = rateLimitCooldowns[endpoint] ?: 0L
        if (now < cooldownUntil) {
            val info = RateLimitInfo(
                endpoint = endpoint,
                limit = config.maxRequests,
                remaining = 0,
                resetAt = cooldownUntil,
                windowMs = config.windowMs
            )
            updateRateLimitState(endpoint, info)
            return@withLock info
        }

        // Sliding window: remove timestamps outside the window
        val window = rateLimitWindows.getOrPut(endpoint) { mutableListOf() }
        val windowStart = now - config.windowMs
        window.removeAll { it < windowStart }

        val remaining = (config.maxRequests - window.size).coerceAtLeast(0)

        if (remaining > 0) {
            window.add(now)
            val info = RateLimitInfo(
                endpoint = endpoint,
                limit = config.maxRequests,
                remaining = remaining - 1,
                resetAt = (window.firstOrNull() ?: now) + config.windowMs,
                windowMs = config.windowMs
            )
            updateRateLimitState(endpoint, info)
            return@withLock info
        }

        // Rate limit exceeded -- enter cooldown
        rateLimitCooldowns[endpoint] = now + config.cooldownMs
        val info = RateLimitInfo(
            endpoint = endpoint,
            limit = config.maxRequests,
            remaining = 0,
            resetAt = now + config.cooldownMs,
            windowMs = config.windowMs
        )
        updateRateLimitState(endpoint, info)

        // Raise alert
        addSecurityAlert(
            level = AlertLevel.WARNING,
            message = "Rate limit exceeded for endpoint: $endpoint"
        )

        info
    }

    /**
     * Returns true if the request is allowed within the rate limit.
     */
    suspend fun isRateLimitAllowed(endpoint: String): Boolean {
        return checkRateLimit(endpoint).remaining > 0
    }

    /**
     * Applies rate-limit configuration based on the user's subscription plan.
     */
    fun configureRateLimitsForPlan(plan: String) {
        activeRateLimitConfigs = when (plan.lowercase()) {
            "monthly", "annual", "pro" -> PRO_LIMITS
            "enterprise" -> ENTERPRISE_LIMITS
            else -> DEFAULT_FREE_LIMITS
        }
    }

    /**
     * Resets rate-limit state for a specific endpoint.
     */
    suspend fun resetRateLimit(endpoint: String) = rateLimitMutex.withLock {
        rateLimitWindows.remove(endpoint)
        rateLimitCooldowns.remove(endpoint)
        val updated = _state.value.rateLimitStatus.toMutableMap()
        updated.remove(endpoint)
        _state.value = _state.value.copy(rateLimitStatus = updated)
    }

    /**
     * Resets all rate-limit state.
     */
    suspend fun resetAllRateLimits() = rateLimitMutex.withLock {
        rateLimitWindows.clear()
        rateLimitCooldowns.clear()
        _state.value = _state.value.copy(rateLimitStatus = emptyMap())
    }

    // =======================================================================
    //  Certificate Pinning Configuration
    // =======================================================================

    /**
     * Returns the SHA-256 pin hashes for the Anthropic API.
     * Consumers should apply these via OkHttp CertificatePinner.
     */
    fun getCertificatePins(): Map<String, List<String>> {
        return mapOf(
            "api.anthropic.com" to listOf(
                "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
            ),
            "*.anthropic.com" to listOf(
                "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
            )
        )
    }

    // =======================================================================
    //  Root / Jailbreak Detection
    // =======================================================================

    /**
     * Performs heuristic root detection.
     */
    fun detectRoot(): Boolean {
        // Check for su binary
        val suPaths = listOf(
            "/system/xbin/su", "/system/bin/su", "/sbin/su",
            "/data/local/xbin/su", "/data/local/bin/su",
            "/system/sd/xbin/su", "/system/bin/failsafe/su",
            "/data/local/su", "/su/bin/su", "/su/bin",
            "/system/app/Superuser.apk"
        )
        for (path in suPaths) {
            if (File(path).exists()) return true
        }

        // Check for root management apps
        val rootPackages = listOf(
            "com.topjohnwu.magisk",
            "com.koushikdutta.superuser",
            "com.noshufou.android.su",
            "com.thirdparty.superuser",
            "eu.chainfire.supersu",
            "com.yellowes.su",
            "com.devadvance.rootcloak",
            "de.robv.android.xposed.installer"
        )
        val pm = context.packageManager
        for (pkg in rootPackages) {
            try {
                pm.getPackageInfo(pkg, 0)
                return true
            } catch (_: Exception) {
                // not installed
            }
        }

        // Check system properties
        val dangerousProps = mapOf(
            "ro.debuggable" to "1",
            "ro.secure" to "0"
        )
        for ((prop, badValue) in dangerousProps) {
            try {
                val process = Runtime.getRuntime().exec(arrayOf("getprop", prop))
                val value = process.inputStream.bufferedReader().readLine()?.trim()
                if (value == badValue) return true
            } catch (_: Exception) {
                // ignore
            }
        }

        // Check build tags
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) return true

        return false
    }

    // =======================================================================
    //  Debugger Detection
    // =======================================================================

    /**
     * Detects whether a debugger is attached or the app is a debug build.
     */
    fun detectDebugger(): Boolean {
        // Check android.os.Debug
        if (android.os.Debug.isDebuggerConnected()) return true
        if (android.os.Debug.waitingForDebugger()) return true

        // Check application flags
        val appInfo = context.applicationInfo
        if (appInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) return true

        // Check for common debugging/instrumentation environment variables
        try {
            val tracerPid = File("/proc/self/status").readLines()
                .find { it.startsWith("TracerPid:") }
                ?.substringAfter(":")?.trim()?.toIntOrNull()
            if (tracerPid != null && tracerPid > 0) return true
        } catch (_: Exception) {
            // ignore
        }

        return false
    }

    /**
     * Returns true if the app is running in production and a debugger is present.
     * UI layers should block functionality accordingly.
     */
    fun isDebuggerBlockRequired(): Boolean {
        val isReleaseBuild = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) == 0
        return isReleaseBuild && detectDebugger()
    }

    // =======================================================================
    //  Secure Random & Hashing Utilities
    // =======================================================================

    /**
     * Generates a cryptographically secure random token of [byteLength] bytes,
     * returned as a hex string.
     */
    fun generateSecureToken(byteLength: Int = 32): String {
        val bytes = ByteArray(byteLength)
        secureRandom.nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Generates a secure random token as a URL-safe Base64 string.
     */
    fun generateSecureTokenBase64(byteLength: Int = 32): String {
        val bytes = ByteArray(byteLength)
        secureRandom.nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    /**
     * Hashes a password with a random salt using SHA-256 before sending to an API.
     * Returns a pair of (hash-hex, salt-hex).
     */
    fun hashPassword(password: String): Pair<String, String> {
        val salt = generateSalt()
        val spec = PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH)
        val factory = SecretKeyFactory.getInstance(PBKDF2_ALGORITHM)
        val hash = factory.generateSecret(spec).encoded
        val hashHex = hash.joinToString("") { "%02x".format(it) }
        val saltHex = salt.joinToString("") { "%02x".format(it) }
        return hashHex to saltHex
    }

    /**
     * Verifies a password against a stored hash and salt.
     */
    fun verifyPassword(password: String, storedHash: String, saltHex: String): Boolean {
        val salt = saltHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        val spec = PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH)
        val factory = SecretKeyFactory.getInstance(PBKDF2_ALGORITHM)
        val hash = factory.generateSecret(spec).encoded
        val hashHex = hash.joinToString("") { "%02x".format(it) }
        return MessageDigest.isEqual(hashHex.toByteArray(), storedHash.toByteArray())
    }

    // =======================================================================
    //  Security Alerts
    // =======================================================================

    /**
     * Adds a security alert visible through [state].
     */
    fun addSecurityAlert(level: AlertLevel, message: String) {
        val alert = SecurityAlert(
            id = UUID.randomUUID().toString(),
            level = level,
            message = message,
            timestamp = System.currentTimeMillis()
        )
        _state.value = _state.value.copy(
            securityAlerts = _state.value.securityAlerts + alert
        )
    }

    /**
     * Dismisses a security alert by id.
     */
    fun dismissAlert(alertId: String) {
        _state.value = _state.value.copy(
            securityAlerts = _state.value.securityAlerts.filter { it.id != alertId }
        )
    }

    /**
     * Clears all security alerts.
     */
    fun clearAlerts() {
        _state.value = _state.value.copy(securityAlerts = emptyList())
    }

    // =======================================================================
    //  Private helpers
    // =======================================================================

    private fun ensureKeystoreKeyExists() {
        if (!keyStore.containsAlias(KEYSTORE_ALIAS)) {
            val keyGen = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEYSTORE
            )
            keyGen.init(
                KeyGenParameterSpec.Builder(
                    KEYSTORE_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .setRandomizedEncryptionRequired(true)
                    .build()
            )
            keyGen.generateKey()
        }
    }

    private fun getOrCreateKeystoreKey(): SecretKey {
        ensureKeystoreKeyExists()
        val entry = keyStore.getEntry(KEYSTORE_ALIAS, null) as KeyStore.SecretKeyEntry
        return entry.secretKey
    }

    private fun computeLogHash(log: AuditLog, previousHash: String): String {
        val payload = "${log.id}|${log.timestamp}|${log.userId}|${log.action}|${log.target}|${log.details}|$previousHash"
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(payload.toByteArray(Charsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }
    }

    private fun persistAuditLog(log: AuditLog) {
        val dir = auditDir ?: return
        try {
            File(dir, "${log.id}.json").writeText(gson.toJson(log))
        } catch (_: Exception) {
            // Swallow -- best effort persistence
        }
    }

    private fun loadAuditLogs() {
        val dir = auditDir ?: return
        val cutoff = System.currentTimeMillis() - (LOG_RETENTION_DAYS.toLong() * 24 * 60 * 60 * 1000)

        val logs = dir.listFiles { f -> f.extension == "json" }
            ?.mapNotNull { file ->
                try {
                    gson.fromJson(file.readText(), AuditLog::class.java)
                } catch (_: Exception) {
                    null
                }
            }
            ?.filter { it.timestamp >= cutoff }
            ?.sortedBy { it.timestamp }
            ?: emptyList()

        auditLogs.clear()
        auditLogs.addAll(logs)

        // Clean up expired logs on disk
        dir.listFiles { f -> f.extension == "json" }?.forEach { file ->
            try {
                val log = gson.fromJson(file.readText(), AuditLog::class.java)
                if (log.timestamp < cutoff) file.delete()
            } catch (_: Exception) {
                // ignore
            }
        }
    }

    private fun updateRateLimitState(endpoint: String, info: RateLimitInfo) {
        val updated = _state.value.rateLimitStatus.toMutableMap()
        updated[endpoint] = info
        _state.value = _state.value.copy(rateLimitStatus = updated)
    }

    // =======================================================================
    //  Constants
    // =======================================================================

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEYSTORE_ALIAS = "claude_context_master_key"
        private const val ENCRYPTED_PREFS_FILE = "claude_context_secure_prefs"

        private const val AES_GCM_TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_IV_LENGTH = 12
        private const val GCM_TAG_LENGTH_BITS = 128

        private const val PBKDF2_ALGORITHM = "PBKDF2WithHmacSHA256"
        private const val PBKDF2_ITERATIONS = 210_000
        private const val PBKDF2_KEY_LENGTH = 256
        private const val PBKDF2_SALT_LENGTH = 16

        private const val MAX_INPUT_LENGTH = 100_000
        private const val MAX_COMMAND_LENGTH = 10_000
        private const val MAX_URL_LENGTH = 2_048
        private const val MAX_SEARCH_QUERY_LENGTH = 1_000

        private const val LOG_RETENTION_DAYS = 30
        private const val GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

        private const val DEFAULT_RATE_LIMIT = 60

        private val ALLOWED_URL_SCHEMES = setOf("http", "https", "ftp", "ftps", "ssh", "git")

        // Free-tier rate limits
        private val DEFAULT_FREE_LIMITS = listOf(
            RateLimitConfig(endpoint = "ai/chat", maxRequests = 20, windowMs = 60_000, cooldownMs = 30_000),
            RateLimitConfig(endpoint = "ai/code-assist", maxRequests = 15, windowMs = 60_000, cooldownMs = 30_000),
            RateLimitConfig(endpoint = "ai/explain-error", maxRequests = 15, windowMs = 60_000, cooldownMs = 30_000),
            RateLimitConfig(endpoint = "ai/generate-tests", maxRequests = 10, windowMs = 60_000, cooldownMs = 30_000),
            RateLimitConfig(endpoint = "auth/login", maxRequests = 10, windowMs = 60_000, cooldownMs = 60_000),
            RateLimitConfig(endpoint = "auth/register", maxRequests = 5, windowMs = 60_000, cooldownMs = 120_000),
            RateLimitConfig(endpoint = "files/upload", maxRequests = 30, windowMs = 60_000, cooldownMs = 15_000),
            RateLimitConfig(endpoint = "shell/execute", maxRequests = 30, windowMs = 60_000, cooldownMs = 15_000)
        )

        // Pro-plan rate limits
        private val PRO_LIMITS = listOf(
            RateLimitConfig(endpoint = "ai/chat", maxRequests = 60, windowMs = 60_000, cooldownMs = 10_000),
            RateLimitConfig(endpoint = "ai/code-assist", maxRequests = 60, windowMs = 60_000, cooldownMs = 10_000),
            RateLimitConfig(endpoint = "ai/explain-error", maxRequests = 60, windowMs = 60_000, cooldownMs = 10_000),
            RateLimitConfig(endpoint = "ai/generate-tests", maxRequests = 40, windowMs = 60_000, cooldownMs = 10_000),
            RateLimitConfig(endpoint = "auth/login", maxRequests = 10, windowMs = 60_000, cooldownMs = 60_000),
            RateLimitConfig(endpoint = "auth/register", maxRequests = 5, windowMs = 60_000, cooldownMs = 120_000),
            RateLimitConfig(endpoint = "files/upload", maxRequests = 120, windowMs = 60_000, cooldownMs = 5_000),
            RateLimitConfig(endpoint = "shell/execute", maxRequests = 120, windowMs = 60_000, cooldownMs = 5_000)
        )

        // Enterprise rate limits
        private val ENTERPRISE_LIMITS = listOf(
            RateLimitConfig(endpoint = "ai/chat", maxRequests = 200, windowMs = 60_000, cooldownMs = 5_000),
            RateLimitConfig(endpoint = "ai/code-assist", maxRequests = 200, windowMs = 60_000, cooldownMs = 5_000),
            RateLimitConfig(endpoint = "ai/explain-error", maxRequests = 200, windowMs = 60_000, cooldownMs = 5_000),
            RateLimitConfig(endpoint = "ai/generate-tests", maxRequests = 150, windowMs = 60_000, cooldownMs = 5_000),
            RateLimitConfig(endpoint = "auth/login", maxRequests = 20, windowMs = 60_000, cooldownMs = 30_000),
            RateLimitConfig(endpoint = "auth/register", maxRequests = 10, windowMs = 60_000, cooldownMs = 60_000),
            RateLimitConfig(endpoint = "files/upload", maxRequests = 500, windowMs = 60_000, cooldownMs = 2_000),
            RateLimitConfig(endpoint = "shell/execute", maxRequests = 500, windowMs = 60_000, cooldownMs = 2_000)
        )
    }
}
