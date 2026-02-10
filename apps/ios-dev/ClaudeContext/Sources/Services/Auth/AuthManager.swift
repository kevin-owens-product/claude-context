import Foundation
import Combine
import LocalAuthentication

/// Manages authentication, token lifecycle, biometric unlock, and user profile operations.
@MainActor
class AuthManager: ObservableObject {

    @Published var state = AuthState()

    private let baseURL = "https://api.claudecontext.com/v1/auth"
    private let keychain = KeychainHelper.shared
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private var refreshTimer: Task<Void, Never>?

    // MARK: - Initialization

    init() {
        decoder.dateDecodingStrategy = .iso8601
        encoder.dateEncodingStrategy = .iso8601
        loadSavedAuth()
    }

    // MARK: - Login

    func login(email: String, password: String) async {
        state.isLoading = true
        state.error = nil

        do {
            let body: [String: String] = ["email": email, "password": password]
            let data = try await performRequest(endpoint: "/login", method: "POST", body: body)
            let response = try decoder.decode(AuthResponse.self, from: data)

            saveTokens(response.token)
            state.currentUser = response.user
            state.isAuthenticated = true
            state.isLoading = false

            scheduleTokenRefresh(expiresIn: response.token.expiresIn)
        } catch {
            state.isLoading = false
            state.error = mapError(error)
        }
    }

    // MARK: - Signup

    func signup(email: String, password: String, name: String) async {
        state.isLoading = true
        state.error = nil

        do {
            let body: [String: String] = ["email": email, "password": password, "name": name]
            let data = try await performRequest(endpoint: "/signup", method: "POST", body: body)
            let response = try decoder.decode(AuthResponse.self, from: data)

            saveTokens(response.token)
            state.currentUser = response.user
            state.isAuthenticated = true
            state.isLoading = false

            scheduleTokenRefresh(expiresIn: response.token.expiresIn)
        } catch {
            state.isLoading = false
            state.error = mapError(error)
        }
    }

    // MARK: - Logout

    func logout() {
        refreshTimer?.cancel()
        refreshTimer = nil

        keychain.delete(key: "access_token")
        keychain.delete(key: "refresh_token")
        keychain.delete(key: "user_profile")

        state = AuthState()
    }

    // MARK: - Token Refresh

    func refreshToken() async {
        guard let refreshTokenValue = keychain.read(key: "refresh_token") else {
            logout()
            return
        }

        do {
            let body: [String: String] = ["refreshToken": refreshTokenValue]
            let data = try await performRequest(endpoint: "/refresh", method: "POST", body: body)
            let token = try decoder.decode(AuthToken.self, from: data)

            saveTokens(token)
            scheduleTokenRefresh(expiresIn: token.expiresIn)
        } catch {
            logout()
        }
    }

    // MARK: - Biometric Authentication

    func enableBiometric() async -> Bool {
        let context = LAContext()
        var authError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
            state.error = "Biometric authentication is not available on this device."
            return false
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Enable biometric login for Claude Context"
            )

