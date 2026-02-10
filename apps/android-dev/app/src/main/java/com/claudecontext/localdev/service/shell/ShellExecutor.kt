package com.claudecontext.localdev.service.shell

import com.claudecontext.localdev.data.models.LineType
import com.claudecontext.localdev.data.models.TerminalLine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShellExecutor @Inject constructor() {

    data class ShellResult(
        val exitCode: Int,
        val stdout: String,
        val stderr: String
    ) {
        val isSuccess: Boolean get() = exitCode == 0
        val output: String get() = if (stderr.isNotEmpty()) "$stdout\n$stderr" else stdout
    }

    suspend fun execute(
        command: String,
        workingDir: String? = null,
        environment: Map<String, String> = emptyMap(),
        timeout: Long = 300_000
    ): ShellResult = withContext(Dispatchers.IO) {
        val processBuilder = ProcessBuilder("sh", "-c", command).apply {
            workingDir?.let { directory(File(it)) }
            environment().putAll(environment)
            redirectErrorStream(false)
        }

        val process = processBuilder.start()

        val stdout = BufferedReader(InputStreamReader(process.inputStream)).readText()
        val stderr = BufferedReader(InputStreamReader(process.errorStream)).readText()

        val completed = process.waitFor(timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
        if (!completed) {
            process.destroyForcibly()
            return@withContext ShellResult(-1, stdout, "Process timed out after ${timeout}ms")
        }

        ShellResult(
            exitCode = process.exitValue(),
            stdout = stdout.trim(),
            stderr = stderr.trim()
        )
    }

    fun executeStreaming(
        command: String,
        workingDir: String? = null,
        environment: Map<String, String> = emptyMap()
    ): Flow<TerminalLine> = flow {
        val processBuilder = ProcessBuilder("sh", "-c", command).apply {
            workingDir?.let { directory(File(it)) }
            environment().putAll(environment)
            redirectErrorStream(true)
        }

        emit(TerminalLine("$ $command", LineType.INPUT))

        val process = processBuilder.start()
        val reader = BufferedReader(InputStreamReader(process.inputStream))

        var line: String?
        while (reader.readLine().also { line = it } != null) {
            emit(TerminalLine(line!!, LineType.OUTPUT))
        }

        val exitCode = process.waitFor()
        if (exitCode != 0) {
            emit(TerminalLine("Process exited with code $exitCode", LineType.ERROR))
        }
    }.flowOn(Dispatchers.IO)

    suspend fun isCommandAvailable(command: String): Boolean {
        return execute("which $command").isSuccess
    }

    suspend fun getShellEnvironment(workingDir: String? = null): Map<String, String> {
        val result = execute("env", workingDir)
        if (!result.isSuccess) return emptyMap()

        return result.stdout.lines()
            .filter { it.contains("=") }
            .associate {
                val (key, value) = it.split("=", limit = 2)
                key to value
            }
    }
}
