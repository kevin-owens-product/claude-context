package com.claudecontext.localdev.service.billing

import com.claudecontext.localdev.data.models.AiMode
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Gates premium features behind subscription status.
 * Free tier: Agent, Debug, Plan modes only
 * Paid tier: + Swarm, Queue, unlimited sessions, multi-model routing, export/import
 */
@Singleton
class BillingGate @Inject constructor(
    private val billingService: BillingService
) {

    companion object {
        private val FREE_MODES = setOf(AiMode.AGENT, AiMode.DEBUG, AiMode.PLAN, AiMode.SESSION, AiMode.CONTEXT, AiMode.DESIGN)
        private val PREMIUM_MODES = setOf(AiMode.SWARM, AiMode.QUEUE)

        private const val FREE_SESSIONS_LIMIT = 5
        private const val FREE_MODELS_LIMIT = 2
        private const val FREE_DAILY_MESSAGES = 50
    }

    data class GateResult(
        val allowed: Boolean,
        val reason: String? = null,
        val upgradeRequired: Boolean = false
    )

    fun isModeAllowed(mode: AiMode): GateResult {
        if (mode in FREE_MODES) return GateResult(allowed = true)
        if (mode in PREMIUM_MODES && billingService.isSubscribed()) {
            return GateResult(allowed = true)
        }
        return GateResult(
            allowed = false,
            reason = "${mode.displayName} mode requires a Pro subscription",
            upgradeRequired = true
        )
    }

    fun isFeatureAllowed(feature: PremiumFeature): GateResult {
        if (billingService.isSubscribed()) return GateResult(allowed = true)

        return when (feature) {
            PremiumFeature.MULTI_MODEL_ROUTING -> GateResult(
                allowed = false,
                reason = "Multi-model routing requires Pro",
                upgradeRequired = true
            )
            PremiumFeature.UNLIMITED_SESSIONS -> GateResult(
                allowed = false,
                reason = "Free tier limited to $FREE_SESSIONS_LIMIT sessions",
                upgradeRequired = true
            )
            PremiumFeature.SESSION_EXPORT -> GateResult(
                allowed = false,
                reason = "Session export requires Pro",
                upgradeRequired = true
            )
            PremiumFeature.CUSTOM_THEMES -> GateResult(
                allowed = false,
                reason = "Custom themes require Pro",
                upgradeRequired = true
            )
            PremiumFeature.BRANCHING -> GateResult(
                allowed = false,
                reason = "Conversation branching requires Pro",
                upgradeRequired = true
            )
            PremiumFeature.ADVANCED_CONTEXT -> GateResult(
                allowed = false,
                reason = "Advanced context strategies require Pro",
                upgradeRequired = true
            )
        }
    }

    fun getSessionLimit(): Int {
        return if (billingService.isSubscribed()) Int.MAX_VALUE else FREE_SESSIONS_LIMIT
    }

    fun getModelLimit(): Int {
        return if (billingService.isSubscribed()) Int.MAX_VALUE else FREE_MODELS_LIMIT
    }

    fun getDailyMessageLimit(): Int {
        return if (billingService.isSubscribed()) Int.MAX_VALUE else FREE_DAILY_MESSAGES
    }
}

enum class PremiumFeature {
    MULTI_MODEL_ROUTING,
    UNLIMITED_SESSIONS,
    SESSION_EXPORT,
    CUSTOM_THEMES,
    BRANCHING,
    ADVANCED_CONTEXT
}
