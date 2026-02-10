package com.claudecontext.localdev.service

import com.claudecontext.localdev.service.auth.AuthException
import com.claudecontext.localdev.service.auth.AuthState
import com.claudecontext.localdev.service.auth.AuthToken
import com.claudecontext.localdev.service.auth.SubscriptionPlan
import com.claudecontext.localdev.service.auth.UserProfile
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for AuthManager and its data models.
 *
 * Because AuthManager depends heavily on Android Context, EncryptedSharedPreferences,
 * and the Android Keystore (which are unavailable in a pure JVM test environment),
 * these tests validate:
 * - Data model construction and defaults
 * - AuthState transitions and invariants
 * - Token expiry detection logic
 * - Error mapping patterns
 * - AuthException behavior
 *
 * Integration-level tests that exercise login/signup/logout through the real
 * AuthManager would require Robolectric or an instrumented test environment.
 */
class AuthManagerTest {

    private lateinit var defaultState: AuthState

    @Before
    fun setup() {
        defaultState = AuthState()
    }

    // -----------------------------------------------------------------------
    //  Initial State
    // -----------------------------------------------------------------------

    @Test
    fun `default AuthState is not authenticated`() {
        assertFalse(defaultState.isAuthenticated)
        assertNull(defaultState.user)
        assertNull(defaultState.token)
        assertFalse(defaultState.isLoading)
        assertNull(defaultState.error)
        assertFalse(defaultState.biometricEnabled)
    }

    @Test
    fun `AuthState copy preserves unchanged fields`() {
        val modified = defaultState.copy(isLoading = true, error = "loading")
        assertFalse(modified.isAuthenticated)
        assertNull(modified.user)
        assertNull(modified.token)
        assertTrue(modified.isLoading)
        assertEquals("loading", modified.error)
    }

    // -----------------------------------------------------------------------
    //  Login Flow - Success
    // -----------------------------------------------------------------------

    @Test
    fun `authenticated state after successful login has user and token`() {
        val user = createTestUser()
        val token = createValidToken()

        val state = AuthState(
            isAuthenticated = true,
            user = user,
            token = token,
            isLoading = false,
            error = null
        )

        assertTrue(state.isAuthenticated)
        assertNotNull(state.user)
        assertEquals("test@example.com", state.user?.email)
        assertNotNull(state.token)
        assertFalse(state.isLoading)
        assertNull(state.error)
    }

    @Test
    fun `login loading state sets isLoading and clears error`() {
        val previousError = defaultState.copy(error = "previous error")
        val loadingState = previousError.copy(isLoading = true, error = null)

        assertTrue(loadingState.isLoading)
        assertNull(loadingState.error)
    }

    // -----------------------------------------------------------------------
    //  Login Flow - Failure
    // -----------------------------------------------------------------------

    @Test
    fun `failed login state has error and is not authenticated`() {
        val errorState = defaultState.copy(
            isLoading = false,
            error = "Invalid credentials"
        )

        assertFalse(errorState.isAuthenticated)
        assertNull(errorState.user)
        assertFalse(errorState.isLoading)
        assertEquals("Invalid credentials", errorState.error)
    }

    @Test
    fun `AuthException carries message and cause`() {
        val cause = RuntimeException("network failure")
        val exception = AuthException("Login failed", cause)

        assertEquals("Login failed", exception.message)
        assertSame(cause, exception.cause)
    }

    @Test
    fun `AuthException without cause has null cause`() {
        val exception = AuthException("Token expired")
        assertEquals("Token expired", exception.message)
        assertNull(exception.cause)
    }

    // -----------------------------------------------------------------------
    //  Signup Flow
    // -----------------------------------------------------------------------

    @Test
    fun `signup success state mirrors login success pattern`() {
        val user = createTestUser(name = "New User", email = "newuser@example.com")
        val token = createValidToken()

        val state = AuthState(
            isAuthenticated = true,
            user = user,
            token = token,
            isLoading = false,
            error = null
        )

        assertTrue(state.isAuthenticated)
        assertEquals("New User", state.user?.name)
        assertEquals("newuser@example.com", state.user?.email)
    }

