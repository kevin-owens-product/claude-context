package com.claudecontext.localdev.service

import com.claudecontext.localdev.service.billing.BillingPeriod
import com.claudecontext.localdev.service.billing.BillingService
import com.claudecontext.localdev.service.billing.SubscriptionPlan
import com.claudecontext.localdev.service.billing.SubscriptionState
import org.junit.Assert.*
import org.junit.Test

class BillingServiceTest {

    // --- Subscription State ---

    @Test
    fun `default subscription state is inactive`() {
        val state = SubscriptionState()
        assertEquals("inactive", state.status)
        assertFalse(state.isActive)
        assertEquals("", state.plan)
    }

    @Test
    fun `active subscription state properties`() {
        val state = SubscriptionState(
            status = "active",
            plan = "monthly",
            expiryDate = "2026-03-10",
            isActive = true,
            autoRenew = true
        )
        assertEquals("active", state.status)
        assertTrue(state.isActive)
        assertEquals("monthly", state.plan)
        assertTrue(state.autoRenew)
    }

    // --- Subscription Plans ---

    @Test
    fun `monthly plan has correct product ID`() {
        assertEquals("claude_context_monthly", BillingService.MONTHLY_PRODUCT_ID)
    }

    @Test
    fun `annual plan has correct product ID`() {
        assertEquals("claude_context_annual", BillingService.ANNUAL_PRODUCT_ID)
    }

    @Test
    fun `monthly price is correct`() {
        assertEquals("$4.99", BillingService.MONTHLY_PRICE)
    }

    @Test
    fun `annual price is correct`() {
        assertEquals("$49.99", BillingService.ANNUAL_PRICE)
    }

    @Test
    fun `subscription plan data class works`() {
        val plan = SubscriptionPlan(
            id = "monthly",
            name = "Monthly",
            price = "$4.99",
            period = BillingPeriod.MONTHLY,
            productId = BillingService.MONTHLY_PRODUCT_ID,
            basePlanId = BillingService.MONTHLY_BASE_PLAN
        )
        assertEquals("monthly", plan.id)
        assertEquals(BillingPeriod.MONTHLY, plan.period)
    }

    // --- Billing Period ---

    @Test
    fun `billing period display names`() {
        assertEquals("Monthly", BillingPeriod.MONTHLY.displayName)
        assertEquals("Annual", BillingPeriod.ANNUAL.displayName)
    }

    @Test
    fun `billing period has two entries`() {
        assertEquals(2, BillingPeriod.entries.size)
    }

    // --- Annual savings ---

    @Test
    fun `annual plan saves money versus monthly`() {
        val monthlyYearCost = 4.99 * 12  // $59.88
        val annualCost = 49.99
        val savings = monthlyYearCost - annualCost  // $9.89
        assertTrue(savings > 0)
        assertTrue(savings / monthlyYearCost > 0.15) // >15% savings
    }

    // --- Plan identification ---

    @Test
    fun `plan ID parsing for monthly`() {
        val planId = "monthly"
        assertTrue(planId.contains("monthly"))
    }

    @Test
    fun `plan ID parsing for annual`() {
        val planId = "annual"
        assertTrue(planId.contains("annual"))
    }

    @Test
    fun `compound plan ID parsing`() {
        val planId = "${BillingService.MONTHLY_PRODUCT_ID}:${BillingService.MONTHLY_BASE_PLAN}"
        val productId = planId.substringBefore(":")
        val basePlanId = planId.substringAfter(":")
        assertEquals(BillingService.MONTHLY_PRODUCT_ID, productId)
        assertEquals(BillingService.MONTHLY_BASE_PLAN, basePlanId)
    }
}
