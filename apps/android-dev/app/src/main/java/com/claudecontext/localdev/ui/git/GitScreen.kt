package com.claudecontext.localdev.ui.git

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.claudecontext.localdev.data.models.GitChangeType
import com.claudecontext.localdev.data.models.GitCommit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GitScreen(
    projectId: Long,
    onBack: () -> Unit,
    viewModel: GitViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    LaunchedEffect(projectId) {
        viewModel.loadProject(projectId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Git", style = MaterialTheme.typography.titleMedium)
                        uiState.status?.let { status ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.AccountTree,
                                    null,
                                    modifier = Modifier.size(14.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    status.branch,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                if (status.ahead > 0 || status.behind > 0) {
                                    Text(
                                        " (+${status.ahead}/-${status.behind})",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
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
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Tabs
            TabRow(selectedTabIndex = selectedTab) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                    Text("Changes", modifier = Modifier.padding(12.dp))
                }
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                    Text("Log", modifier = Modifier.padding(12.dp))
                }
                Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }) {
                    Text("Branches", modifier = Modifier.padding(12.dp))
                }
            }

            when (selectedTab) {
                0 -> ChangesTab(viewModel, uiState)
                1 -> LogTab(uiState)
                2 -> BranchesTab(viewModel, uiState)
            }
        }
    }
}

@Composable
private fun ChangesTab(viewModel: GitViewModel, uiState: GitUiState) {
    var commitMessage by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Quick actions
        item {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AssistChip(
                    onClick = { viewModel.pull() },
                    label = { Text("Pull") },
                    leadingIcon = { Icon(Icons.Default.Download, null, Modifier.size(18.dp)) }
                )
                AssistChip(
                    onClick = { viewModel.push() },
                    label = { Text("Push") },
                    leadingIcon = { Icon(Icons.Default.Upload, null, Modifier.size(18.dp)) }
                )
                AssistChip(
                    onClick = { viewModel.stash() },
                    label = { Text("Stash") },
                    leadingIcon = { Icon(Icons.Default.Archive, null, Modifier.size(18.dp)) }
                )
            }
        }

        val status = uiState.status
        if (status == null) {
            item {
                Text("Loading...", style = MaterialTheme.typography.bodyMedium)
            }
            return@LazyColumn
        }

        if (status.isClean) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            null,
                            tint = MaterialTheme.colorScheme.tertiary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Working tree clean")
                    }
                }
            }
        }

        // Staged changes
        if (status.staged.isNotEmpty()) {
            item {
                Text(
                    "Staged (${status.staged.size})",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
            }
            items(status.staged) { change ->
                ChangeItem(
                    path = change.path,
                    type = change.status,
                    staged = true
                )
            }
        }

        // Unstaged changes
        if (status.unstaged.isNotEmpty()) {
            item {
                Text(
                    "Unstaged (${status.unstaged.size})",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
            }
            items(status.unstaged) { change ->
                ChangeItem(
                    path = change.path,
                    type = change.status,
                    staged = false
                )
            }
        }

        // Untracked files
        if (status.untracked.isNotEmpty()) {
            item {
                Text(
                    "Untracked (${status.untracked.size})",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
            }
            items(status.untracked) { path ->
                ChangeItem(
                    path = path,
                    type = GitChangeType.UNTRACKED,
                    staged = false
                )
            }
        }

        // Commit section
        if (!status.isClean) {
            item {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                OutlinedTextField(
                    value = commitMessage,
                    onValueChange = { commitMessage = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Commit message") },
                    minLines = 2,
                    maxLines = 4
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { viewModel.stageAll() },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Stage All")
                    }
                    Button(
                        onClick = {
                            viewModel.commit(commitMessage)
                            commitMessage = ""
                        },
                        modifier = Modifier.weight(1f),
                        enabled = commitMessage.isNotBlank()
                    ) {
                        Text("Commit")
                    }
                }
            }
        }

        // Output messages
        uiState.operationOutput?.let { output ->
            item {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (uiState.operationSuccess)
                            MaterialTheme.colorScheme.surfaceVariant
                        else
                            MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        output,
                        modifier = Modifier.padding(12.dp),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun ChangeItem(path: String, type: GitChangeType, staged: Boolean) {
    val color = when (type) {
        GitChangeType.ADDED -> Color(0xFF3FB950)
        GitChangeType.MODIFIED -> Color(0xFFD29922)
        GitChangeType.DELETED -> Color(0xFFF85149)
        GitChangeType.RENAMED -> Color(0xFF58A6FF)
        else -> Color(0xFF8B949E)
    }

    ListItem(
        headlineContent = {
            Text(
                path,
                fontFamily = FontFamily.Monospace,
                fontSize = 13.sp
            )
        },
        leadingContent = {
            Text(
                type.symbol,
                color = color,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
        }
    )
}

@Composable
private fun LogTab(uiState: GitUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(8.dp)
    ) {
        items(uiState.commits) { commit ->
            CommitItem(commit)
        }
    }
}

@Composable
private fun CommitItem(commit: GitCommit) {
    ListItem(
        headlineContent = {
            Text(
                commit.message,
                maxLines = 2,
                style = MaterialTheme.typography.bodyMedium
            )
        },
        supportingContent = {
            Text(
                "${commit.author} - ${commit.date}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        leadingContent = {
            Text(
                commit.shortHash,
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.primary
            )
        }
    )
}

@Composable
private fun BranchesTab(viewModel: GitViewModel, uiState: GitUiState) {
    var showCreateBranch by remember { mutableStateOf(false) }
    var newBranchName by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(8.dp)
    ) {
        item {
            Button(
                onClick = { showCreateBranch = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.Add, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("New Branch")
            }
        }

        items(uiState.branches) { branch ->
            ListItem(
                headlineContent = {
                    Text(
                        branch.name,
                        fontWeight = if (branch.isCurrent) FontWeight.Bold else FontWeight.Normal,
                        color = if (branch.isCurrent) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface
                    )
                },
                leadingContent = {
                    if (branch.isCurrent) {
                        Icon(
                            Icons.Default.Check,
                            null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    } else if (branch.isRemote) {
                        Icon(
                            Icons.Default.Cloud,
                            null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        Icon(
                            Icons.Default.AccountTree,
                            null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                modifier = if (!branch.isCurrent) {
                    Modifier.run {
                        // Checkout on tap
                        this
                    }
                } else Modifier
            )
        }
    }

    if (showCreateBranch) {
        AlertDialog(
            onDismissRequest = { showCreateBranch = false },
            title = { Text("Create Branch") },
            text = {
                OutlinedTextField(
                    value = newBranchName,
                    onValueChange = { newBranchName = it },
                    label = { Text("Branch name") },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.createBranch(newBranchName)
                    showCreateBranch = false
                    newBranchName = ""
                }) { Text("Create") }
            },
            dismissButton = {
                TextButton(onClick = { showCreateBranch = false }) { Text("Cancel") }
            }
        )
    }
}
