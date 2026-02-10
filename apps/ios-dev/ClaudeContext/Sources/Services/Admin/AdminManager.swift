import Foundation
import Combine

/// Manages admin dashboard operations: user management, analytics, feature flags, audit logs, and system health.
@MainActor
class AdminManager: ObservableObject {

    @Published var state = AdminState()

    private let baseURL = "https://api.claudecontext.com/v1/admin"
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    init() {
        decoder.dateDecodingStrategy = .iso8601
        encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - Dashboard

    func fetchDashboard() async {
        state.isLoading = true
        state.error = nil

        do {
            let data = try await performRequest(endpoint: "/dashboard", method: "GET")
            let dashboard = try decoder.decode(DashboardResponse.self, from: data)

            state.totalUsers = dashboard.totalUsers
            state.activeUsers = dashboard.activeUsers
            state.revenue = dashboard.revenue
            state.analytics = dashboard.analytics
            state.recentAuditLogs = dashboard.recentAuditLogs
            state.systemHealth = dashboard.systemHealth
            state.isLoading = false
        } catch {
            state.isLoading = false
            state.error = mapError(error)
        }
    }

    // MARK: - User Management

    func fetchUsers(query: String = "") async {
        state.isLoadingUsers = true
        state.error = nil

        do {
            let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let endpoint = query.isEmpty ? "/users" : "/users?q=\(encodedQuery)"
            let data = try await performRequest(endpoint: endpoint, method: "GET")
            let response = try decoder.decode(UsersResponse.self, from: data)

            state.users = response.users
            state.totalUserCount = response.total
            state.isLoadingUsers = false
        } catch {
            state.isLoadingUsers = false
            state.error = mapError(error)
        }
    }

    func toggleUserStatus(_ userId: String) async {
        state.error = nil

        guard let index = state.users.firstIndex(where: { $0.id == userId }) else { return }
        let currentStatus = state.users[index].status

        let newStatus: AdminUser.UserStatus = (currentStatus == .active) ? .suspended : .active
        state.users[index].status = newStatus

        do {
            let body: [String: String] = ["status": newStatus.rawValue]
            let bodyData = try JSONSerialization.data(withJSONObject: body)

            var request = try buildRequest(endpoint: "/users/\(userId)/status", method: "PATCH")
            request.httpBody = bodyData

            let (_, response) = try await URLSession.shared.data(for: request)
            try validateHTTPResponse(response)
        } catch {
            state.users[index].status = currentStatus
            state.error = mapError(error)
        }
    }

    // MARK: - Analytics

    func fetchAnalytics(period: AnalyticsPeriod = .week) async {
        state.isLoadingAnalytics = true
        state.error = nil

        do {
            let data = try await performRequest(endpoint: "/analytics?period=\(period.rawValue)", method: "GET")
            let snapshot = try decoder.decode(AnalyticsSnapshot.self, from: data)

            state.analytics = snapshot
            state.selectedPeriod = period
            state.isLoadingAnalytics = false
        } catch {
            state.isLoadingAnalytics = false
            state.error = mapError(error)
        }
    }

    // MARK: - Feature Flags

    func fetchFeatureFlags() async {
        state.error = nil

        do {
            let data = try await performRequest(endpoint: "/feature-flags", method: "GET")
            let flags = try decoder.decode([FeatureFlag].self, from: data)
            state.featureFlags = flags
        } catch {
            state.error = mapError(error)
        }
    }

    func createFeatureFlag(_ flag: FeatureFlag) async {
        state.error = nil

        do {
            let bodyData = try encoder.encode(flag)

            var request = try buildRequest(endpoint: "/feature-flags", method: "POST")
            request.httpBody = bodyData

            let (data, response) = try await URLSession.shared.data(for: request)
            try validateHTTPResponse(response)

            let created = try decoder.decode(FeatureFlag.self, from: data)
            state.featureFlags.append(created)
        } catch {
            state.error = mapError(error)
        }
    }

    func toggleFeatureFlag(_ flagId: String) async {
        state.error = nil

        guard let index = state.featureFlags.firstIndex(where: { $0.id == flagId }) else { return }
        let previousValue = state.featureFlags[index].isEnabled

        state.featureFlags[index].isEnabled.toggle()

        do {
            let body: [String: Bool] = ["isEnabled": state.featureFlags[index].isEnabled]
            let bodyData = try JSONSerialization.data(withJSONObject: body)

            var request = try buildRequest(endpoint: "/feature-flags/\(flagId)/toggle", method: "PATCH")
            request.httpBody = bodyData

            let (_, response) = try await URLSession.shared.data(for: request)
            try validateHTTPResponse(response)
        } catch {
            state.featureFlags[index].isEnabled = previousValue
            state.error = mapError(error)
        }
    }

    func deleteFeatureFlag(_ flagId: String) async {
        state.error = nil

        let removed = state.featureFlags.first(where: { $0.id == flagId })
        state.featureFlags.removeAll { $0.id == flagId }

        do {
            _ = try await performRequest(endpoint: "/feature-flags/\(flagId)", method: "DELETE")
        } catch {
            if let removed {
                state.featureFlags.append(removed)
            }
            state.error = mapError(error)
        }
    }

    // MARK: - Audit Logs

    func fetchAuditLogs(filter: AuditLogFilter = AuditLogFilter()) async {
        state.isLoadingAuditLogs = true
        state.error = nil

        do {
            var queryItems: [String] = []

            if let action = filter.action {
                queryItems.append("action=\(action)")
            }
            if let userId = filter.userId {
                queryItems.append("userId=\(userId)")
            }
            if let startDate = filter.startDate {
                queryItems.append("startDate=\(ISO8601DateFormatter().string(from: startDate))")
            }
            if let endDate = filter.endDate {
                queryItems.append("endDate=\(ISO8601DateFormatter().string(from: endDate))")
            }
            queryItems.append("page=\(filter.page)")
            queryItems.append("limit=\(filter.limit)")

            let queryString = queryItems.isEmpty ? "" : "?\(queryItems.joined(separator: "&"))"
            let data = try await performRequest(endpoint: "/audit-logs\(queryString)", method: "GET")
            let response = try decoder.decode(AuditLogResponse.self, from: data)

            state.auditLogs = response.logs
            state.totalAuditLogCount = response.total
            state.isLoadingAuditLogs = false
        } catch {
            state.isLoadingAuditLogs = false
            state.error = mapError(error)
        }
    }

    // MARK: - System Health

    func fetchSystemHealth() async {
        state.isLoadingHealth = true
        state.error = nil

        do {
            let data = try await performRequest(endpoint: "/system/health", method: "GET")
            let health = try decoder.decode(SystemHealth.self, from: data)

            state.systemHealth = health
            state.isLoadingHealth = false
        } catch {
            state.isLoadingHealth = false
            state.error = mapError(error)
        }
    }

    // MARK: - Private Helpers

    private func performRequest(endpoint: String, method: String, body: Data? = nil) async throws -> Data {
        var request = try buildRequest(endpoint: endpoint, method: method)
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(response)
        return data
    }

    private func buildRequest(endpoint: String, method: String) throws -> URLRequest {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw AdminError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        if let token = KeychainHelper.shared.read(key: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func validateHTTPResponse(_ response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AdminError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
            return
        case 401:
            throw AdminError.unauthorized
        case 403:
            throw AdminError.forbidden
        case 404:
            throw AdminError.notFound
        case 429:
            throw AdminError.rateLimited
        case 500...599:
            throw AdminError.serverError(httpResponse.statusCode)
        default:
            throw AdminError.unexpectedStatus(httpResponse.statusCode)
        }
    }

    private func mapError(_ error: Error) -> String {
        if let adminError = error as? AdminError {
            return adminError.localizedDescription
        }
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet:
                return "No internet connection."
            case .timedOut:
                return "Request timed out."
            default:
                return "Network error: \(urlError.localizedDescription)"
            }
        }
        return "An unexpected error occurred: \(error.localizedDescription)"
    }
}

