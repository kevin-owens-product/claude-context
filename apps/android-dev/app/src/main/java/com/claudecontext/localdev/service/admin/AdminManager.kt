package com.claudecontext.localdev.service.admin

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

// --- Data Models ---

data class AdminState(
    val users: List<AdminUser> = emptyList(),
    val analytics: AnalyticsSnapshot? = null,
    val featureFlags: List<FeatureFlag> = emptyList(),
    val auditLogs: List<AuditLogEntry> = emptyList(),
    val systemHealth: SystemHealth? = null,
    val isLoading: Boolean = false,
    val selectedTab: AdminTab = AdminTab.DASHBOARD
)

data class AdminUser(
    val id: String,
    val email: String,
    val name: String,
    val plan: String,
    val status: String,
    val lastLogin: Long,
    val totalSessions: Int,
    val totalTokensUsed: Long
)

data class AnalyticsSnapshot(
    val dau: Int,
    val mau: Int,
    val totalRevenue: Double,
    val monthlyRevenue: Double,
    val apiCallsToday: Long,
    val apiCallsByModel: Map<String, Long>,
    val avgSessionDuration: Long,
    val retentionRate: Float,
    val churnRate: Float
)

data class FeatureFlag(
    val id: String,
    val name: String,
    val description: String,
    val enabled: Boolean,
    val rolloutPercent: Int = 100,
    val targetPlans: List<String> = emptyList(),
    val createdAt: Long = 0
)

data class AuditLogEntry(
    val id: String,
    val userId: String,
    val userName: String,
    val action: String,
    val details: String,
    val timestamp: Long,
    val ipAddress: String? = null
)

data class SystemHealth(
    val cpuUsage: Float,
    val memoryUsage: Float,
    val apiLatencyMs: Long,
    val errorRate: Float,
    val activeConnections: Int,
    val uptime: Long
)

enum class AdminTab {
    DASHBOARD,
    USERS,
    ANALYTICS,
    FEATURE_FLAGS,
    AUDIT_LOG,
    SYSTEM
}

// --- Notification Models ---

data class PushNotification(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val body: String,
    val target: NotificationTarget,
    val sentAt: Long = System.currentTimeMillis(),
    val status: NotificationStatus = NotificationStatus.PENDING
)

sealed class NotificationTarget {
    data object All : NotificationTarget()
    data class Segment(val plan: String) : NotificationTarget()
    data class SpecificUser(val userId: String) : NotificationTarget()
}

enum class NotificationStatus {
    PENDING,
    SENT,
    FAILED
}

// --- Content Moderation ---

data class ModerationItem(
    val id: String,
    val userId: String,
    val userName: String,
    val contentType: String,
    val content: String,
    val reportedAt: Long,
    val reason: String,
    val status: ModerationStatus = ModerationStatus.PENDING
)

enum class ModerationStatus {
    PENDING,
    APPROVED,
    REJECTED,
    ESCALATED
}

// --- Admin Manager Service ---

