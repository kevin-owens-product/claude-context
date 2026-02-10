package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.AiMode
import com.claudecontext.localdev.service.billing.BillingGate
import com.claudecontext.localdev.service.billing.BillingService
import com.claudecontext.localdev.service.billing.PremiumFeature
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class BillingGateTest {

    private lateinit var billingService: BillingService
    private lateinit var billingGate: BillingGate

    @Before
    fun setup() {
        billingService = BillingService()
        billingGate = BillingGate(billingService)
    }

    // --- Free Tier Mode Access ---

    @Test
    fun `free tier allows Agent mode`() {
        val result = billingGate.isModeAllowed(AiMode.AGENT)
        assertTrue(result.allowed)
        assertFalse(result.upgradeRequired)
    }

    @Test
    fun `free tier allows Debug mode`() {
        val result = billingGate.isModeAllowed(AiMode.DEBUG)
        assertTrue(result.allowed)
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

    // --- Premium Mode Gating ---

    @Test
    fun `free tier blocks Swarm mode`() {
        val result = billingGate.isModeAllowed(AiMode.SWARM)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
        assertNotNull(result.reason)
    }

    @Test
    fun `free tier blocks Queue mode`() {
        val result = billingGate.isModeAllowed(AiMode.QUEUE)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
    }

    // --- Feature Gating ---

    @Test
    fun `free tier blocks multi-model routing`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.MULTI_MODEL_ROUTING)
        assertFalse(result.allowed)
        assertTrue(result.upgradeRequired)
    }

    @Test
    fun `free tier blocks unlimited sessions`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.UNLIMITED_SESSIONS)
        assertFalse(result.allowed)
    }

    @Test
    fun `free tier blocks session export`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.SESSION_EXPORT)
        assertFalse(result.allowed)
    }

    @Test
    fun `free tier blocks custom themes`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.CUSTOM_THEMES)
        assertFalse(result.allowed)
    }

    @Test
    fun `free tier blocks branching`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.BRANCHING)
        assertFalse(result.allowed)
    }

    @Test
    fun `free tier blocks advanced context`() {
        val result = billingGate.isFeatureAllowed(PremiumFeature.ADVANCED_CONTEXT)
        assertFalse(result.allowed)
    }

    // --- Limits ---

    @Test
    fun `free tier has limited sessions`() {
        val limit = billingGate.getSessionLimit()
        assertEquals(5, limit)
    }

    @Test
    fun `free tier has limited models`() {
        val limit = billingGate.getModelLimit()
        assertEquals(2, limit)
    }

    @Test
    fun `free tier has daily message limit`() {
        val limit = billingGate.getDailyMessageLimit()
        assertEquals(50, limit)
    }

    // --- GateResult ---

    @Test
    fun `allowed result has no reason`() {
        val result = billingGate.isModeAllowed(AiMode.AGENT)
        assertTrue(result.allowed)
        assertNull(result.reason)
    }

    @Test
    fun `blocked result has reason and upgrade flag`() {
        val result = billingGate.isModeAllowed(AiMode.SWARM)
        assertFalse(result.allowed)
        assertNotNull(result.reason)
        assertTrue(result.upgradeRequired)
        assertTrue(result.reason!!.contains("Swarm"))
    }
}
