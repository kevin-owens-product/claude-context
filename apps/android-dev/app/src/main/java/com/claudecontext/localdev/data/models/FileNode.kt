package com.claudecontext.localdev.data.models

import java.io.File

data class FileNode(
    val file: File,
    val name: String = file.name,
    val isDirectory: Boolean = file.isDirectory,
    val children: List<FileNode> = emptyList(),
    val depth: Int = 0,
    val isExpanded: Boolean = false
) {
    val extension: String get() = file.extension
    val language: ProjectLanguage get() = ProjectLanguage.fromExtension(extension)
    val relativePath: String get() = file.path
    val size: Long get() = if (file.isFile) file.length() else 0
    val lastModified: Long get() = file.lastModified()

    companion object {
        fun fromFile(file: File, depth: Int = 0): FileNode {
            return FileNode(
                file = file,
                depth = depth,
                children = if (file.isDirectory) {
                    file.listFiles()
                        ?.filter { !it.name.startsWith(".") }
                        ?.sortedWith(compareBy<File> { !it.isDirectory }.thenBy { it.name })
                        ?.map { fromFile(it, depth + 1) }
                        ?: emptyList()
                } else {
                    emptyList()
                }
            )
        }
    }
}
