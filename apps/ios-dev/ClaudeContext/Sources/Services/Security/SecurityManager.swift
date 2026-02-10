import Foundation
import CryptoKit
import Combine

/// Manages encryption, input sanitization, audit logging, rate limiting, and device security checks.
@MainActor
class SecurityManager: ObservableObject {

    @Published var state = SecurityState()

    private let auditLogFile: URL?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var rateLimits: [String: RateLimitTracker] = [:]
    private let encryptionKey: SymmetricKey

    // MARK: - Initialization

    init() {
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted
        decoder.dateDecodingStrategy = .iso8601

        if let savedKeyHex = KeychainHelper.shared.read(key: "encryption_key"),
           let keyData = Data(hexString: savedKeyHex) {
            encryptionKey = SymmetricKey(data: keyData)
        } else {
            let key = SymmetricKey(size: .bits256)
            encryptionKey = key
            let keyData = key.withUnsafeBytes { Data($0) }
            KeychainHelper.shared.save(key: "encryption_key", value: keyData.hexString)
        }

        if let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            let logsDir = documentsDir.appendingPathComponent("audit_logs")
            try? FileManager.default.createDirectory(at: logsDir, withIntermediateDirectories: true)
            auditLogFile = logsDir.appendingPathComponent("audit.json")
        } else {
            auditLogFile = nil
        }

