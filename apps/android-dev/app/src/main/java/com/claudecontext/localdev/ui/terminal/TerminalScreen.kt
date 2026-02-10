package com.claudecontext.localdev.ui.terminal

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.claudecontext.localdev.data.models.LineType
import com.claudecontext.localdev.data.models.TerminalLine

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TerminalScreen(
    projectId: Long,
    onBack: () -> Unit,
    viewModel: TerminalViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()

    LaunchedEffect(projectId) {
        viewModel.initialize(projectId)
    }

    LaunchedEffect(uiState.lines.size) {
        if (uiState.lines.isNotEmpty()) {
            listState.animateScrollToItem(uiState.lines.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Terminal", style = MaterialTheme.typography.titleMedium)
                        Text(
                            uiState.workingDirectory,
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
                    // Quick actions
                    IconButton(onClick = { viewModel.runCommand("clear") }) {
                        Icon(Icons.Default.CleaningServices, "Clear")
                    }
                    IconButton(onClick = { viewModel.runBuild() }) {
                        Icon(Icons.Default.Build, "Build")
                    }
                    IconButton(onClick = { viewModel.runTests() }) {
                        Icon(Icons.Default.Science, "Test")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFF0D1117))
        ) {
            // Terminal output
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                items(uiState.lines) { line ->
                    TerminalOutputLine(line)
                }
            }

            // Quick commands bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF161B22))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("git status", "ls -la", "pwd").forEach { cmd ->
                    SuggestionChip(
                        onClick = { viewModel.runCommand(cmd) },
                        label = {
                            Text(
                                cmd,
                                style = MaterialTheme.typography.labelSmall,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    )
                }
            }

            // Command input
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF161B22))
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "$ ",
                    color = Color(0xFF58A6FF),
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                BasicTextField(
                    value = uiState.currentInput,
                    onValueChange = { viewModel.updateInput(it) },
                    modifier = Modifier.weight(1f),
                    textStyle = TextStyle(
                        color = Color(0xFFC9D1D9),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 14.sp
                    ),
                    cursorBrush = SolidColor(Color(0xFF58A6FF)),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(
                        onSend = { viewModel.executeInput() }
                    )
                )
                IconButton(
                    onClick = { viewModel.executeInput() },
                    enabled = uiState.currentInput.isNotBlank() && !uiState.isRunning
                ) {
                    Icon(
                        Icons.Default.Send,
                        "Execute",
                        tint = Color(0xFF58A6FF)
                    )
                }
            }
        }
    }
}

@Composable
private fun TerminalOutputLine(line: TerminalLine) {
    val textColor = when (line.type) {
        LineType.INPUT -> Color(0xFF58A6FF)
        LineType.OUTPUT -> Color(0xFFC9D1D9)
        LineType.ERROR -> Color(0xFFF85149)
        LineType.SYSTEM -> Color(0xFF8B949E)
    }

    Text(
        text = line.text,
        color = textColor,
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 1.dp)
    )
}