            if success {
                state.biometricEnabled = true
                keychain.save(key: "biometric_enabled", value: "true")
                return true
            }
            return false
        } catch {
            state.error = "Biometric enrollment failed: \(error.localizedDescription)"
            return false
        }
    }

    func authenticateWithBiometric() async -> Bool {
        guard state.biometricEnabled else {
            state.error = "Biometric authentication is not enabled."
            return false
        }

        let context = LAContext()
        var authError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
            state.error = "Biometric authentication is not available."
            return false
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Log in to Claude Context"
            )

            if success {
                loadSavedAuth()
                if state.isAuthenticated {
                    await refreshTokenIfNeeded()
                }
                return state.isAuthenticated
            }
            return false
        } catch {
            state.error = "Biometric authentication failed: \(error.localizedDescription)"
            return false
        }
    }

    // MARK: - Password Reset

    func resetPassword(email: String) async {
        state.isLoading = true
        state.error = nil

        do {
            let body: [String: String] = ["email": email]
            _ = try await performRequest(endpoint: "/reset-password", method: "POST", body: body)
            state.isLoading = false
            state.passwordResetSent = true
        } catch {
            state.isLoading = false
            state.error = mapError(error)
        }
    }

    // MARK: - Profile Management

    func updateProfile(_ profile: UserProfile) async {
        state.isLoading = true
        state.error = nil

        do {
            let bodyData = try encoder.encode(profile)
            let body = try JSONSerialization.jsonObject(with: bodyData) as? [String: Any] ?? [:]

            var request = try buildRequest(endpoint: "/profile", method: "PUT")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)
            try validateHTTPResponse(response)

            let updatedUser = try decoder.decode(UserProfile.self, from: data)
            state.currentUser = updatedUser
            state.isLoading = false

            if let encodedProfile = try? encoder.encode(updatedUser),
               let profileString = String(data: encodedProfile, encoding: .utf8) {
                keychain.save(key: "user_profile", value: profileString)
            }
        } catch {
            state.isLoading = false
            state.error = mapError(error)
        }
    }

    // MARK: - Token Expiry Check

    func checkTokenExpiry() -> Bool {
        guard let expiryString = keychain.read(key: "token_expiry"),
              let expiryInterval = TimeInterval(expiryString) else {
            return true
        }

        let expiryDate = Date(timeIntervalSince1970: expiryInterval)
        return expiryDate <= Date()
    }

    // MARK: - Private Helpers

    private func loadSavedAuth() {
        guard let accessToken = keychain.read(key: "access_token"),
              !accessToken.isEmpty else {
            return
        }

        state.biometricEnabled = keychain.read(key: "biometric_enabled") == "true"

        if let profileString = keychain.read(key: "user_profile"),
           let profileData = profileString.data(using: .utf8),
           let user = try? decoder.decode(UserProfile.self, from: profileData) {
            state.currentUser = user
            state.isAuthenticated = true

            if checkTokenExpiry() {
                Task { await refreshToken() }
            } else {
                scheduleTokenRefresh(expiresIn: remainingTokenLifetime())
            }
        }
    }

    private func saveTokens(_ token: AuthToken) {
        keychain.save(key: "access_token", value: token.accessToken)
        keychain.save(key: "refresh_token", value: token.refreshToken)

        let expiryDate = Date().addingTimeInterval(TimeInterval(token.expiresIn))
        keychain.save(key: "token_expiry", value: String(expiryDate.timeIntervalSince1970))

        if let user = state.currentUser,
           let data = try? encoder.encode(user),
           let string = String(data: data, encoding: .utf8) {
            keychain.save(key: "user_profile", value: string)
        }
    }

    private func scheduleTokenRefresh(expiresIn: Int) {
        refreshTimer?.cancel()

        let refreshDelay = max(TimeInterval(expiresIn) - 300, 60)

        refreshTimer = Task {
            try? await Task.sleep(nanoseconds: UInt64(refreshDelay * 1_000_000_000))
            guard !Task.isCancelled else { return }
            await refreshToken()
        }
    }

    private func refreshTokenIfNeeded() async {
        if checkTokenExpiry() {
            await refreshToken()
        }
    }

    private func remainingTokenLifetime() -> Int {
        guard let expiryString = keychain.read(key: "token_expiry"),
              let expiryInterval = TimeInterval(expiryString) else {
            return 0
        }
        let remaining = expiryInterval - Date().timeIntervalSince1970
        return max(Int(remaining), 0)
    }

    private func performRequest(endpoint: String, method: String, body: [String: String]) async throws -> Data {
        var request = try buildRequest(endpoint: endpoint, method: method)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(response)
        return data
    }

    private func buildRequest(endpoint: String, method: String) throws -> URLRequest {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw AuthError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        if let token = keychain.read(key: "access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func validateHTTPResponse(_ response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
            return
        case 401:
            throw AuthError.unauthorized
        case 403:
            throw AuthError.forbidden
        case 404:
            throw AuthError.notFound
        case 409:
            throw AuthError.conflict
        case 422:
            throw AuthError.validationFailed
        case 429:
            throw AuthError.rateLimited
        case 500...599:
            throw AuthError.serverError(httpResponse.statusCode)
        default:
            throw AuthError.unexpectedStatus(httpResponse.statusCode)
        }
    }

    private func mapError(_ error: Error) -> String {
        if let authError = error as? AuthError {
            return authError.localizedDescription
        }
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet:
                return "No internet connection. Please check your network."
            case .timedOut:
                return "Request timed out. Please try again."
            default:
                return "Network error: \(urlError.localizedDescription)"
            }
        }
        return "An unexpected error occurred: \(error.localizedDescription)"
    }
}

// MARK: - Data Models

struct AuthState {
    var isAuthenticated = false
    var isLoading = false
    var currentUser: UserProfile?
    var error: String?
    var biometricEnabled = false
    var passwordResetSent = false
}

struct UserProfile: Codable, Identifiable {
    let id: String
    var email: String
    var name: String
    var avatarURL: String?
    var subscription: SubscriptionPlan?
    var createdAt: Date
    var updatedAt: Date
    var preferences: UserPreferences

    struct UserPreferences: Codable {
        var theme: String = "system"
        var notificationsEnabled: Bool = true
        var defaultModel: String = "claude-sonnet-4-20250514"
        var locale: String = "en"
    }
}

struct AuthToken: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let tokenType: String
}

struct SubscriptionPlan: Codable {
    let id: String
    let name: String
    let tier: SubscriptionTier
    let isActive: Bool
    let expiresAt: Date?
    let features: [String]

    enum SubscriptionTier: String, Codable {
        case free
        case pro
        case team
        case enterprise
    }
}

struct AuthResponse: Codable {
    let user: UserProfile
    let token: AuthToken
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case forbidden
    case notFound
    case conflict
    case validationFailed
    case rateLimited
    case serverError(Int)
    case unexpectedStatus(Int)
    case decodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid request URL."
        case .invalidResponse:
            return "Invalid response from server."
        case .unauthorized:
            return "Invalid credentials. Please try again."
        case .forbidden:
            return "Access denied. You do not have permission."
        case .notFound:
            return "The requested resource was not found."
        case .conflict:
            return "An account with this email already exists."
        case .validationFailed:
            return "Please check your input and try again."
        case .rateLimited:
            return "Too many requests. Please wait and try again."
        case .serverError(let code):
            return "Server error (\(code)). Please try again later."
        case .unexpectedStatus(let code):
            return "Unexpected response (\(code))."
        case .decodingFailed:
            return "Failed to process server response."
        }
    }
}

// MARK: - Keychain Helper

final class KeychainHelper {

    static let shared = KeychainHelper()

    private let service = "com.claudecontext.app"

    private init() {}

    func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)

        var addQuery = query
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly

        SecItemAdd(addQuery as CFDictionary, nil)
    }

    func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }

    func deleteAll() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]

        SecItemDelete(query as CFDictionary)
    }
}