        loadAuditLogs()
        performSecurityCheck()
    }

    // MARK: - Encryption (AES-GCM)

    func encrypt(_ plaintext: String) -> String? {
        guard let data = plaintext.data(using: .utf8) else { return nil }

        do {
            let sealedBox = try AES.GCM.seal(data, using: encryptionKey)
            guard let combined = sealedBox.combined else { return nil }
            return combined.base64EncodedString()
        } catch {
            logAudit(AuditLog(
                action: .encryptionFailure,
                details: "Encryption failed: \(error.localizedDescription)",
                severity: .warning
            ))
            return nil
        }
    }

    func decrypt(_ ciphertext: String) -> String? {
        guard let data = Data(base64Encoded: ciphertext) else { return nil }

        do {
            let sealedBox = try AES.GCM.SealedBox(combined: data)
            let decryptedData = try AES.GCM.open(sealedBox, using: encryptionKey)
            return String(data: decryptedData, encoding: .utf8)
        } catch {
            logAudit(AuditLog(
                action: .decryptionFailure,
                details: "Decryption failed: \(error.localizedDescription)",
                severity: .warning
            ))
            return nil
        }
    }

    // MARK: - Input Sanitization

    func sanitizeInput(_ input: String) -> SanitizationResult {
        var sanitized = input
        var threats: [String] = []

        let sqlPatterns = [
            "('\\s*(OR|AND)\\s*')", "(--)\\s*$", "(;\\s*(DROP|DELETE|INSERT|UPDATE|ALTER))",
            "(UNION\\s+SELECT)", "(\\b(exec|execute|xp_)\\b)"
        ]
        for pattern in sqlPatterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               regex.firstMatch(in: sanitized, range: NSRange(sanitized.startIndex..., in: sanitized)) != nil {
                threats.append("SQL injection pattern detected")
                break
            }
        }

        let xssPatterns = [
            "<script[^>]*>", "</script>", "javascript:", "on\\w+\\s*=",
            "<iframe", "<object", "<embed", "<form", "vbscript:", "data:text/html"
        ]
        for pattern in xssPatterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) {
                let range = NSRange(sanitized.startIndex..., in: sanitized)
                sanitized = regex.stringByReplacingMatches(in: sanitized, range: range, withTemplate: "")
                if sanitized != input {
                    threats.append("XSS pattern detected and removed")
                }
            }
        }

        sanitized = sanitized
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&#x27;")

        let isSafe = threats.isEmpty
        let result = SanitizationResult(
            original: input,
            sanitized: sanitized,
            isSafe: isSafe,
            threats: threats
        )

        if !isSafe {
            logAudit(AuditLog(
                action: .inputSanitized,
                details: "Threats found: \(threats.joined(separator: ", "))",
                severity: .warning
            ))
        }

        return result
    }

    func sanitizeFilePath(_ path: String) -> SanitizationResult {
        var sanitized = path
        var threats: [String] = []

        if sanitized.contains("..") {
            threats.append("Path traversal attempt detected")
            sanitized = sanitized.replacingOccurrences(of: "..", with: "")
        }

        let forbidden = ["\0", "\n", "\r"]
        for char in forbidden {
            if sanitized.contains(char) {
                threats.append("Null byte or control character injection detected")
                sanitized = sanitized.replacingOccurrences(of: char, with: "")
            }
        }

        if sanitized.hasPrefix("/etc/") || sanitized.hasPrefix("/System/") || sanitized.hasPrefix("/var/") {
            threats.append("Access to restricted system path attempted")
        }

        let allowedCharacters = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "/_-. "))
        sanitized = sanitized.unicodeScalars.filter { allowedCharacters.contains($0) }.map { String($0) }.joined()

        let isSafe = threats.isEmpty
        let result = SanitizationResult(
            original: path,
            sanitized: sanitized,
            isSafe: isSafe,
            threats: threats
        )

        if !isSafe {
            logAudit(AuditLog(
                action: .pathTraversalBlocked,
                details: "Path: \(path), Threats: \(threats.joined(separator: ", "))",
                severity: .critical
            ))
        }

        return result
    }

    func sanitizeShellCommand(_ command: String) -> SanitizationResult {
        var threats: [String] = []

        let dangerousPatterns = [
            "rm\\s+-rf", "rm\\s+-fr", "mkfs", "dd\\s+if=", ":(){ :|:& };:",
            "chmod\\s+777", "curl.*\\|.*sh", "wget.*\\|.*sh", "eval\\s*\\(",
            "> /dev/sd", "shutdown", "reboot", "init\\s+0", "mkfs\\.",
            "\\|\\s*sh", "\\|\\s*bash", "\\$\\(", "`"
        ]

        for pattern in dangerousPatterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               regex.firstMatch(in: command, range: NSRange(command.startIndex..., in: command)) != nil {
                threats.append("Dangerous command pattern: \(pattern)")
            }
        }

        let chainOperators = ["&&", "||", ";", "|"]
        for op in chainOperators {
            if command.contains(op) {
                threats.append("Command chaining operator detected: \(op)")
            }
        }

        let sanitized = command.replacingOccurrences(of: ";", with: "")
            .replacingOccurrences(of: "|", with: "")
            .replacingOccurrences(of: "&", with: "")
            .replacingOccurrences(of: "`", with: "")
            .replacingOccurrences(of: "$(", with: "")

        let isSafe = threats.isEmpty
        let result = SanitizationResult(
            original: command,
            sanitized: sanitized,
            isSafe: isSafe,
            threats: threats
        )

        if !isSafe {
            logAudit(AuditLog(
                action: .dangerousCommandBlocked,
                details: "Command: \(command), Threats: \(threats.joined(separator: ", "))",
                severity: .critical
            ))

            state.alerts.append(SecurityAlert(
                level: .critical,
                title: "Dangerous Command Blocked",
                message: "A potentially harmful shell command was intercepted.",
                timestamp: Date()
            ))
        }

        return result
    }

    // MARK: - Audit Logging

    func logAudit(_ log: AuditLog) {
        state.auditLogs.append(log)

        if state.auditLogs.count > 10000 {
            state.auditLogs = Array(state.auditLogs.suffix(5000))
        }

        persistAuditLogs()
    }

    func exportAuditLogs() -> String? {
        guard let data = try? encoder.encode(state.auditLogs) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func clearAuditLogs() {
        state.auditLogs.removeAll()
        persistAuditLogs()
    }

    // MARK: - Rate Limiting

    func checkRateLimit(_ action: String) -> RateLimitInfo {
        let now = Date()
        let windowDuration: TimeInterval = 60
        let maxRequests: Int

        switch action {
        case "login":
            maxRequests = 5
        case "api_call":
            maxRequests = 100
        case "password_reset":
            maxRequests = 3
        case "signup":
            maxRequests = 3
        case "file_upload":
            maxRequests = 20
        default:
            maxRequests = 60
        }

        var tracker = rateLimits[action] ?? RateLimitTracker(windowStart: now, requestCount: 0)

        if now.timeIntervalSince(tracker.windowStart) > windowDuration {
            tracker = RateLimitTracker(windowStart: now, requestCount: 0)
        }

        tracker.requestCount += 1
        rateLimits[action] = tracker

        let remaining = max(maxRequests - tracker.requestCount, 0)
        let isAllowed = tracker.requestCount <= maxRequests
        let resetTime = tracker.windowStart.addingTimeInterval(windowDuration)

        let info = RateLimitInfo(
            action: action,
            isAllowed: isAllowed,
            remaining: remaining,
            limit: maxRequests,
            resetTime: resetTime,
            retryAfter: isAllowed ? nil : resetTime.timeIntervalSince(now)
        )

        if !isAllowed {
            logAudit(AuditLog(
                action: .rateLimitExceeded,
                details: "Rate limit exceeded for action: \(action), count: \(tracker.requestCount)/\(maxRequests)",
                severity: .warning
            ))

            state.alerts.append(SecurityAlert(
                level: .warning,
                title: "Rate Limit Exceeded",
                message: "Too many \(action) attempts. Please wait \(Int(resetTime.timeIntervalSince(now))) seconds.",
                timestamp: now
            ))
        }

        return info
    }

    // MARK: - Device Security

    func isJailbroken() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        let suspiciousPaths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
            "/usr/bin/ssh",
            "/private/var/stash",
            "/Applications/Sileo.app",
            "/var/checkra1n.dmg"
        ]

        for path in suspiciousPaths {
            if FileManager.default.fileExists(atPath: path) {
                logAudit(AuditLog(
                    action: .jailbreakDetected,
                    details: "Suspicious path found: \(path)",
                    severity: .critical
                ))

                state.alerts.append(SecurityAlert(
                    level: .critical,
                    title: "Security Warning",
                    message: "This device appears to be jailbroken. Some security features may be compromised.",
                    timestamp: Date()
                ))
                return true
            }
        }

        let testPath = "/private/jailbreak_test_\(UUID().uuidString)"
        do {
            try "test".write(toFile: testPath, atomically: true, encoding: .utf8)
            try FileManager.default.removeItem(atPath: testPath)
            logAudit(AuditLog(
                action: .jailbreakDetected,
                details: "Write access to restricted path succeeded",
                severity: .critical
            ))
            return true
        } catch {
            return false
        }
        #endif
    }

    // MARK: - Secure Token Generation

    func generateSecureToken(byteCount: Int = 32) -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        let status = SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes)

        guard status == errSecSuccess else {
            return UUID().uuidString.replacingOccurrences(of: "-", with: "")
        }

        return Data(bytes).hexString
    }

    // MARK: - Password Hashing

    func hashPassword(_ password: String) -> String {
        let salt = generateSecureToken(byteCount: 16)
        let saltedPassword = "\(salt):\(password)"

        guard let data = saltedPassword.data(using: .utf8) else {
            return SHA256.hash(data: password.data(using: .utf8)!).compactMap { String(format: "%02x", $0) }.joined()
        }

        let hash = SHA256.hash(data: data)
        let hashString = hash.compactMap { String(format: "%02x", $0) }.joined()

        return "\(salt):\(hashString)"
    }

    func verifyPassword(_ password: String, against storedHash: String) -> Bool {
        let components = storedHash.split(separator: ":", maxSplits: 1)
        guard components.count == 2 else { return false }

        let salt = String(components[0])
        let expectedHash = String(components[1])

        let saltedPassword = "\(salt):\(password)"
        guard let data = saltedPassword.data(using: .utf8) else { return false }

        let hash = SHA256.hash(data: data)
        let hashString = hash.compactMap { String(format: "%02x", $0) }.joined()

        return hashString == expectedHash
    }

    // MARK: - Private Helpers

    private func performSecurityCheck() {
        let jailbroken = isJailbroken()
        state.isDeviceSecure = !jailbroken

        if jailbroken {
            state.alerts.append(SecurityAlert(
                level: .critical,
                title: "Jailbreak Detected",
                message: "Running on a jailbroken device reduces security guarantees.",
                timestamp: Date()
            ))
        }
    }

    private func loadAuditLogs() {
        guard let file = auditLogFile,
              let data = try? Data(contentsOf: file),
              let logs = try? decoder.decode([AuditLog].self, from: data) else {
            return
        }
        state.auditLogs = logs
    }

    private func persistAuditLogs() {
        guard let file = auditLogFile,
              let data = try? encoder.encode(state.auditLogs) else {
            return
        }
        try? data.write(to: file, options: .atomic)
    }
}

