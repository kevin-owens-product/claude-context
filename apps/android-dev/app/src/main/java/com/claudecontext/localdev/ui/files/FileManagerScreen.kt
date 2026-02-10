package com.claudecontext.localdev.ui.files

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.claudecontext.localdev.data.models.FileNode
import com.claudecontext.localdev.data.models.ProjectLanguage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FileManagerScreen(
    projectId: Long,
    onFileSelected: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: FileManagerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(projectId) {
        viewModel.loadProject(projectId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Files", style = MaterialTheme.typography.titleMedium)
                        Text(
                            uiState.currentPath,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                    IconButton(onClick = { viewModel.showCreateDialog() }) {
                        Icon(Icons.Default.Add, "New file")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Breadcrumb
            if (uiState.breadcrumbs.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    uiState.breadcrumbs.forEachIndexed { index, crumb ->
                        if (index > 0) {
                            Text(
                                " / ",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                        Text(
                            crumb,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (index == uiState.breadcrumbs.size - 1)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.clickable {
                                viewModel.navigateToBreadcrumb(index)
                            }
                        )
                    }
                }
                HorizontalDivider()
            }

            // File list
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(vertical = 4.dp)
            ) {
                // Parent directory
                if (uiState.canGoUp) {
                    item {
                        FileListItem(
                            icon = Icons.Default.ArrowUpward,
                            name = "..",
                            subtitle = "Parent directory",
                            onClick = { viewModel.navigateUp() }
                        )
                    }
                }

                items(uiState.files) { node ->
                    FileListItem(
                        icon = if (node.isDirectory) Icons.Default.Folder else getFileIcon(node.language),
                        name = node.name,
                        subtitle = if (node.isDirectory) {
                            "${node.children.size} items"
                        } else {
                            formatFileSize(node.size)
                        },
                        iconTint = if (node.isDirectory) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            getLanguageColor(node.language)
                        },
                        onClick = {
                            if (node.isDirectory) {
                                viewModel.navigateToDirectory(node.file.absolutePath)
                            } else {
                                onFileSelected(node.file.absolutePath)
                            }
                        },
                        onLongClick = { viewModel.showFileOptions(node) }
                    )
                }
            }
        }

        // Create file/folder dialog
        if (uiState.showCreateDialog) {
            CreateFileDialog(
                onDismiss = { viewModel.hideCreateDialog() },
                onCreate = { name, isDir -> viewModel.createFileOrFolder(name, isDir) }
            )
        }

        // File options dialog
        uiState.selectedFile?.let { file ->
            FileOptionsDialog(
                fileName = file.name,
                onDismiss = { viewModel.clearSelection() },
                onRename = { viewModel.renameFile(file, it) },
                onDelete = { viewModel.deleteFile(file) },
                onCopy = { viewModel.copyPath(file) }
            )
        }
    }
}

@Composable
private fun FileListItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    name: String,
    subtitle: String,
    iconTint: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurfaceVariant,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null
) {
    ListItem(
        headlineContent = {
            Text(name, fontWeight = FontWeight.Medium)
        },
        supportingContent = {
            Text(subtitle, style = MaterialTheme.typography.bodySmall)
        },
        leadingContent = {
            Icon(icon, null, tint = iconTint)
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}

@Composable
private fun CreateFileDialog(
    onDismiss: () -> Unit,
    onCreate: (String, Boolean) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var isDirectory by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create New") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = !isDirectory,
                        onClick = { isDirectory = false },
                        label = { Text("File") }
                    )
                    FilterChip(
                        selected = isDirectory,
                        onClick = { isDirectory = true },
                        label = { Text("Folder") }
                    )
                }
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(if (isDirectory) "Folder name" else "File name") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onCreate(name, isDirectory) },
                enabled = name.isNotBlank()
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
private fun FileOptionsDialog(
    fileName: String,
    onDismiss: () -> Unit,
    onRename: (String) -> Unit,
    onDelete: () -> Unit,
    onCopy: () -> Unit
) {
    var showRename by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf(fileName) }

    if (showRename) {
        AlertDialog(
            onDismissRequest = { showRename = false },
            title = { Text("Rename") },
            text = {
                OutlinedTextField(
                    value = newName,
                    onValueChange = { newName = it },
                    label = { Text("New name") },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(onClick = { onRename(newName) }) { Text("Rename") }
            },
            dismissButton = {
                TextButton(onClick = { showRename = false }) { Text("Cancel") }
            }
        )
    } else {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text(fileName) },
            text = {
                Column {
                    TextButton(onClick = { showRename = true }) {
                        Icon(Icons.Default.Edit, null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Rename")
                    }
                    TextButton(onClick = onCopy) {
                        Icon(Icons.Default.ContentCopy, null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Copy path")
                    }
                    TextButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Delete", color = MaterialTheme.colorScheme.error)
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = onDismiss) { Text("Close") }
            }
        )
    }
}

private fun getFileIcon(language: ProjectLanguage): androidx.compose.ui.graphics.vector.ImageVector {
    return when (language) {
        ProjectLanguage.MARKDOWN -> Icons.Default.Description
        ProjectLanguage.JSON, ProjectLanguage.YAML -> Icons.Default.DataObject
        ProjectLanguage.HTML -> Icons.Default.Web
        ProjectLanguage.CSS -> Icons.Default.Palette
        else -> Icons.Default.InsertDriveFile
    }
}

@Composable
private fun getLanguageColor(language: ProjectLanguage): androidx.compose.ui.graphics.Color {
    return when (language) {
        ProjectLanguage.KOTLIN -> androidx.compose.ui.graphics.Color(0xFF7F52FF)
        ProjectLanguage.JAVA -> androidx.compose.ui.graphics.Color(0xFFB07219)
        ProjectLanguage.PYTHON -> androidx.compose.ui.graphics.Color(0xFF3572A5)
        ProjectLanguage.JAVASCRIPT -> androidx.compose.ui.graphics.Color(0xFFF1E05A)
        ProjectLanguage.TYPESCRIPT -> androidx.compose.ui.graphics.Color(0xFF3178C6)
        ProjectLanguage.RUST -> androidx.compose.ui.graphics.Color(0xFFDEA584)
        ProjectLanguage.GO -> androidx.compose.ui.graphics.Color(0xFF00ADD8)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
}

private fun formatFileSize(bytes: Long): String {
    return when {
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "${bytes / 1024} KB"
        else -> "${bytes / (1024 * 1024)} MB"
    }
}
