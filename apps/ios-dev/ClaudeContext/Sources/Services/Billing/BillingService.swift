import Foundation
import StoreKit
import Combine

/// Manages in-app subscriptions via StoreKit 2.
@MainActor
class BillingService: ObservableObject {

    @Published var subscriptionState = SubscriptionState()
    @Published var availablePlans: [SubscriptionPlan] = []
    @Published var billingError: String?
    @Published var isPurchasing = false

    private var updateListenerTask: Task<Void, Error>?

    static let monthlyProductId = "claude_context_monthly"
    static let annualProductId = "claude_context_annual"

    struct SubscriptionState {
        var status: String = "inactive"
        var plan: String = ""
        var expiryDate: String = ""
        var isActive: Bool = false
        var isTrial: Bool = false
        var autoRenew: Bool = false
    }

    struct SubscriptionPlan: Identifiable {
        let id: String
        let name: String
        let price: String
        let period: BillingPeriod
        let product: Product?
        let savings: String?
    }

    enum BillingPeriod: String {
        case monthly = "Monthly"
        case annual = "Annual"
    }

    init() {
        updateListenerTask = listenForTransactions()
    }

    deinit {
        updateListenerTask?.cancel()
    }

    func initialize() async {
        await loadProducts()
        await checkCurrentEntitlements()
    }

    // MARK: - Load Products

    func loadProducts() async {
        do {
            let productIds = [Self.monthlyProductId, Self.annualProductId]
            let products = try await Product.products(for: productIds)

            var plans: [SubscriptionPlan] = []

            for product in products {
                let isMonthly = product.id == Self.monthlyProductId
                plans.append(SubscriptionPlan(
                    id: product.id,
                    name: isMonthly ? "Monthly" : "Annual (Save 17%)",
                    price: product.displayPrice,
                    period: isMonthly ? .monthly : .annual,
                    product: product,
                    savings: isMonthly ? nil : "Save 17%"
                ))
            }

            // Fallback if products not available (e.g. simulator)
            if plans.isEmpty {
                plans = [
                    SubscriptionPlan(
                        id: "monthly",
                        name: "Monthly",
                        price: "$4.99",
                        period: .monthly,
                        product: nil,
                        savings: nil
                    ),
                    SubscriptionPlan(
                        id: "annual",
                        name: "Annual (Save 17%)",
                        price: "$49.99",
                        period: .annual,
                        product: nil,
                        savings: "Save 17%"
                    )
                ]
            }

            availablePlans = plans.sorted { $0.period == .monthly && $1.period == .annual }
        } catch {
            billingError = "Failed to load products: \(error.localizedDescription)"
            // Provide defaults
            availablePlans = [
                SubscriptionPlan(id: "monthly", name: "Monthly", price: "$4.99", period: .monthly, product: nil, savings: nil),
                SubscriptionPlan(id: "annual", name: "Annual (Save 17%)", price: "$49.99", period: .annual, product: nil, savings: "Save 17%")
            ]
        }
    }

    // MARK: - Purchase

    func purchase(plan: SubscriptionPlan) async {
        guard let product = plan.product else {
            billingError = "Product not available for purchase"
            return
        }

        isPurchasing = true
        defer { isPurchasing = false }

        do {
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                await handleTransaction(transaction)
                await transaction.finish()

            case .userCancelled:
                break

            case .pending:
                billingError = "Purchase is pending approval"

            @unknown default:
                billingError = "Unknown purchase result"
            }
        } catch {
            billingError = "Purchase failed: \(error.localizedDescription)"
        }
    }

    func startSubscription(_ planId: String) async {
        if let plan = availablePlans.first(where: { $0.id == planId }) {
            await purchase(plan: plan)
        } else if let plan = availablePlans.first(where: {
            (planId.contains("monthly") && $0.period == .monthly) ||
            (planId.contains("annual") && $0.period == .annual)
        }) {
            await purchase(plan: plan)
        }
    }

    // MARK: - Restore

    func restorePurchases() async {
        do {
            try await AppStore.sync()
            await checkCurrentEntitlements()
        } catch {
            billingError = "Restore failed: \(error.localizedDescription)"
        }
    }

    // MARK: - Manage Subscription

    func openManagementPortal() async {
        if let windowScene = await UIApplication.shared.connectedScenes.first as? UIWindowScene {
            do {
                try await AppStore.showManageSubscriptions(in: windowScene)
            } catch {
                billingError = "Could not open subscription management"
            }
        }
    }

    // MARK: - Check Entitlements

    func checkCurrentEntitlements() async {
        var hasActiveSubscription = false

        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result) {
                if transaction.productID == Self.monthlyProductId ||
                   transaction.productID == Self.annualProductId {
                    hasActiveSubscription = true
                    await handleTransaction(transaction)
                }
            }
        }

        if !hasActiveSubscription {
            subscriptionState = SubscriptionState(status: "inactive")
        }
    }

    // MARK: - Transaction Handling

    private func handleTransaction(_ transaction: Transaction) async {
        let isMonthly = transaction.productID == Self.monthlyProductId

        let formatter = DateFormatter()
        formatter.dateStyle = .medium

        subscriptionState = SubscriptionState(
            status: "active",
            plan: isMonthly ? "monthly" : "annual",
            expiryDate: transaction.expirationDate.map { formatter.string(from: $0) } ?? "",
            isActive: true,
            isTrial: transaction.offerType == .introductory,
            autoRenew: transaction.revocationDate == nil
        )
    }

    private func listenForTransactions() -> Task<Void, Error> {
        Task { [weak self] in
            for await result in Transaction.updates {
                if let transaction = try? await self?.checkVerified(result) {
                    await self?.handleTransaction(transaction)
                    await transaction.finish()
                }
            }
        }
    }

    private func checkVerified<T>(_ result: StoreKit.VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw BillingError.verificationFailed
        case .verified(let safe):
            return safe
        }
    }

    func clearError() {
        billingError = nil
    }
}

enum BillingError: LocalizedError {
    case verificationFailed
    case productNotFound

    var errorDescription: String? {
        switch self {
        case .verificationFailed: return "Transaction verification failed"
        case .productNotFound: return "Product not found"
        }
    }
}
