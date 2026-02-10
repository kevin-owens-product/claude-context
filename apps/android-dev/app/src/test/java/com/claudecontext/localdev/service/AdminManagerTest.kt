package com.claudecontext.localdev.service

import com.claudecontext.localdev.service.admin.AdminManager
import com.claudecontext.localdev.service.admin.AdminState
import com.claudecontext.localdev.service.admin.AdminTab
import com.claudecontext.localdev.service.admin.AdminUser
import com.claudecontext.localdev.service.admin.AuditLogEntry
import com.claudecontext.localdev.service.admin.FeatureFlag
import com.claudecontext.localdev.service.admin.ModerationStatus
import com.claudecontext.localdev.service.admin.NotificationStatus
import com.claudecontext.localdev.service.admin.NotificationTarget
import com.claudecontext.localdev.service.admin.PushNotification
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AdminManagerTest {

    private lateinit var adminManager: AdminManager
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        adminManager = AdminManager()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // -----------------------------------------------------------------------
    //  Initial Admin State
    // -----------------------------------------------------------------------

    @Test
    fun `initial state has empty collections and DASHBOARD tab`() {
        val state = adminManager.state.value
        assertTrue(state.users.isEmpty())
        assertNull(state.analytics)
        assertTrue(state.featureFlags.isEmpty())
        assertTrue(state.auditLogs.isEmpty())
        assertNull(state.systemHealth)
        assertFalse(state.isLoading)
        assertEquals(AdminTab.DASHBOARD, state.selectedTab)
    }

    @Test
    fun `initial user role is USER not ADMIN`() {
        assertEquals("USER", adminManager.currentUserRole.value)
        assertFalse(adminManager.isAdmin())
    }

    @Test
    fun `setCurrentUserRole to ADMIN enables admin access`() {
        adminManager.setCurrentUserRole("ADMIN")
        assertTrue(adminManager.isAdmin())
        assertEquals("ADMIN", adminManager.currentUserRole.value)
    }

    // -----------------------------------------------------------------------
    //  Admin-Only Access Check
    // -----------------------------------------------------------------------

    @Test
    fun `non-admin operations set error and do not modify state`() {
        // Ensure role is USER (default)
        assertFalse(adminManager.isAdmin())

        val stateBefore = adminManager.state.value
        adminManager.selectTab(AdminTab.USERS)

        // Tab should NOT change because user is not admin
        assertEquals(stateBefore.selectedTab, adminManager.state.value.selectedTab)
        assertEquals("Access denied: admin privileges required", adminManager.error.value)
    }

    @Test
    fun `admin can select tabs`() {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.selectTab(AdminTab.ANALYTICS)
        assertEquals(AdminTab.ANALYTICS, adminManager.state.value.selectedTab)
    }

    @Test
    fun `clearError resets error to null`() {
        // Trigger an error as non-admin
        adminManager.loadUsers()
        assertNotNull(adminManager.error.value)

        adminManager.clearError()
        assertNull(adminManager.error.value)
    }

    // -----------------------------------------------------------------------
    //  User Listing and Search
    // -----------------------------------------------------------------------

    @Test
    fun `loadUsers populates user list when admin`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.loadUsers()
        advanceUntilIdle()

        val users = adminManager.state.value.users
        assertTrue(users.isNotEmpty())
        assertEquals(10, users.size)
    }

    @Test
    fun `searchUsers filters by name`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.loadUsers()
        advanceUntilIdle()

        adminManager.searchUsers("Alice")

        val users = adminManager.state.value.users
        assertTrue(users.isNotEmpty())
        assertTrue(users.all { it.name.contains("Alice", ignoreCase = true) })
    }

    @Test
    fun `searchUsers filters by email`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.loadUsers()
        advanceUntilIdle()

        adminManager.searchUsers("bob@example.com")

        val users = adminManager.state.value.users
        assertEquals(1, users.size)
        assertEquals("bob@example.com", users[0].email)
    }

    @Test
    fun `searchUsers with non-matching query returns empty list`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.loadUsers()
        advanceUntilIdle()

        adminManager.searchUsers("nonexistent_user_xyz")
        assertTrue(adminManager.state.value.users.isEmpty())
    }

    // -----------------------------------------------------------------------
    //  User Suspend / Activate
    // -----------------------------------------------------------------------

    @Test
    fun `suspendUser changes status to suspended`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.loadUsers()
        advanceUntilIdle()

        val userId = adminManager.state.value.users.first().id
        adminManager.suspendUser(userId)
        advanceUntilIdle()

        val user = adminManager.state.value.users.find { it.id == userId }
        assertNotNull(user)
        assertEquals("suspended", user!!.status)
    }

    @Test
    fun `activateUser changes status to active`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.loadUsers()
        advanceUntilIdle()

        // Find a suspended user (Eve Johnson, u005)
        val suspendedUser = adminManager.state.value.users.find { it.status == "suspended" }
        assertNotNull(suspendedUser)

        adminManager.activateUser(suspendedUser!!.id)
        advanceUntilIdle()

        val activated = adminManager.state.value.users.find { it.id == suspendedUser.id }
        assertEquals("active", activated?.status)
    }

    @Test
    fun `deleteUser removes user from list`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.loadUsers()
        advanceUntilIdle()

        val initialCount = adminManager.state.value.users.size
        val userId = adminManager.state.value.users.last().id

        adminManager.deleteUser(userId)
        advanceUntilIdle()

        assertEquals(initialCount - 1, adminManager.state.value.users.size)
        assertNull(adminManager.state.value.users.find { it.id == userId })
    }

    // -----------------------------------------------------------------------
    //  Feature Flag CRUD
    // -----------------------------------------------------------------------

    @Test
    fun `createFeatureFlag adds a new flag`() {
        adminManager.setCurrentUserRole("ADMIN")

        val initialCount = adminManager.state.value.featureFlags.size
        adminManager.createFeatureFlag("test_flag", "A test feature flag")

        val flags = adminManager.state.value.featureFlags
        assertEquals(initialCount + 1, flags.size)

        val newFlag = flags.last()
        assertEquals("test_flag", newFlag.name)
        assertEquals("A test feature flag", newFlag.description)
        assertFalse(newFlag.enabled)
        assertEquals(0, newFlag.rolloutPercent)
    }

    @Test
    fun `toggleFeatureFlag flips enabled state`() {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.createFeatureFlag("toggle_test", "Toggle test")

        val flagId = adminManager.state.value.featureFlags.last().id
        assertFalse(adminManager.state.value.featureFlags.last().enabled)

        adminManager.toggleFeatureFlag(flagId)
        assertTrue(adminManager.state.value.featureFlags.find { it.id == flagId }!!.enabled)

        adminManager.toggleFeatureFlag(flagId)
        assertFalse(adminManager.state.value.featureFlags.find { it.id == flagId }!!.enabled)
    }

    @Test
    fun `deleteFeatureFlag removes flag from list`() {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.createFeatureFlag("to_delete", "Will be deleted")

        val flagId = adminManager.state.value.featureFlags.last().id
        val countBefore = adminManager.state.value.featureFlags.size

        adminManager.deleteFeatureFlag(flagId)

        assertEquals(countBefore - 1, adminManager.state.value.featureFlags.size)
        assertNull(adminManager.state.value.featureFlags.find { it.id == flagId })
    }

    @Test
    fun `updateFlagRolloutPercent clamps to 0-100`() {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.createFeatureFlag("rollout_test", "Rollout test")

        val flagId = adminManager.state.value.featureFlags.last().id

        adminManager.updateFlagRolloutPercent(flagId, 150)
        assertEquals(100, adminManager.state.value.featureFlags.find { it.id == flagId }!!.rolloutPercent)

        adminManager.updateFlagRolloutPercent(flagId, -10)
        assertEquals(0, adminManager.state.value.featureFlags.find { it.id == flagId }!!.rolloutPercent)

        adminManager.updateFlagRolloutPercent(flagId, 50)
        assertEquals(50, adminManager.state.value.featureFlags.find { it.id == flagId }!!.rolloutPercent)
    }

    @Test
    fun `isFlagEnabledForUser returns false for disabled flag`() {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.createFeatureFlag("disabled_flag", "Disabled")

        val flagId = adminManager.state.value.featureFlags.last().id
        assertFalse(adminManager.isFlagEnabledForUser(flagId, "pro_monthly", "user-1"))
    }

    @Test
    fun `isFlagEnabledForUser returns false for non-existent flag`() {
        assertFalse(adminManager.isFlagEnabledForUser("nonexistent", "free", "user-1"))
    }

    // -----------------------------------------------------------------------
    //  Audit Log
    // -----------------------------------------------------------------------

    @Test
    fun `operations generate audit log entries`() {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.createFeatureFlag("audit_test", "Audit test")

        val logs = adminManager.state.value.auditLogs
        assertTrue(logs.isNotEmpty())
        assertTrue(logs.any { it.action.contains("Created feature flag") })
    }

    @Test
    fun `filterAuditLogs by action type`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        // Generate several log entries
        adminManager.createFeatureFlag("flag1", "desc1")
        adminManager.createFeatureFlag("flag2", "desc2")

        val flagId = adminManager.state.value.featureFlags.first().id
        adminManager.toggleFeatureFlag(flagId)

        adminManager.filterAuditLogs(actionType = "Toggled")

        val logs = adminManager.state.value.auditLogs
        assertTrue(logs.all { it.action.contains("Toggled", ignoreCase = true) })
    }

    @Test
    fun `filterAuditLogs by date range`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.createFeatureFlag("time_test", "Time test")

        val now = System.currentTimeMillis()
        adminManager.filterAuditLogs(startDate = now - 60_000, endDate = now + 60_000)

        val logs = adminManager.state.value.auditLogs
        assertTrue(logs.all { it.timestamp in (now - 60_000)..(now + 60_000) })
    }

    // -----------------------------------------------------------------------
    //  Analytics Snapshot
    // -----------------------------------------------------------------------

    @Test
    fun `loadAnalytics populates analytics when admin`() = runTest {
        adminManager.setCurrentUserRole("ADMIN")
        adminManager.loadUsers()
        advanceUntilIdle()

        adminManager.loadAnalytics()
        advanceUntilIdle()

        val analytics = adminManager.state.value.analytics
        assertNotNull(analytics)
        assertTrue(analytics!!.dau >= 0)
        assertTrue(analytics.mau >= 0)
        assertTrue(analytics.totalRevenue >= 0.0)
        assertTrue(analytics.apiCallsToday >= 0)
        assertTrue(analytics.apiCallsByModel.isNotEmpty())
    }

    @Test
    fun `analytics not loaded for non-admin`() = runTest {
        adminManager.loadAnalytics()
        advanceUntilIdle()

        assertNull(adminManager.state.value.analytics)
        assertEquals("Access denied: admin privileges required", adminManager.error.value)
    }

    // -----------------------------------------------------------------------
    //  Data Model Tests
    // -----------------------------------------------------------------------

    @Test
    fun `AdminUser data class fields`() {
        val user = AdminUser(
            id = "u001",
            email = "test@example.com",
            name = "Test User",
            plan = "pro_monthly",
            status = "active",
            lastLogin = System.currentTimeMillis(),
            totalSessions = 42,
            totalTokensUsed = 500_000L
        )
        assertEquals("u001", user.id)
        assertEquals("pro_monthly", user.plan)
        assertEquals(42, user.totalSessions)
        assertEquals(500_000L, user.totalTokensUsed)
    }

    @Test
    fun `AdminTab enum has all expected values`() {
        val tabs = AdminTab.entries
        assertEquals(6, tabs.size)
        assertTrue(tabs.contains(AdminTab.DASHBOARD))
        assertTrue(tabs.contains(AdminTab.USERS))
        assertTrue(tabs.contains(AdminTab.ANALYTICS))
        assertTrue(tabs.contains(AdminTab.FEATURE_FLAGS))
        assertTrue(tabs.contains(AdminTab.AUDIT_LOG))
        assertTrue(tabs.contains(AdminTab.SYSTEM))
    }

    @Test
    fun `PushNotification defaults`() {
        val notification = PushNotification(
            title = "Test",
            body = "Hello",
            target = NotificationTarget.All
        )
        assertNotNull(notification.id)
        assertTrue(notification.sentAt > 0)
        assertEquals(NotificationStatus.PENDING, notification.status)
    }

    @Test
    fun `ModerationStatus enum has all values`() {
        val statuses = ModerationStatus.entries
        assertEquals(4, statuses.size)
        assertTrue(statuses.contains(ModerationStatus.PENDING))
        assertTrue(statuses.contains(ModerationStatus.APPROVED))
        assertTrue(statuses.contains(ModerationStatus.REJECTED))
        assertTrue(statuses.contains(ModerationStatus.ESCALATED))
    }
}
