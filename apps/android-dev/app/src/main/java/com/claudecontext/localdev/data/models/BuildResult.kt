package com.claudecontext.localdev.data.models

data class BuildResult(
    val success: Boolean,
    val output: String,
    val errors: List<BuildError> = emptyList(),
    val warnings: List<String> = emptyList(),
    val durationMs: Long = 0,
    val command: String = ""
)

data class BuildError(
    val file: String?,
    val line: Int?,
    val column: Int?,
    val message: String,
    val severity: ErrorSeverity = ErrorSeverity.ERROR
)

enum class ErrorSeverity {
    ERROR,
    WARNING,
    INFO
}

data class TestResult(
    val name: String,
    val passed: Boolean,
    val durationMs: Long = 0,
    val errorMessage: String? = null,
    val stackTrace: String? = null
)

data class TestSuiteResult(
    val suiteName: String,
    val tests: List<TestResult>,
    val totalDurationMs: Long = 0
) {
    val passedCount: Int get() = tests.count { it.passed }
    val failedCount: Int get() = tests.count { !it.passed }
    val totalCount: Int get() = tests.size
    val allPassed: Boolean get() = tests.all { it.passed }
}