// MARK: - Data Models

struct SecurityState {
    var isDeviceSecure = true
    var auditLogs: [AuditLog] = []
    var alerts: [SecurityAlert] = []
    var encryptionAvailable = true
}

struct RateLimitInfo {
    let action: String
    let isAllowed: Bool
    let remaining: Int
    let limit: Int
    let resetTime: Date
    let retryAfter: TimeInterval?
}

struct RateLimitTracker {
    var windowStart: Date
    var requestCount: Int
}

struct AuditLog: Codable, Identifiable {
    let id: UUID
    let action: AuditAction
    let details: String
    let severity: AlertLevel
    let timestamp: Date
    let metadata: [String: String]

    init(
        id: UUID = UUID(),
        action: AuditAction,
        details: String,
        severity: AlertLevel = .info,
        timestamp: Date = Date(),
        metadata: [String: String] = [:]
    ) {
        self.id = id
        self.action = action
        self.details = details
        self.severity = severity
        self.timestamp = timestamp
        self.metadata = metadata
    }
}

enum AuditAction: String, Codable {
    case loginSuccess = "login_success"
    case loginFailure = "login_failure"
    case logout = "logout"
    case signupSuccess = "signup_success"
    case tokenRefresh = "token_refresh"
    case profileUpdate = "profile_update"
    case passwordChange = "password_change"
    case passwordReset = "password_reset"
    case biometricEnabled = "biometric_enabled"
    case biometricAuth = "biometric_auth"
    case encryptionFailure = "encryption_failure"
    case decryptionFailure = "decryption_failure"
    case inputSanitized = "input_sanitized"
    case pathTraversalBlocked = "path_traversal_blocked"
    case dangerousCommandBlocked = "dangerous_command_blocked"
    case rateLimitExceeded = "rate_limit_exceeded"
    case jailbreakDetected = "jailbreak_detected"
    case sessionCreated = "session_created"
    case sessionDeleted = "session_deleted"
    case dataExported = "data_exported"
    case settingsChanged = "settings_changed"
    case featureFlagToggled = "feature_flag_toggled"
    case adminAction = "admin_action"
    case apiRequest = "api_request"
    case fileAccess = "file_access"
}

enum AlertLevel: String, Codable {
    case info
    case warning
    case critical
}

struct SecurityAlert: Identifiable {
    let id = UUID()
    let level: AlertLevel
    let title: String
    let message: String
    let timestamp: Date
}

struct SanitizationResult {
    let original: String
    let sanitized: String
    let isSafe: Bool
    let threats: [String]
}

// MARK: - Data Hex Extensions

extension Data {
    init?(hexString: String) {
        let length = hexString.count
        guard length % 2 == 0 else { return nil }

        var data = Data(capacity: length / 2)
        var index = hexString.startIndex

        for _ in 0..<length / 2 {
            let nextIndex = hexString.index(index, offsetBy: 2)
            guard let byte = UInt8(hexString[index..<nextIndex], radix: 16) else { return nil }
            data.append(byte)
            index = nextIndex
        }

        self = data
    }

    var hexString: String {
        map { String(format: "%02x", $0) }.joined()
    }
}
