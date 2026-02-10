package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.AiMode
import com.claudecontext.localdev.service.billing.BillingGate
import com.claudecontext.localdev.service.billing.BillingService
import com.claudecontext.localdev.service.billing.PremiumFeature
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * Comprehensive unit tests for BillingGate.
 *
 * BillingGate delegates subscription checks to BillingService.isSubscribed().
 * We mock BillingService to test both free-tier and premium-tier behavior
 * without requiring the Google Play Billing library at test time.
 */
class BillingGateTest {

    private lateinit var billingService: BillingService
    private lateinit var billingGate: BillingGate

    @Before
    fun setup() {
        billingService = mockk()
        // Default to free tier (not subscribed)
        every { billingService.isSubscribed() } returns false
        billingGate = BillingGate(billingService)
    }

    // =======================================================================
    //  Free Tier: Allowed Modes
    // =======================================================================

    @Test
    fun `free tier allows Agent mode`() {
        val result = billingGate.isModeAllowed(AiMode.AGENT)
        assertTrue(result.allowed)
        assertNull(result.reason)
        assertFalse(result.upgradeRequired)
    }

    @Test
    fun `free tier allows Debug mode`() {
        val result = billingGate.isModeAllowed(AiMode.DEBUG)
        assertTrue(result.allowed)
        assertNull(result.reason)
    }

    @Test
    fun `free tier allows Plan mode`() {
        val result = billingGate.isModeAllowed(AiMode.PLAN)
        assertTrue(result.allowed)
    }

    @Test
    fun `free tier allows Session mode`() {
        val result = billingGate.isModeAllowed(AiMode.SESSION)
        assertTrue(result.allowed)
    }

    @Test
    fun `free tier allows Context mode`() {
        val result = billingGate.isModeAllowed(AiMode.CONTEXT)
        assertTrue(result.allowed)
    }

    @Test
    fun `free tier allows Design mode`() {
        val result = billingGate.isModeAllowed(AiMode.DESIGN)
        assertTrue(result.allowed)
    }

    // =======================================================================
    //  Free Tier: Blocked Modes
    // =======================================================================

    @Test
    fun `free tier blocks Swarm mode`() {
        val result = billingGate.isModeAllowed(AiMode.SWARM)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertNotNull(result.reason)
        assertTrue(result.reason!!.contains("Swarm"))
        assertTrue(result.reason!!.contains("Pro"))
    }

    @Test
    fun `free tier blocks Queue mode`() {
        val result = billingGate.isModeAllowed(AiMode.QUEUE)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertNotNull(result.reason)
        assertTrue(result.reason!!.contains("Queue"))
    }

    // =======================================================================
    //  Premium Tier: All Modes Allowed
    // =======================================================================

    @Test
    fun `premium tier allows Swarm mode`() {
        every { billingService.isSubscribed() } returns true

        val result = billingGate.isModeAllowed(AiMode.SWARM)
        assertTrue(result.allowed)
        assertNull(result.reason)
        assertFalse(result.upgradeRequired)
    }

    @Test
    fun `premium tier allows Queue mode`() {
        every { billingService.isSubscribed() } returns true

        val result = billingGate.isModeAllowed(AiMode.QUEUE)
        assertTrue(result.allowed)
    }

    @Test
    fun `premium tier still allows all free modes`() {
        every { billingService.isSubscribed() } returns true

        val freeModes = listOf(AiMode.AGENT, AiMode.DEBUG, AiMode.PLAN, AiMode.SESSION, AiMode.CONTEXT, AiMode.DESIGN)
        for (mode in freeModes) {
            val result = billingGate.isModeAllowed(mode)
            assertTrue("$mode should be allowed for premium", result.allowed)
        }
    }

    @Test
    fun `premium tier allows every AiMode`() {
        every { billingService.isSubscribed() } returns true

        for (mode in AiMode.entries) {
            val result = billingGate.isModeAllowed(mode)
            assertTrue("${mode.name} should be allowed for premium", result.allowed)
        }
    }

    // =======================================================================
    //  Feature Gating: Free Tier
    // =======================================================================