// MARK: - Data Models

struct AdminState {
    var isLoading = false
    var isLoadingUsers = false
    var isLoadingAnalytics = false
    var isLoadingAuditLogs = false
    var isLoadingHealth = false
    var error: String?
    var selectedTab: AdminTab = .dashboard

    var totalUsers: Int = 0
    var activeUsers: Int = 0
    var revenue: Double = 0.0

    var users: [AdminUser] = []
    var totalUserCount: Int = 0

    var analytics: AnalyticsSnapshot?
    var selectedPeriod: AnalyticsPeriod = .week

    var featureFlags: [FeatureFlag] = []
    var auditLogs: [AuditLogEntry] = []
    var totalAuditLogCount: Int = 0

    var systemHealth: SystemHealth?
    var recentAuditLogs: [AuditLogEntry] = []
}

enum AdminTab: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case users = "Users"
    case analytics = "Analytics"
    case featureFlags = "Feature Flags"
    case auditLogs = "Audit Logs"
    case systemHealth = "System Health"

    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .dashboard: return "square.grid.2x2"
        case .users: return "person.3"
        case .analytics: return "chart.bar"
        case .featureFlags: return "flag"
        case .auditLogs: return "doc.text.magnifyingglass"
        case .systemHealth: return "heart.text.square"
        }
    }
}