@Singleton
class AdminManager @Inject constructor() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _state = MutableStateFlow(AdminState())
    val state: StateFlow<AdminState> = _state.asStateFlow()

    private val _currentUserRole = MutableStateFlow("USER")
    val currentUserRole: StateFlow<String> = _currentUserRole.asStateFlow()

    private val _notifications = MutableStateFlow<List<PushNotification>>(emptyList())
    val notifications: StateFlow<List<PushNotification>> = _notifications.asStateFlow()

    private val _moderationQueue = MutableStateFlow<List<ModerationItem>>(emptyList())
    val moderationQueue: StateFlow<List<ModerationItem>> = _moderationQueue.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    // --- Admin Role Check ---

    fun isAdmin(): Boolean = _currentUserRole.value == "ADMIN"

    fun setCurrentUserRole(role: String) {
        _currentUserRole.value = role
    }

    private inline fun requireAdmin(block: () -> Unit) {
        if (!isAdmin()) {
            _error.value = "Access denied: admin privileges required"
            return
        }
        block()
    }

    // --- Tab Navigation ---

    fun selectTab(tab: AdminTab) {
        requireAdmin {
            _state.value = _state.value.copy(selectedTab = tab)
        }
    }

    // --- User Management ---

    fun loadUsers() {
        requireAdmin {
            scope.launch {
                _state.value = _state.value.copy(isLoading = true)
                val users = fetchUsers()
                _state.value = _state.value.copy(users = users, isLoading = false)
                logAuditEntry("ADMIN", "system", "Loaded user list", "Fetched ${users.size} users")
            }
        }
    }

    fun searchUsers(query: String) {
        requireAdmin {
            val lowerQuery = query.lowercase()
            val filtered = _state.value.users.filter { user ->
                user.name.lowercase().contains(lowerQuery) ||
                    user.email.lowercase().contains(lowerQuery) ||
                    user.id.lowercase().contains(lowerQuery) ||
                    user.plan.lowercase().contains(lowerQuery)
            }
            _state.value = _state.value.copy(users = filtered)
        }
    }

    fun suspendUser(userId: String) {
        requireAdmin {
            scope.launch {
                updateUserStatus(userId, "suspended")
                logAuditEntry("ADMIN", "system", "Suspended user", "User ID: $userId")
            }
        }
    }

    fun activateUser(userId: String) {
        requireAdmin {
            scope.launch {
                updateUserStatus(userId, "active")
                logAuditEntry("ADMIN", "system", "Activated user", "User ID: $userId")
            }
        }
    }

    fun deleteUser(userId: String) {
        requireAdmin {
            scope.launch {
                val updatedUsers = _state.value.users.filter { it.id != userId }
                _state.value = _state.value.copy(users = updatedUsers)
                logAuditEntry("ADMIN", "system", "Deleted user", "User ID: $userId")
            }
        }
    }

    private fun updateUserStatus(userId: String, newStatus: String) {
        val updatedUsers = _state.value.users.map { user ->
            if (user.id == userId) user.copy(status = newStatus) else user
        }
        _state.value = _state.value.copy(users = updatedUsers)
    }

    // --- Analytics Tracking ---

    fun loadAnalytics() {
        requireAdmin {
            scope.launch {
                _state.value = _state.value.copy(isLoading = true)
                val analytics = fetchAnalyticsSnapshot()
                _state.value = _state.value.copy(analytics = analytics, isLoading = false)
            }
        }
    }

    fun refreshAnalytics() {
        loadAnalytics()
    }

    private suspend fun fetchAnalyticsSnapshot(): AnalyticsSnapshot = withContext(Dispatchers.IO) {
        AnalyticsSnapshot(
            dau = calculateDailyActiveUsers(),
            mau = calculateMonthlyActiveUsers(),
            totalRevenue = calculateTotalRevenue(),
            monthlyRevenue = calculateMonthlyRevenue(),
            apiCallsToday = countApiCallsToday(),
            apiCallsByModel = countApiCallsByModel(),
            avgSessionDuration = calculateAvgSessionDuration(),
            retentionRate = calculateRetentionRate(),
            churnRate = calculateChurnRate()
        )
    }

    private fun calculateDailyActiveUsers(): Int {
        val oneDayAgo = System.currentTimeMillis() - 86_400_000L
        return _state.value.users.count { it.lastLogin >= oneDayAgo && it.status == "active" }
    }

    private fun calculateMonthlyActiveUsers(): Int {
        val thirtyDaysAgo = System.currentTimeMillis() - 2_592_000_000L
        return _state.value.users.count { it.lastLogin >= thirtyDaysAgo && it.status == "active" }
    }

    private fun calculateTotalRevenue(): Double {
        val users = _state.value.users
        return users.sumOf { user ->
            when (user.plan) {
                "pro_monthly" -> 4.99
                "pro_annual" -> 49.99
                "enterprise" -> 99.99
                else -> 0.0
            }
        }
    }

    private fun calculateMonthlyRevenue(): Double {
        val users = _state.value.users.filter { it.status == "active" }
        return users.sumOf { user ->
            when (user.plan) {
                "pro_monthly" -> 4.99
                "pro_annual" -> 49.99 / 12.0
                "enterprise" -> 99.99
                else -> 0.0
            }
        }
    }

    private fun countApiCallsToday(): Long {
        return _state.value.users.sumOf { it.totalSessions.toLong() }
    }

    private fun countApiCallsByModel(): Map<String, Long> {
        return mapOf(
            "claude-opus-4" to _state.value.users.sumOf { it.totalTokensUsed / 4 },
            "claude-sonnet-4" to _state.value.users.sumOf { it.totalTokensUsed / 3 },
            "claude-haiku" to _state.value.users.sumOf { it.totalTokensUsed / 6 },
            "gpt-4o" to _state.value.users.sumOf { it.totalTokensUsed / 5 },
            "gemini-pro" to _state.value.users.sumOf { it.totalTokensUsed / 8 }
        )
    }

    private fun calculateAvgSessionDuration(): Long {
        val users = _state.value.users
        if (users.isEmpty()) return 0L
        return users.sumOf { it.totalSessions.toLong() * 300_000L } / users.size
    }

    private fun calculateRetentionRate(): Float {
        val users = _state.value.users
        if (users.isEmpty()) return 0f
        val thirtyDaysAgo = System.currentTimeMillis() - 2_592_000_000L
        val activeCount = users.count { it.lastLogin >= thirtyDaysAgo && it.status == "active" }
        return activeCount.toFloat() / users.size
    }

    private fun calculateChurnRate(): Float {
        return 1f - calculateRetentionRate()
    }

    // --- Feature Flags ---

    fun loadFeatureFlags() {
        requireAdmin {
            scope.launch {
                _state.value = _state.value.copy(isLoading = true)
                val flags = fetchFeatureFlags()
                _state.value = _state.value.copy(featureFlags = flags, isLoading = false)
            }
        }
    }

    fun createFeatureFlag(name: String, description: String) {
        requireAdmin {
            val flag = FeatureFlag(
                id = UUID.randomUUID().toString(),
                name = name,
                description = description,
                enabled = false,
                rolloutPercent = 0,
                targetPlans = emptyList(),
                createdAt = System.currentTimeMillis()
            )
            val updatedFlags = _state.value.featureFlags + flag
            _state.value = _state.value.copy(featureFlags = updatedFlags)
            logAuditEntry("ADMIN", "system", "Created feature flag", "Flag: $name")
        }
    }

    fun toggleFeatureFlag(flagId: String) {
        requireAdmin {
            val updatedFlags = _state.value.featureFlags.map { flag ->
                if (flag.id == flagId) flag.copy(enabled = !flag.enabled) else flag
            }
            _state.value = _state.value.copy(featureFlags = updatedFlags)
            val flag = updatedFlags.find { it.id == flagId }
            logAuditEntry(
                "ADMIN", "system", "Toggled feature flag",
                "Flag: ${flag?.name}, Enabled: ${flag?.enabled}"
            )
        }
    }

    fun updateFlagRolloutPercent(flagId: String, percent: Int) {
        requireAdmin {
            val clampedPercent = percent.coerceIn(0, 100)
            val updatedFlags = _state.value.featureFlags.map { flag ->
                if (flag.id == flagId) flag.copy(rolloutPercent = clampedPercent) else flag
            }
            _state.value = _state.value.copy(featureFlags = updatedFlags)
            logAuditEntry(
                "ADMIN", "system", "Updated flag rollout",
                "Flag ID: $flagId, Rollout: $clampedPercent%"
            )
        }
    }

    fun updateFlagTargetPlans(flagId: String, plans: List<String>) {
        requireAdmin {
            val updatedFlags = _state.value.featureFlags.map { flag ->
                if (flag.id == flagId) flag.copy(targetPlans = plans) else flag
            }
            _state.value = _state.value.copy(featureFlags = updatedFlags)
            logAuditEntry(
                "ADMIN", "system", "Updated flag targeting",
                "Flag ID: $flagId, Plans: ${plans.joinToString()}"
            )
        }
    }

    fun deleteFeatureFlag(flagId: String) {
        requireAdmin {
            val flag = _state.value.featureFlags.find { it.id == flagId }
            val updatedFlags = _state.value.featureFlags.filter { it.id != flagId }
            _state.value = _state.value.copy(featureFlags = updatedFlags)
            logAuditEntry("ADMIN", "system", "Deleted feature flag", "Flag: ${flag?.name}")
        }
    }

    fun isFlagEnabledForUser(flagId: String, userPlan: String, userId: String): Boolean {
        val flag = _state.value.featureFlags.find { it.id == flagId } ?: return false
        if (!flag.enabled) return false
        if (flag.targetPlans.isNotEmpty() && userPlan !in flag.targetPlans) return false
        val userHash = userId.hashCode().toUInt().toInt()
        val bucket = (userHash % 100).let { if (it < 0) it + 100 else it }
        return bucket < flag.rolloutPercent
    }

    // --- System Health Metrics ---

    fun loadSystemHealth() {
        requireAdmin {
            scope.launch {
                _state.value = _state.value.copy(isLoading = true)
                val health = fetchSystemHealth()
                _state.value = _state.value.copy(systemHealth = health, isLoading = false)
            }
        }
    }

    fun startHealthMonitoring() {
        requireAdmin {
            scope.launch {
                while (true) {
                    val health = fetchSystemHealth()
                    _state.value = _state.value.copy(systemHealth = health)
                    delay(10_000L)
                }
            }
        }
    }

    private suspend fun fetchSystemHealth(): SystemHealth = withContext(Dispatchers.IO) {
        val runtime = Runtime.getRuntime()
        val totalMemory = runtime.totalMemory()
        val freeMemory = runtime.freeMemory()
        val usedMemory = totalMemory - freeMemory
        val memoryUsage = usedMemory.toFloat() / totalMemory.toFloat()

        SystemHealth(
            cpuUsage = estimateCpuUsage(),
            memoryUsage = memoryUsage,
            apiLatencyMs = measureApiLatency(),
            errorRate = calculateErrorRate(),
            activeConnections = countActiveConnections(),
            uptime = getUptimeMillis()
        )
    }

    private fun estimateCpuUsage(): Float {
        val processors = Runtime.getRuntime().availableProcessors()
        val activeThreads = Thread.activeCount()
        return (activeThreads.toFloat() / (processors * 4).toFloat()).coerceIn(0f, 1f)
    }

    private fun measureApiLatency(): Long {
        val start = System.nanoTime()
        @Suppress("unused")
        val allocation = ByteArray(1024)
        val end = System.nanoTime()
        return ((end - start) / 1_000_000).coerceAtLeast(1L)
    }

    private fun calculateErrorRate(): Float {
        val logs = _state.value.auditLogs
        if (logs.isEmpty()) return 0f
        val errorCount = logs.count { it.action.contains("error", ignoreCase = true) }
        return errorCount.toFloat() / logs.size.toFloat()
    }

    private fun countActiveConnections(): Int {
        return _state.value.users.count { it.status == "active" }
    }

    private fun getUptimeMillis(): Long {
        return android.os.SystemClock.elapsedRealtime()
    }

    // --- Audit Log ---

    fun loadAuditLogs() {
        requireAdmin {
            scope.launch {
                _state.value = _state.value.copy(isLoading = true)
                val logs = fetchAuditLogs()
                _state.value = _state.value.copy(auditLogs = logs, isLoading = false)
            }
        }
    }

    fun filterAuditLogs(
        actionType: String? = null,
        userId: String? = null,
        startDate: Long? = null,
        endDate: Long? = null
    ) {
        requireAdmin {
            val allLogs = _state.value.auditLogs
            val filtered = allLogs.filter { entry ->
                val matchesAction = actionType == null ||
                    entry.action.contains(actionType, ignoreCase = true)
                val matchesUser = userId == null ||
                    entry.userId == userId ||
                    entry.userName.contains(userId, ignoreCase = true)
                val matchesStart = startDate == null || entry.timestamp >= startDate
                val matchesEnd = endDate == null || entry.timestamp <= endDate
                matchesAction && matchesUser && matchesStart && matchesEnd
            }
            _state.value = _state.value.copy(auditLogs = filtered)
        }
    }

    fun clearAuditLogFilters() {
        requireAdmin {
            loadAuditLogs()
        }
    }

    private fun logAuditEntry(
        userId: String,
        userName: String,
        action: String,
        details: String,
        ipAddress: String? = null
    ) {
        val entry = AuditLogEntry(
            id = UUID.randomUUID().toString(),
            userId = userId,
            userName = userName,
            action = action,
            details = details,
            timestamp = System.currentTimeMillis(),
            ipAddress = ipAddress
        )
        val updatedLogs = listOf(entry) + _state.value.auditLogs
        _state.value = _state.value.copy(auditLogs = updatedLogs)
    }

    // --- Push Notifications ---

    fun sendNotificationToAll(title: String, body: String) {
        requireAdmin {
            scope.launch {
                val notification = PushNotification(
                    title = title,
                    body = body,
                    target = NotificationTarget.All
                )
                dispatchNotification(notification)
                logAuditEntry(
                    "ADMIN", "system", "Sent push notification (all)",
                    "Title: $title"
                )
            }
        }
    }

    fun sendNotificationToSegment(title: String, body: String, plan: String) {
        requireAdmin {
            scope.launch {
                val notification = PushNotification(
                    title = title,
                    body = body,
                    target = NotificationTarget.Segment(plan)
                )
                dispatchNotification(notification)
                logAuditEntry(
                    "ADMIN", "system", "Sent push notification (segment)",
                    "Title: $title, Plan: $plan"
                )
            }
        }
    }

    fun sendNotificationToUser(title: String, body: String, userId: String) {
        requireAdmin {
            scope.launch {
                val notification = PushNotification(
                    title = title,
                    body = body,
                    target = NotificationTarget.SpecificUser(userId)
                )
                dispatchNotification(notification)
                logAuditEntry(
                    "ADMIN", "system", "Sent push notification (user)",
                    "Title: $title, User: $userId"
                )
            }
        }
    }

    private suspend fun dispatchNotification(notification: PushNotification) {
        withContext(Dispatchers.IO) {
            val targetUsers = when (val target = notification.target) {
                is NotificationTarget.All -> _state.value.users
                is NotificationTarget.Segment -> _state.value.users.filter { it.plan == target.plan }
                is NotificationTarget.SpecificUser -> _state.value.users.filter { it.id == target.userId }
            }

            val sent = if (targetUsers.isNotEmpty()) {
                notification.copy(status = NotificationStatus.SENT)
            } else {
                notification.copy(status = NotificationStatus.FAILED)
            }

            _notifications.value = listOf(sent) + _notifications.value
        }
    }

    // --- Content Moderation Queue ---

    fun loadModerationQueue() {
        requireAdmin {
            scope.launch {
                _state.value = _state.value.copy(isLoading = true)
                val items = fetchModerationQueue()
                _moderationQueue.value = items
                _state.value = _state.value.copy(isLoading = false)
            }
        }
    }

    fun approveContent(itemId: String) {
        requireAdmin {
            updateModerationStatus(itemId, ModerationStatus.APPROVED)
            logAuditEntry("ADMIN", "system", "Approved content", "Item ID: $itemId")
        }
    }

    fun rejectContent(itemId: String) {
        requireAdmin {
            updateModerationStatus(itemId, ModerationStatus.REJECTED)
            logAuditEntry("ADMIN", "system", "Rejected content", "Item ID: $itemId")
        }
    }

    fun escalateContent(itemId: String) {
        requireAdmin {
            updateModerationStatus(itemId, ModerationStatus.ESCALATED)
            logAuditEntry("ADMIN", "system", "Escalated content", "Item ID: $itemId")
        }
    }

    private fun updateModerationStatus(itemId: String, status: ModerationStatus) {
        val updatedQueue = _moderationQueue.value.map { item ->
            if (item.id == itemId) item.copy(status = status) else item
        }
        _moderationQueue.value = updatedQueue
    }

    // --- Data Fetching (simulated backend calls) ---

    private suspend fun fetchUsers(): List<AdminUser> = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val dayMs = 86_400_000L
        listOf(
            AdminUser("u001", "alice@example.com", "Alice Chen", "pro_monthly", "active", now - dayMs, 142, 2_850_000L),
            AdminUser("u002", "bob@example.com", "Bob Martinez", "free", "active", now - 2 * dayMs, 38, 420_000L),
            AdminUser("u003", "carol@example.com", "Carol Nguyen", "pro_annual", "active", now - dayMs / 2, 287, 5_100_000L),
            AdminUser("u004", "dave@example.com", "Dave Park", "enterprise", "active", now - 3 * dayMs, 503, 12_400_000L),
            AdminUser("u005", "eve@example.com", "Eve Johnson", "pro_monthly", "suspended", now - 10 * dayMs, 15, 180_000L),
            AdminUser("u006", "frank@example.com", "Frank Wilson", "free", "active", now - 5 * dayMs, 72, 890_000L),
            AdminUser("u007", "grace@example.com", "Grace Lee", "pro_annual", "active", now - dayMs, 198, 3_700_000L),
            AdminUser("u008", "hank@example.com", "Hank Brown", "free", "inactive", now - 30 * dayMs, 5, 60_000L),
            AdminUser("u009", "iris@example.com", "Iris Davis", "enterprise", "active", now - 2 * dayMs, 412, 9_200_000L),
            AdminUser("u010", "jake@example.com", "Jake Thompson", "pro_monthly", "active", now - dayMs / 4, 95, 1_500_000L)
        )
    }

    private suspend fun fetchFeatureFlags(): List<FeatureFlag> = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val dayMs = 86_400_000L
        listOf(
            FeatureFlag("ff001", "dark_mode_v2", "Enhanced dark mode with AMOLED black", true, 100, emptyList(), now - 30 * dayMs),
            FeatureFlag("ff002", "swarm_mode", "Multi-agent swarm collaboration", true, 50, listOf("pro_monthly", "pro_annual", "enterprise"), now - 14 * dayMs),
            FeatureFlag("ff003", "local_models", "On-device model inference", false, 10, listOf("enterprise"), now - 7 * dayMs),
            FeatureFlag("ff004", "code_review_ai", "AI-powered code review suggestions", true, 75, listOf("pro_monthly", "pro_annual", "enterprise"), now - 21 * dayMs),
            FeatureFlag("ff005", "voice_input", "Voice-to-code input", false, 0, emptyList(), now - 3 * dayMs),
            FeatureFlag("ff006", "collaborative_editing", "Real-time collaborative editing", true, 25, listOf("enterprise"), now - 10 * dayMs)
        )
    }

    private suspend fun fetchAuditLogs(): List<AuditLogEntry> = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val hourMs = 3_600_000L
        listOf(
            AuditLogEntry("al001", "u001", "Alice Chen", "login", "Successful login via OAuth", now - hourMs, "192.168.1.10"),
            AuditLogEntry("al002", "u004", "Dave Park", "api_call", "Called /v1/completions (claude-opus-4)", now - 2 * hourMs, "10.0.0.5"),
            AuditLogEntry("al003", "ADMIN", "system", "flag_toggle", "Enabled swarm_mode flag", now - 3 * hourMs, null),
            AuditLogEntry("al004", "u003", "Carol Nguyen", "session_create", "Created new agent session", now - 4 * hourMs, "172.16.0.22"),
            AuditLogEntry("al005", "u005", "Eve Johnson", "error", "Rate limit exceeded", now - 5 * hourMs, "192.168.1.50"),
            AuditLogEntry("al006", "ADMIN", "system", "user_suspend", "Suspended user u005", now - 6 * hourMs, null),
            AuditLogEntry("al007", "u002", "Bob Martinez", "login", "Successful login via email", now - 7 * hourMs, "10.0.1.15"),
            AuditLogEntry("al008", "u007", "Grace Lee", "api_call", "Called /v1/completions (claude-sonnet-4)", now - 8 * hourMs, "172.16.0.88"),
            AuditLogEntry("al009", "u009", "Iris Davis", "export", "Exported session data", now - 9 * hourMs, "10.0.0.30"),
            AuditLogEntry("al010", "u006", "Frank Wilson", "error", "Authentication token expired", now - 10 * hourMs, "192.168.1.75")
        )
    }

    private suspend fun fetchModerationQueue(): List<ModerationItem> = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val hourMs = 3_600_000L
        listOf(
            ModerationItem("m001", "u002", "Bob Martinez", "prompt", "Potentially harmful prompt content detected", now - hourMs, "Automated flag: policy violation"),
            ModerationItem("m002", "u006", "Frank Wilson", "output", "Generated content flagged for review", now - 3 * hourMs, "User report: inappropriate content"),
            ModerationItem("m003", "u008", "Hank Brown", "prompt", "Repeated attempts to bypass content filter", now - 5 * hourMs, "Automated flag: filter bypass attempt")
        )
    }

    // --- Initialization ---

    fun initialize() {
        if (!isAdmin()) return

        scope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val users = fetchUsers()
            val analytics = fetchAnalyticsSnapshot()
            val flags = fetchFeatureFlags()
            val logs = fetchAuditLogs()
            val health = fetchSystemHealth()
            val moderation = fetchModerationQueue()

            _state.value = AdminState(
                users = users,
                analytics = analytics,
                featureFlags = flags,
                auditLogs = logs,
                systemHealth = health,
                isLoading = false,
                selectedTab = AdminTab.DASHBOARD
            )
            _moderationQueue.value = moderation
        }
    }

    fun clearError() {
        _error.value = null
    }
}
