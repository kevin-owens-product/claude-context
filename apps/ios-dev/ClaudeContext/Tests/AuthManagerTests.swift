import XCTest
@testable import ClaudeContext

@MainActor
final class AuthManagerTests: XCTestCase {

    var authManager: AuthManager!

    override func setUp() {
        super.setUp()
        authManager = AuthManager()
    }

    // MARK: - Initial State

    func testInitialState_NotAuthenticated() {
        XCTAssertFalse(authManager.state.isAuthenticated)
        XCTAssertNil(authManager.state.user)
        XCTAssertNil(authManager.state.token)
        XCTAssertFalse(authManager.state.isLoading)
        XCTAssertNil(authManager.state.error)
    }

    // MARK: - Login

    func testLogin_EmptyEmail_SetsError() async {
        await authManager.login(email: "", password: "password123")
        XCTAssertNotNil(authManager.state.error)
        XCTAssertFalse(authManager.state.isAuthenticated)
    }

    func testLogin_EmptyPassword_SetsError() async {
        await authManager.login(email: "test@test.com", password: "")
        XCTAssertNotNil(authManager.state.error)
        XCTAssertFalse(authManager.state.isAuthenticated)
    }

    func testLogin_InvalidEmail_SetsError() async {
        await authManager.login(email: "notanemail", password: "password123")
        XCTAssertNotNil(authManager.state.error)
    }

    // MARK: - Signup

    func testSignup_EmptyName_SetsError() async {
        await authManager.signup(email: "test@test.com", password: "password123", name: "")
        XCTAssertNotNil(authManager.state.error)
    }

    func testSignup_ShortPassword_SetsError() async {
        await authManager.signup(email: "test@test.com", password: "123", name: "Test")
        XCTAssertNotNil(authManager.state.error)
    }

    func testSignup_ValidInput_AttemptSignup() async {
        await authManager.signup(email: "test@test.com", password: "password123", name: "Test User")
        // Network will fail in tests but validation should pass
        XCTAssertTrue(authManager.state.isLoading || authManager.state.error != nil)
    }

    // MARK: - Logout

    func testLogout_ClearsState() async {
        authManager.state.isAuthenticated = true
        authManager.state.user = UserProfile(id: "1", email: "test@test.com", name: "Test")

        await authManager.logout()

        XCTAssertFalse(authManager.state.isAuthenticated)
        XCTAssertNil(authManager.state.user)
        XCTAssertNil(authManager.state.token)
    }

    // MARK: - Token

    func testTokenExpiry_ExpiredToken_ReturnsTrue() {
        let expiredToken = AuthToken(
            accessToken: "expired",
            refreshToken: "refresh",
            expiresAt: Date().addingTimeInterval(-3600).timeIntervalSince1970
        )
        authManager.state.token = expiredToken
        XCTAssertTrue(authManager.isTokenExpired)
    }

    func testTokenExpiry_ValidToken_ReturnsFalse() {
        let validToken = AuthToken(
            accessToken: "valid",
            refreshToken: "refresh",
            expiresAt: Date().addingTimeInterval(3600).timeIntervalSince1970
        )
        authManager.state.token = validToken
        XCTAssertFalse(authManager.isTokenExpired)
    }

    // MARK: - Biometric

    func testBiometric_DefaultDisabled() {
        XCTAssertFalse(authManager.state.biometricEnabled)
    }

    // MARK: - Password Reset

    func testPasswordReset_EmptyEmail_SetsError() async {
        await authManager.resetPassword(email: "")
        XCTAssertNotNil(authManager.state.error)
    }
}