struct AdminUser: Codable, Identifiable {
    let id: String
    var name: String
    var email: String
    var status: UserStatus
    var role: UserRole
    let createdAt: Date
    var lastLoginAt: Date?
    var subscriptionTier: String?
    var sessionsCount: Int
    var tokensUsed: Int

    enum UserStatus: String, Codable {
        case active
        case suspended
        case pending
        case deactivated
    }

    enum UserRole: String, Codable {
        case user
        case admin
        case superAdmin = "super_admin"
    }
}

struct AnalyticsSnapshot: Codable {
    let period: String
    let startDate: Date
    let endDate: Date
    let metrics: AnalyticsMetrics
    let dailyBreakdown: [DailyMetric]
    let topModels: [ModelUsage]
    let topFeatures: [FeatureUsage]

    struct AnalyticsMetrics: Codable {
        let totalSessions: Int
        let totalTokensUsed: Int
        let averageSessionDuration: Double
        let newUsers: Int
        let churnedUsers: Int
        let revenue: Double
        let apiCallCount: Int
        let errorRate: Double
    }

    struct DailyMetric: Codable, Identifiable {
        var id: String { date }
        let date: String
        let sessions: Int
        let tokensUsed: Int
        let activeUsers: Int
        let revenue: Double
    }

    struct ModelUsage: Codable, Identifiable {
        var id: String { modelId }
        let modelId: String
        let callCount: Int
        let tokensUsed: Int
        let averageLatency: Double
    }

    struct FeatureUsage: Codable, Identifiable {
        var id: String { feature }
        let feature: String
        let usageCount: Int
        let uniqueUsers: Int
    }
}

enum AnalyticsPeriod: String, CaseIterable {
    case day = "day"
    case week = "week"
    case month = "month"
    case quarter = "quarter"
    case year = "year"
}

struct FeatureFlag: Codable, Identifiable {
    let id: String
    var name: String
    var description: String
    var isEnabled: Bool
    var rolloutPercentage: Int
    var targetUserIds: [String]
    var targetTiers: [String]
    let createdAt: Date
    var updatedAt: Date
    var createdBy: String
}

struct AuditLogEntry: Codable, Identifiable {
    let id: String
    let timestamp: Date
    let action: String
    let actorId: String
    let actorEmail: String
    let targetType: String
    let targetId: String?
    let details: String
    let ipAddress: String
    let userAgent: String
    let severity: AuditSeverity

    enum AuditSeverity: String, Codable {
        case info
        case warning
        case critical
    }
}

struct AuditLogFilter {
    var action: String?
    var userId: String?
    var startDate: Date?
    var endDate: Date?
    var page: Int = 1
    var limit: Int = 50
}

struct SystemHealth: Codable {
    let status: HealthStatus
    let uptime: TimeInterval
    let version: String
    let services: [ServiceHealth]
    let metrics: SystemMetrics
    let lastCheckedAt: Date

    enum HealthStatus: String, Codable {
        case healthy
        case degraded
        case unhealthy
    }

    struct ServiceHealth: Codable, Identifiable {
        var id: String { name }
        let name: String
        let status: HealthStatus
        let responseTime: Double
        let errorRate: Double
        let lastCheckedAt: Date
        let details: String?
    }

    struct SystemMetrics: Codable {
        let cpuUsage: Double
        let memoryUsage: Double
        let diskUsage: Double
        let activeConnections: Int
        let requestsPerSecond: Double
        let averageResponseTime: Double
        let errorCount: Int
        let queueDepth: Int
    }
}

// MARK: - API Response Wrappers

private struct DashboardResponse: Codable {
    let totalUsers: Int
    let activeUsers: Int
    let revenue: Double
    let analytics: AnalyticsSnapshot?
    let recentAuditLogs: [AuditLogEntry]
    let systemHealth: SystemHealth?
}

private struct UsersResponse: Codable {
    let users: [AdminUser]
    let total: Int
}

private struct AuditLogResponse: Codable {
    let logs: [AuditLogEntry]
    let total: Int
}

// MARK: - Admin Errors

enum AdminError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case forbidden
    case notFound
    case rateLimited
    case serverError(Int)
    case unexpectedStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid request URL."
        case .invalidResponse:
            return "Invalid response from server."
        case .unauthorized:
            return "Authentication required. Please log in again."
        case .forbidden:
            return "Admin access required."
        case .notFound:
            return "The requested resource was not found."
        case .rateLimited:
            return "Too many requests. Please wait and try again."
        case .serverError(let code):
            return "Server error (\(code)). Please try again later."
        case .unexpectedStatus(let code):
            return "Unexpected response (\(code))."
        }
    }
}
