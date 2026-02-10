package com.claudecontext.localdev.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "projects")
data class Project(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val path: String,
    val language: ProjectLanguage,
    val gitRemoteUrl: String? = null,
    val lastOpenedAt: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis()
)

enum class ProjectLanguage(val displayName: String, val extensions: List<String>) {
    KOTLIN("Kotlin", listOf("kt", "kts")),
    JAVA("Java", listOf("java")),
    PYTHON("Python", listOf("py")),
    JAVASCRIPT("JavaScript", listOf("js", "jsx")),
    TYPESCRIPT("TypeScript", listOf("ts", "tsx")),
    RUST("Rust", listOf("rs")),
    GO("Go", listOf("go")),
    C("C", listOf("c", "h")),
    CPP("C++", listOf("cpp", "cc", "cxx", "hpp")),
    DART("Dart", listOf("dart")),
    RUBY("Ruby", listOf("rb")),
    PHP("PHP", listOf("php")),
    SWIFT("Swift", listOf("swift")),
    SHELL("Shell", listOf("sh", "bash", "zsh")),
    HTML("HTML", listOf("html", "htm")),
    CSS("CSS", listOf("css", "scss", "sass")),
    JSON("JSON", listOf("json")),
    YAML("YAML", listOf("yml", "yaml")),
    MARKDOWN("Markdown", listOf("md")),
    OTHER("Other", emptyList());

    companion object {
        fun fromExtension(ext: String): ProjectLanguage {
            return entries.find { ext.lowercase() in it.extensions } ?: OTHER
        }
    }
}
