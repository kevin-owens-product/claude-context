package com.claudecontext.localdev.service.billing

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

data class SubscriptionState(
    val status: String = "inactive",
    val plan: String = "",
    val expiryDate: String = "",
    val isActive: Boolean = false,
    val isTrial: Boolean = false,
    val autoRenew: Boolean = false
)

data class SubscriptionPlan(
    val id: String,
    val name: String,
    val price: String,
    val period: BillingPeriod,
    val productId: String,
    val basePlanId: String
)

enum class BillingPeriod(val displayName: String) {
    MONTHLY("Monthly"),
    ANNUAL("Annual")
}

@Singleton
class BillingService @Inject constructor(
    @ApplicationContext private val context: Context
) : PurchasesUpdatedListener {

    private val _subscriptionState = MutableStateFlow(SubscriptionState())
    val subscriptionState: StateFlow<SubscriptionState> = _subscriptionState.asStateFlow()

    private val _availablePlans = MutableStateFlow<List<SubscriptionPlan>>(emptyList())
    val availablePlans: StateFlow<List<SubscriptionPlan>> = _availablePlans.asStateFlow()

    private val _billingError = MutableStateFlow<String?>(null)
    val billingError: StateFlow<String?> = _billingError.asStateFlow()

    private var billingClient: BillingClient? = null
    private var currentActivity: Activity? = null

    companion object {
        const val MONTHLY_PRODUCT_ID = "claude_context_monthly"
        const val ANNUAL_PRODUCT_ID = "claude_context_annual"
        const val MONTHLY_BASE_PLAN = "monthly-plan"
        const val ANNUAL_BASE_PLAN = "annual-plan"
        const val MONTHLY_PRICE = "$4.99"
        const val ANNUAL_PRICE = "$49.99"
    }

    fun initialize() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    querySubscriptions()
                    queryAvailablePlans()
                } else {
                    _billingError.value = "Billing setup failed: ${result.debugMessage}"
                }
            }

            override fun onBillingServiceDisconnected() {
                _billingError.value = "Billing service disconnected"
            }
        })
    }

    fun setActivity(activity: Activity?) {
        currentActivity = activity
    }

    private fun querySubscriptions() {
        val client = billingClient ?: return

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        client.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                val activeSub = purchases.firstOrNull { purchase ->
                    purchase.purchaseState == Purchase.PurchaseState.PURCHASED
                }

                if (activeSub != null) {
                    handleActivePurchase(activeSub)
                } else {
                    _subscriptionState.value = SubscriptionState(status = "inactive")
                }
            }
        }
    }

    private fun queryAvailablePlans() {
        val client = billingClient ?: return

        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(MONTHLY_PRODUCT_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(ANNUAL_PRODUCT_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        client.queryProductDetailsAsync(params) { result, productDetails ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                val plans = mutableListOf<SubscriptionPlan>()

                productDetails.forEach { product ->
                    product.subscriptionOfferDetails?.forEach { offer ->
                        val pricingPhase = offer.pricingPhases.pricingPhaseList.firstOrNull()
                        val isMonthly = offer.basePlanId == MONTHLY_BASE_PLAN

                        plans.add(SubscriptionPlan(
                            id = "${product.productId}:${offer.basePlanId}",
                            name = if (isMonthly) "Monthly" else "Annual",
                            price = pricingPhase?.formattedPrice ?: if (isMonthly) MONTHLY_PRICE else ANNUAL_PRICE,
                            period = if (isMonthly) BillingPeriod.MONTHLY else BillingPeriod.ANNUAL,
                            productId = product.productId,
                            basePlanId = offer.basePlanId
                        ))
                    }
                }

                // If no plans from store, provide defaults
                if (plans.isEmpty()) {
                    plans.addAll(listOf(
                        SubscriptionPlan(
                            id = "monthly",
                            name = "Monthly",
                            price = MONTHLY_PRICE,
                            period = BillingPeriod.MONTHLY,
                            productId = MONTHLY_PRODUCT_ID,
                            basePlanId = MONTHLY_BASE_PLAN
                        ),
                        SubscriptionPlan(
                            id = "annual",
                            name = "Annual (Save 17%)",
                            price = ANNUAL_PRICE,
                            period = BillingPeriod.ANNUAL,
                            productId = ANNUAL_PRODUCT_ID,
                            basePlanId = ANNUAL_BASE_PLAN
                        )
                    ))
                }

                _availablePlans.value = plans
            }
        }
    }

    fun startSubscription(planId: String) {
        val client = billingClient ?: run {
            _billingError.value = "Billing not initialized"
            return
        }
        val activity = currentActivity ?: run {
            _billingError.value = "No activity available"
            return
        }

        val productId = when {
            planId.contains("monthly") || planId == "monthly" -> MONTHLY_PRODUCT_ID
            planId.contains("annual") || planId == "annual" -> ANNUAL_PRODUCT_ID
            else -> planId.substringBefore(":")
        }
        val basePlanId = when {
            planId.contains("monthly") || planId == "monthly" -> MONTHLY_BASE_PLAN
            planId.contains("annual") || planId == "annual" -> ANNUAL_BASE_PLAN
            else -> planId.substringAfter(":")
        }

        val productDetailsParams = QueryProductDetailsParams.newBuilder()
            .setProductList(listOf(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            ))
            .build()

        client.queryProductDetailsAsync(productDetailsParams) { result, productDetails ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK && productDetails.isNotEmpty()) {
                val product = productDetails.first()
                val offer = product.subscriptionOfferDetails?.find {
                    it.basePlanId == basePlanId
                } ?: product.subscriptionOfferDetails?.firstOrNull()

                if (offer != null) {
                    val flowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(listOf(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(product)
                                .setOfferToken(offer.offerToken)
                                .build()
                        ))
                        .build()

                    client.launchBillingFlow(activity, flowParams)
                } else {
                    _billingError.value = "No offer found for plan: $planId"
                }
            } else {
                _billingError.value = "Could not find subscription product"
            }
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: List<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases?.forEach { purchase ->
                    if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                        acknowledgePurchase(purchase)
                        handleActivePurchase(purchase)
                    }
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                _billingError.value = null // User cancelled, not an error
            }
            else -> {
                _billingError.value = "Purchase failed: ${result.debugMessage}"
            }
        }
    }

    private fun acknowledgePurchase(purchase: Purchase) {
        if (purchase.isAcknowledged) return

        val client = billingClient ?: return
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

        client.acknowledgePurchase(params) { result ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                _billingError.value = "Failed to acknowledge purchase"
            }
        }
    }

    private fun handleActivePurchase(purchase: Purchase) {
        val products = purchase.products
        val isMonthly = products.any { it == MONTHLY_PRODUCT_ID }
        val isAnnual = products.any { it == ANNUAL_PRODUCT_ID }

        _subscriptionState.value = SubscriptionState(
            status = "active",
            plan = when {
                isMonthly -> "monthly"
                isAnnual -> "annual"
                else -> "unknown"
            },
            expiryDate = "", // Managed by Play Store
            isActive = true,
            autoRenew = purchase.isAutoRenewing
        )
    }

    fun openManagementPortal() {
        // On Android, subscription management is through Google Play
        // Deep link to Play Store subscription management
        val activity = currentActivity ?: return
        try {
            val intent = android.content.Intent(
                android.content.Intent.ACTION_VIEW,
                android.net.Uri.parse("https://play.google.com/store/account/subscriptions")
            )
            activity.startActivity(intent)
        } catch (e: Exception) {
            _billingError.value = "Could not open subscription management"
        }
    }

    fun restorePurchases() {
        querySubscriptions()
    }

    fun clearError() {
        _billingError.value = null
    }

    fun destroy() {
        billingClient?.endConnection()
        billingClient = null
        currentActivity = null
    }
}