    @Test
    fun `free tier blocks MULTI_MODEL_ROUTING`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.MULTI_MODEL_ROUTING)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertNotNull(result.reason)
        assertTrue(result.reason!!.contains("Multi-model"))
    }

    @Test
    fun `free tier blocks UNLIMITED_SESSIONS`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.UNLIMITED_SESSIONS)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertTrue(result.reason!!.contains("5 sessions"))
    }

    @Test
    fun `free tier blocks SESSION_EXPORT`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.SESSION_EXPORT)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertTrue(result.reason!!.contains("export"))
    }

    @Test
    fun `free tier blocks CUSTOM_THEMES`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.CUSTOM_THEMES)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertTrue(result.reason!!.contains("themes"))
    }

    @Test
    fun `free tier blocks BRANCHING`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.BRANCHING)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertTrue(result.reason!!.contains("branching"))
    }

    @Test
    fun `free tier blocks ADVANCED_CONTEXT`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.ADVANCED_CONTEXT)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertTrue(result.reason!!.contains("context"))
    }

    @Test
    fun `free tier blocks all premium features`() {
        for (feature in PremiumFeature.entries) {
            val result = billingGate.isFeatureAllowed(feature)
            assertFalse("${feature.name} should be blocked for free tier", result.allowed)
            assertTrue("${feature.name} should require upgrade", result.upgradeRequired)
        }
    }

    // =======================================================================
    //  Feature Gating: Premium Tier
    // =======================================================================

    @Test
    fun `premium tier allows all premium features`() {
        every { billingService.isSubscribed() } returns true

        for (feature in PremiumFeature.entries) {
            val result = billingGate.isFeatureAllowed(feature)
            assertTrue("${feature.name} should be allowed for premium", result.allowed)
            assertNull("${feature.name} should have no reason when allowed", result.reason)
            assertFalse("${feature.name} should not require upgrade", result.upgradeRequired)
        }
    }

    @Test
    fun `premium tier returns GateResult with allowed true for MULTI_MODEL_ROUTING`() {
        every { billingService.isSubscribed() } returns true

        val result = billingGate.isFeatureAllowed(PremiumFeature.MULTI_MODEL_ROUTING)
        assertTrue(result.allowed)
        assertFalse(result.upgradeRequired)
    }

    // =======================================================================
    //  Session / Model / Message Limits: Free Tier
    // =======================================================================

    @Test
    fun `free tier session limit is 5`() {
        assertEquals(5, billingGate.getSessionLimit())
    }

    @Test
    fun `free tier model limit is 2`() {
        assertEquals(2, billingGate.getModelLimit())
    }

    @Test
    fun `free tier daily message limit is 50`() {
        assertEquals(50, billingGate.getDailyMessageLimit())
    }

    // =======================================================================
    //  Session / Model / Message Limits: Premium Tier
    // =======================================================================

    @Test
    fun `premium tier session limit is MAX_VALUE`() {
        every { billingService.isSubscribed() } returns true
        assertEquals(Int.MAX_VALUE, billingGate.getSessionLimit())
    }

    @Test
    fun `premium tier model limit is MAX_VALUE`() {
        every { billingService.isSubscribed() } returns true
        assertEquals(Int.MAX_VALUE, billingGate.getModelLimit())
    }

    @Test
    fun `premium tier daily message limit is MAX_VALUE`() {
        every { billingService.isSubscribed() } returns true
        assertEquals(Int.MAX_VALUE, billingGate.getDailyMessageLimit())
    }

    // =======================================================================
    //  GateResult Structure
    // =======================================================================

    @Test
    fun `GateResult allowed has null reason and false upgradeRequired`() {
        val result = billingGate.isModeAllowed(AiMode.AGENT)
        assertTrue(result.allowed)
        assertNull(result.reason)
        assertFalse(result.upgradeRequired)
    }

    @Test
    fun `GateResult blocked has non-null reason and true upgradeRequired`() {
        val result = billingGate.isModeAllowed(AiMode.SWARM)
        assertFalse(result.allowed)
        assertNotNull(result.reason)
        assertTrue(result.upgradeRequired)
    }

    @Test
    fun `GateResult default values`() {
        val result = BillingGate.GateResult(allowed = true)
        assertTrue(result.allowed)
        assertNull(result.reason)
        assertFalse(result.upgradeRequired)
    }

    // =======================================================================
    //  PremiumFeature Enum
    // =======================================================================

    @Test
    fun `PremiumFeature enum has 6 entries`() {
        assertEquals(6, PremiumFeature.entries.size)
    }

    @Test
    fun `PremiumFeature contains all expected features`() {
        val expected = setOf(
            PremiumFeature.MULTI_MODEL_ROUTING,
            PremiumFeature.UNLIMITED_SESSIONS,
            PremiumFeature.SESSION_EXPORT,
            PremiumFeature.CUSTOM_THEMES,
            PremiumFeature.BRANCHING,
            PremiumFeature.ADVANCED_CONTEXT
        )
        assertEquals(expected, PremiumFeature.entries.toSet())
    }

    // =======================================================================
    //  Subscription Toggle Scenarios
    // =======================================================================

    @Test
    fun `switching from free to premium unlocks blocked mode`() {
        // Start as free
        every { billingService.isSubscribed() } returns false
        assertFalse(billingGate.isModeAllowed(AiMode.SWARM).allowed)

        // Upgrade to premium
        every { billingService.isSubscribed() } returns true
        assertTrue(billingGate.isModeAllowed(AiMode.SWARM).allowed)
    }

    @Test
    fun `switching from premium to free re-blocks premium mode`() {
        // Start as premium
        every { billingService.isSubscribed() } returns true
        assertTrue(billingGate.isModeAllowed(AiMode.QUEUE).allowed)

        // Downgrade to free
        every { billingService.isSubscribed() } returns false
        assertFalse(billingGate.isModeAllowed(AiMode.QUEUE).allowed)
        assertTrue(billingGate.isModeAllowed(AiMode.QUEUE).upgradeRequired)
    }
}
