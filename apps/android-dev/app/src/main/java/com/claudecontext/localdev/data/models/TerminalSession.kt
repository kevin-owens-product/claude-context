package com.claudecontext.localdev.data.models

data class TerminalSession(
    val id: String,
    val title: String = "Terminal",
    val workingDirectory: String,
    val outputLines: List<TerminalLine> = emptyList(),
    val isRunning: Boolean = false,
    val currentCommand: String = ""
)

data class TerminalLine(
    val text: String,
    val type: LineType = LineType.OUTPUT,
    val timestamp: Long = System.currentTimeMillis()
)

enum class LineType {
    INPUT,
    OUTPUT,
    ERROR,
    SYSTEM
}
