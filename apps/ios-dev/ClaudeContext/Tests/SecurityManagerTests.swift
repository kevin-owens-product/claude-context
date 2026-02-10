import XCTest
@testable import ClaudeContext

@MainActor
final class SecurityManagerTests: XCTestCase {

    var securityManager: SecurityManager!

    override func setUp() {
        super.setUp()
        securityManager = SecurityManager()
    }

    // MARK: - Input Sanitization

    func testSanitizeInput_NormalText_Unchanged() {
        let result = securityManager.sanitizeInput("Hello world")
        XCTAssertEqual(result.sanitized, "Hello world")
        XCTAssertFalse(result.wasModified)
    }

    func testSanitizeInput_ScriptTag_Removed() {
        let result = securityManager.sanitizeInput("<script>alert('xss')</script>")
        XCTAssertFalse(result.sanitized.contains("<script>"))
        XCTAssertTrue(result.wasModified)
    }

    func testSanitizeInput_SQLInjection_Escaped() {
        let result = securityManager.sanitizeInput("'; DROP TABLE users; --")
        XCTAssertFalse(result.sanitized.contains("DROP TABLE"))
        XCTAssertTrue(result.wasModified)
    }

    func testSanitizeInput_MaxLength_Truncated() {
        let longInput = String(repeating: "a", count: 100_000)
        let result = securityManager.sanitizeInput(longInput)
        XCTAssertTrue(result.sanitized.count <= 50_000)
    }

    // MARK: - File Path Sanitization

    func testSanitizeFilePath_NormalPath_Unchanged() {
        let result = securityManager.sanitizeFilePath("/home/user/project/src/main.kt")
        XCTAssertEqual(result.sanitized, "/home/user/project/src/main.kt")
        XCTAssertFalse(result.wasModified)
    }

    func testSanitizeFilePath_PathTraversal_Blocked() {
        let result = securityManager.sanitizeFilePath("../../etc/passwd")
        XCTAssertFalse(result.sanitized.contains(".."))
        XCTAssertTrue(result.wasModified)
    }

    func testSanitizeFilePath_NullBytes_Removed() {
        let result = securityManager.sanitizeFilePath("/home/user/file\0.txt")
        XCTAssertFalse(result.sanitized.contains("\0"))
    }

    // MARK: - Shell Command Sanitization

    func testSanitizeShellCommand_SafeCommand_Unchanged() {
        let result = securityManager.sanitizeShellCommand("ls -la src/")
        XCTAssertEqual(result.sanitized, "ls -la src/")
        XCTAssertFalse(result.wasModified)
    }

    func testSanitizeShellCommand_DangerousRm_Blocked() {
        let result = securityManager.sanitizeShellCommand("rm -rf /")
        XCTAssertTrue(result.wasModified)
        XCTAssertTrue(result.warnings.count > 0)
    }

    func testSanitizeShellCommand_CommandInjection_Blocked() {
        let result = securityManager.sanitizeShellCommand("ls; rm -rf /")
        XCTAssertTrue(result.wasModified)
    }

    // MARK: - Rate Limiting

    func testRateLimit_UnderLimit_Allowed() {
        let allowed = securityManager.checkRateLimit("test_endpoint")
        XCTAssertTrue(allowed)
    }

    func testRateLimit_AtLimit_Blocked() {
        // Exhaust the rate limit
        for _ in 0..<100 {
            _ = securityManager.checkRateLimit("flood_endpoint")
        }
        let blocked = securityManager.checkRateLimit("flood_endpoint")
        XCTAssertFalse(blocked)
    }

    // MARK: - Audit Logging

    func testAuditLog_CreatesEntry() {
        securityManager.logAudit(action: .apiCall, target: "chat/completions", details: "Model: claude-sonnet")
        XCTAssertTrue(securityManager.state.auditLogCount > 0)
    }

    // MARK: - Secure Token

    func testGenerateSecureToken_CorrectLength() {
        let token = securityManager.generateSecureToken(length: 32)
        XCTAssertEqual(token.count, 64) // hex encoding doubles length
    }

    func testGenerateSecureToken_Unique() {
        let token1 = securityManager.generateSecureToken()
        let token2 = securityManager.generateSecureToken()
        XCTAssertNotEqual(token1, token2)
    }

    // MARK: - Password Hashing

    func testHashPassword_Deterministic() {
        let hash1 = securityManager.hashPassword("mypassword")
        let hash2 = securityManager.hashPassword("mypassword")
        XCTAssertEqual(hash1, hash2)
    }

    func testHashPassword_DifferentPasswords_DifferentHashes() {
        let hash1 = securityManager.hashPassword("password1")
        let hash2 = securityManager.hashPassword("password2")
        XCTAssertNotEqual(hash1, hash2)
    }

    // MARK: - Encryption

    func testEncryptDecrypt_RoundTrip() {
        let original = "sensitive api key sk-123456"
        let encrypted = securityManager.encrypt(original)
        XCTAssertNotNil(encrypted)
        XCTAssertNotEqual(encrypted, original)

        if let encrypted = encrypted {
            let decrypted = securityManager.decrypt(encrypted)
            XCTAssertEqual(decrypted, original)
        }
    }
}