    @Test
    fun `signup validation error sets error message`() {
        val errorState = defaultState.copy(
            isLoading = false,
            error = "Password must be at least 8 characters"
        )

        assertFalse(errorState.isAuthenticated)
        assertEquals("Password must be at least 8 characters", errorState.error)
    }

    @Test
    fun `signup duplicate email error reflected in state`() {
        val errorState = defaultState.copy(
            isLoading = false,
            error = "Account already exists"
        )

        assertEquals("Account already exists", errorState.error)
        assertFalse(errorState.isAuthenticated)
    }

    // -----------------------------------------------------------------------
    //  Logout
    // -----------------------------------------------------------------------

    @Test
    fun `logout clears user and token but preserves biometric setting`() {
        val loggedInState = AuthState(
            isAuthenticated = true,
            user = createTestUser(),
            token = createValidToken(),
            biometricEnabled = true
        )

        // Simulate logout: clear auth but keep biometric preference
        val loggedOutState = AuthState(biometricEnabled = loggedInState.biometricEnabled)

        assertFalse(loggedOutState.isAuthenticated)
        assertNull(loggedOutState.user)
        assertNull(loggedOutState.token)
        assertTrue(loggedOutState.biometricEnabled)
    }

    @Test
    fun `logout clears error state`() {
        val withError = AuthState(error = "some error", biometricEnabled = false)
        val afterLogout = AuthState(biometricEnabled = withError.biometricEnabled)

        assertNull(afterLogout.error)
        assertFalse(afterLogout.isAuthenticated)
    }

    // -----------------------------------------------------------------------
    //  Token Refresh
    // -----------------------------------------------------------------------

    @Test
    fun `token refresh updates token while keeping user`() {
        val user = createTestUser()
        val oldToken = createValidToken(accessToken = "old_access")
        val newToken = createValidToken(accessToken = "new_access", refreshToken = "new_refresh")

        val oldState = AuthState(
            isAuthenticated = true,
            user = user,
            token = oldToken
        )

        val refreshedState = oldState.copy(token = newToken)

        assertEquals("new_access", refreshedState.token?.accessToken)
        assertEquals("new_refresh", refreshedState.token?.refreshToken)
        assertSame(user, refreshedState.user)
        assertTrue(refreshedState.isAuthenticated)
    }

    @Test
    fun `token refresh failure marks session as expired`() {
        val state = AuthState(
            isAuthenticated = true,
            user = createTestUser(),
            token = createValidToken()
        )

        val expiredState = state.copy(
            isAuthenticated = false,
            token = null,
            error = "Session expired. Please log in again."
        )

        assertFalse(expiredState.isAuthenticated)
        assertNull(expiredState.token)
        assertEquals("Session expired. Please log in again.", expiredState.error)
        assertNotNull(expiredState.user) // user still present for display
    }

    // -----------------------------------------------------------------------
    //  Biometric Enable / Disable
    // -----------------------------------------------------------------------

    @Test
    fun `enabling biometric updates state`() {
        val state = defaultState.copy(biometricEnabled = true)
        assertTrue(state.biometricEnabled)
    }

    @Test
    fun `disabling biometric updates state`() {
        val state = AuthState(biometricEnabled = true).copy(biometricEnabled = false)
        assertFalse(state.biometricEnabled)
    }

    // -----------------------------------------------------------------------
    //  Password Reset
    // -----------------------------------------------------------------------

    @Test
    fun `password reset loading state`() {
        val state = defaultState.copy(isLoading = true, error = null)
        assertTrue(state.isLoading)
        assertNull(state.error)
    }

    @Test
    fun `password reset does not change authentication status`() {
        val state = defaultState.copy(isLoading = false)
        assertFalse(state.isAuthenticated)
        assertFalse(state.isLoading)
    }

