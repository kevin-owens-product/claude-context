package com.claudecontext.localdev.service.ai

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages a local open-source LLM for routing decisions and simple queries.
 * Uses llama.cpp server for inference on Android, supporting GGUF model files.
 *
 * Recommended models for on-device use:
 * - Qwen2.5-Coder-1.5B-Q4 (~900MB) for code routing
 * - Phi-3-mini-Q4 (~2GB) for general routing + simple questions
 * - TinyLlama-1.1B-Q4 (~600MB) for ultra-fast classification
 */
@Singleton
class LocalModelService @Inject constructor(
    private val shell: ShellExecutor
) {
    private val _status = MutableStateFlow(LocalModelStatus())
    val status: StateFlow<LocalModelStatus> = _status.asStateFlow()

    private var serverProcess: Process? = null

    companion object {
        const val DEFAULT_PORT = 8080
        const val DEFAULT_CONTEXT_SIZE = 4096
        const val DEFAULT_THREADS = 4
        const val MODELS_DIR = "models"
    }

    data class LocalModelStatus(
        val isRunning: Boolean = false,
        val modelName: String = "",
        val modelPath: String = "",
        val port: Int = DEFAULT_PORT,
        val contextSize: Int = DEFAULT_CONTEXT_SIZE,
        val memoryUsageMb: Int = 0,
        val requestCount: Int = 0,
        val avgLatencyMs: Long = 0,
        val error: String? = null
    )

    data class LocalModelInfo(
        val name: String,
        val path: String,
        val sizeMb: Long,
        val quantization: String
    )

    /**
     * List available GGUF model files on device.
     */
    fun listAvailableModels(baseDir: String): List<LocalModelInfo> {
        val modelsDir = File(baseDir, MODELS_DIR)
        if (!modelsDir.exists()) {
            modelsDir.mkdirs()
            return emptyList()
        }

        return modelsDir.listFiles()
            ?.filter { it.extension == "gguf" }
            ?.map { file ->
                val quant = extractQuantization(file.name)
                LocalModelInfo(
                    name = file.nameWithoutExtension,
                    path = file.absolutePath,
                    sizeMb = file.length() / (1024 * 1024),
                    quantization = quant
                )
            }
            ?.sortedBy { it.sizeMb }
            ?: emptyList()
    }

    /**
     * Start the local llama.cpp server with the specified model.
     */
    suspend fun startServer(
        modelPath: String,
        port: Int = DEFAULT_PORT,
        contextSize: Int = DEFAULT_CONTEXT_SIZE,
        threads: Int = DEFAULT_THREADS,
        gpuLayers: Int = 0
    ): Boolean = withContext(Dispatchers.IO) {
        stopServer()

        val modelFile = File(modelPath)
        if (!modelFile.exists()) {
            _status.value = _status.value.copy(
                error = "Model file not found: $modelPath"
            )
            return@withContext false
        }

        try {
            // Check if llama-server binary exists
            val llamaServer = findLlamaServer()
            if (llamaServer == null) {
                _status.value = _status.value.copy(
                    error = "llama-server binary not found. Install llama.cpp first."
                )
                return@withContext false
            }

            val command = buildString {
                append("$llamaServer ")
                append("-m \"$modelPath\" ")
                append("--port $port ")
                append("-c $contextSize ")
                append("-t $threads ")
                if (gpuLayers > 0) append("-ngl $gpuLayers ")
                append("--host 0.0.0.0 ")
            }

            val process = ProcessBuilder("sh", "-c", "$command &")
                .redirectErrorStream(true)
                .start()

            serverProcess = process

            // Wait for server to be ready
            var ready = false
            for (attempt in 1..30) {
                kotlinx.coroutines.delay(500)
                try {
                    val healthCheck = shell.execute("curl -s http://localhost:$port/health")
                    if (healthCheck.exitCode == 0 && healthCheck.stdout.contains("ok", ignoreCase = true)) {
                        ready = true
                        break
                    }
                } catch (_: Exception) { }
            }

            if (ready) {
                _status.value = LocalModelStatus(
                    isRunning = true,
                    modelName = modelFile.nameWithoutExtension,
                    modelPath = modelPath,
                    port = port,
                    contextSize = contextSize
                )
                true
            } else {
                stopServer()
                _status.value = _status.value.copy(
                    error = "Server failed to start within 15 seconds"
                )
                false
            }
        } catch (e: Exception) {
            _status.value = _status.value.copy(error = "Failed to start: ${e.message}")
            false
        }
    }

    /**
     * Stop the local model server.
     */
    fun stopServer() {
        serverProcess?.destroyForcibly()
        serverProcess = null
        _status.value = LocalModelStatus()
    }

    /**
     * Quick classification query using the local model.
     * Used by ModelRouter to decide which model to use for a given prompt.
     */
    suspend fun classify(prompt: String, categories: List<String>): String = withContext(Dispatchers.IO) {
        if (!_status.value.isRunning) return@withContext categories.firstOrNull() ?: "general"

        val classifyPrompt = buildString {
            appendLine("Classify the following request into exactly one category.")
            appendLine("Categories: ${categories.joinToString(", ")}")
            appendLine("Request: $prompt")
            appendLine("Respond with ONLY the category name, nothing else.")
        }

        try {
            val result = shell.execute(
                """curl -s -X POST http://localhost:${_status.value.port}/completion \
                -H "Content-Type: application/json" \
                -d '{"prompt": "${classifyPrompt.replace("'", "\\'").replace("\"", "\\\"").replace("\n", "\\n")}", "n_predict": 20, "temperature": 0.1}'""",
                timeout = 10000
            )

            val content = Regex(""""content"\s*:\s*"([^"]*?)"""").find(result.stdout)?.groupValues?.get(1) ?: ""
            val cleaned = content.trim().lowercase()
            categories.find { it.lowercase() in cleaned } ?: categories.first()
        } catch (_: Exception) {
            categories.firstOrNull() ?: "general"
        }
    }

    /**
     * Quick answer for simple questions using the local model.
     */
    suspend fun quickAnswer(prompt: String): String = withContext(Dispatchers.IO) {
        if (!_status.value.isRunning) return@withContext ""

        try {
            val escapedPrompt = prompt.replace("'", "\\'").replace("\"", "\\\"").replace("\n", "\\n")
            val result = shell.execute(
                """curl -s -X POST http://localhost:${_status.value.port}/completion \
                -H "Content-Type: application/json" \
                -d '{"prompt": "$escapedPrompt", "n_predict": 256, "temperature": 0.7}'""",
                timeout = 30000
            )

            val content = Regex(""""content"\s*:\s*"([^"]*?)"""").find(result.stdout)?.groupValues?.get(1) ?: ""
            content.trim()
        } catch (_: Exception) {
            ""
        }
    }

    private fun findLlamaServer(): String? {
        val paths = listOf(
            "/data/local/tmp/llama-server",
            "/data/data/com.claudecontext.localdev/files/llama-server",
            "/usr/local/bin/llama-server",
            "llama-server"
        )
        for (path in paths) {
            if (File(path).exists()) return path
        }
        // Check if in PATH
        return try {
            val result = shell.execute("which llama-server")
            if (result.exitCode == 0) result.stdout.trim() else null
        } catch (_: Exception) { null }
    }

    private fun extractQuantization(filename: String): String {
        val quantPatterns = listOf("Q2_K", "Q3_K_S", "Q3_K_M", "Q3_K_L", "Q4_0", "Q4_K_S", "Q4_K_M", "Q5_0", "Q5_K_S", "Q5_K_M", "Q6_K", "Q8_0", "F16", "F32")
        for (pattern in quantPatterns) {
            if (filename.contains(pattern, ignoreCase = true)) return pattern
        }
        return "unknown"
    }
}
