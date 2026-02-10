package com.claudecontext.localdev.ui.projects

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.claudecontext.localdev.data.models.ProjectLanguage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewProjectScreen(
    onProjectCreated: (Long) -> Unit,
    onBack: () -> Unit,
    viewModel: NewProjectViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.createdProjectId) {
        uiState.createdProjectId?.let { id ->
            onProjectCreated(id)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Project") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Project type selector
            Text("Project Type", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = uiState.projectType == ProjectType.NEW,
                    onClick = { viewModel.setProjectType(ProjectType.NEW) },
                    label = { Text("New Project") },
                    leadingIcon = if (uiState.projectType == ProjectType.NEW) {
                        { Icon(Icons.Default.Check, null, Modifier.size(18.dp)) }
                    } else null
                )
                FilterChip(
                    selected = uiState.projectType == ProjectType.CLONE,
                    onClick = { viewModel.setProjectType(ProjectType.CLONE) },
                    label = { Text("Clone Repository") },
                    leadingIcon = if (uiState.projectType == ProjectType.CLONE) {
                        { Icon(Icons.Default.Check, null, Modifier.size(18.dp)) }
                    } else null
                )
                FilterChip(
                    selected = uiState.projectType == ProjectType.OPEN,
                    onClick = { viewModel.setProjectType(ProjectType.OPEN) },
                    label = { Text("Open Existing") },
                    leadingIcon = if (uiState.projectType == ProjectType.OPEN) {
                        { Icon(Icons.Default.Check, null, Modifier.size(18.dp)) }
                    } else null
                )
            }

            // Project name
            OutlinedTextField(
                value = uiState.name,
                onValueChange = { viewModel.setName(it) },
                label = { Text("Project Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Clone URL (only for clone type)
            if (uiState.projectType == ProjectType.CLONE) {
                OutlinedTextField(
                    value = uiState.cloneUrl,
                    onValueChange = { viewModel.setCloneUrl(it) },
                    label = { Text("Git Repository URL") },
                    placeholder = { Text("https://github.com/user/repo.git") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }

            // Language selector
            Text("Language", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)

            val languages = listOf(
                ProjectLanguage.KOTLIN, ProjectLanguage.JAVA,
                ProjectLanguage.PYTHON, ProjectLanguage.JAVASCRIPT,
                ProjectLanguage.TYPESCRIPT, ProjectLanguage.RUST,
                ProjectLanguage.GO, ProjectLanguage.C, ProjectLanguage.CPP,
                ProjectLanguage.DART, ProjectLanguage.RUBY, ProjectLanguage.PHP
            )

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                languages.forEach { lang ->
                    FilterChip(
                        selected = uiState.language == lang,
                        onClick = { viewModel.setLanguage(lang) },
                        label = { Text(lang.displayName) }
                    )
                }
            }

            // Custom directory
            OutlinedTextField(
                value = uiState.directory,
                onValueChange = { viewModel.setDirectory(it) },
                label = { Text("Project Directory") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                supportingText = { Text("Leave empty for default location") }
            )

            // Initialize Git
            if (uiState.projectType == ProjectType.NEW) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Initialize Git Repository")
                    Switch(
                        checked = uiState.initGit,
                        onCheckedChange = { viewModel.setInitGit(it) }
                    )
                }
            }

            // Error message
            uiState.error?.let { error ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = error,
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }

            // Create button
            Button(
                onClick = { viewModel.createProject() },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isCreating && uiState.name.isNotBlank()
            ) {
                if (uiState.isCreating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    when (uiState.projectType) {
                        ProjectType.NEW -> "Create Project"
                        ProjectType.CLONE -> "Clone & Create"
                        ProjectType.OPEN -> "Open Project"
                    }
                )
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowRow(
    horizontalArrangement: Arrangement.Horizontal,
    verticalArrangement: Arrangement.Vertical,
    content: @Composable () -> Unit
) {
    androidx.compose.foundation.layout.FlowRow(
        horizontalArrangement = horizontalArrangement,
        verticalArrangement = verticalArrangement
    ) {
        content()
    }
}