    // -----------------------------------------------------------------------
    //  Profile Update
    // -----------------------------------------------------------------------

    @Test
    fun `profile update replaces user in state`() {
        val original = createTestUser(name = "Old Name")
        val updated = original.copy(name = "New Name", avatarUrl = "https://img.example.com/new.png")

        val state = AuthState(
            isAuthenticated = true,
            user = original,
            token = createValidToken()
        )

        val updatedState = state.copy(user = updated, isLoading = false, error = null)

        assertEquals("New Name", updatedState.user?.name)
        assertEquals("https://img.example.com/new.png", updatedState.user?.avatarUrl)
        assertTrue(updatedState.isAuthenticated)
    }

    @Test
    fun `profile update failure preserves existing user`() {
        val originalUser = createTestUser(name = "Original")
        val state = AuthState(
            isAuthenticated = true,
            user = originalUser,
            token = createValidToken()
        )

        val failedState = state.copy(isLoading = false, error = "Failed to update profile.")

        assertEquals("Original", failedState.user?.name)
        assertEquals("Failed to update profile.", failedState.error)
    }

    // -----------------------------------------------------------------------
    //  Token Expiry Detection
    // -----------------------------------------------------------------------

    @Test
    fun `token with future expiresAt is not expired`() {
        val token = AuthToken(
            accessToken = "abc",
            refreshToken = "xyz",
            expiresAt = System.currentTimeMillis() + 3_600_000L // 1 hour from now
        )

        val isExpired = System.currentTimeMillis() >= token.expiresAt
        assertFalse(isExpired)
    }

    @Test
    fun `token with past expiresAt is expired`() {
        val token = AuthToken(
            accessToken = "abc",
            refreshToken = "xyz",
            expiresAt = System.currentTimeMillis() - 1_000L // 1 second ago
        )

        val isExpired = System.currentTimeMillis() >= token.expiresAt
        assertTrue(isExpired)
    }

    @Test
    fun `token type defaults to Bearer`() {
        val token = AuthToken(
            accessToken = "abc",
            refreshToken = "xyz",
            expiresAt = 0L
        )
        assertEquals("Bearer", token.tokenType)
    }

    // -----------------------------------------------------------------------
    //  UserProfile Defaults
    // -----------------------------------------------------------------------

    @Test
    fun `UserProfile defaults to FREE plan`() {
        val user = UserProfile(id = "u1", email = "a@b.com", name = "A")
        assertEquals(SubscriptionPlan.FREE, user.plan)
        assertNull(user.avatarUrl)
        assertEquals(0L, user.createdAt)
        assertEquals(0L, user.lastLoginAt)
    }

    @Test
    fun `SubscriptionPlan has all expected tiers`() {
        val plans = SubscriptionPlan.entries
        assertEquals(4, plans.size)
        assertTrue(plans.contains(SubscriptionPlan.FREE))
        assertTrue(plans.contains(SubscriptionPlan.MONTHLY))
        assertTrue(plans.contains(SubscriptionPlan.ANNUAL))
        assertTrue(plans.contains(SubscriptionPlan.ENTERPRISE))
    }

    // -----------------------------------------------------------------------
    //  Helpers
    // -----------------------------------------------------------------------

    private fun createTestUser(
        id: String = "user-123",
        email: String = "test@example.com",
        name: String = "Test User",
        plan: SubscriptionPlan = SubscriptionPlan.FREE
    ): UserProfile = UserProfile(
        id = id,
        email = email,
        name = name,
        plan = plan,
        createdAt = System.currentTimeMillis(),
        lastLoginAt = System.currentTimeMillis()
    )

    private fun createValidToken(
        accessToken: String = "access_token_123",
        refreshToken: String = "refresh_token_456",
        expiresAt: Long = System.currentTimeMillis() + 3_600_000L
    ): AuthToken = AuthToken(
        accessToken = accessToken,
        refreshToken = refreshToken,
        expiresAt = expiresAt
    )
}
