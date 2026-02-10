package com.claudecontext.localdev.ui

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.claudecontext.localdev.ui.editor.EditorScreen
import com.claudecontext.localdev.ui.files.FileManagerScreen
import com.claudecontext.localdev.ui.git.GitScreen
import com.claudecontext.localdev.ui.projects.ProjectListScreen
import com.claudecontext.localdev.ui.projects.NewProjectScreen
import com.claudecontext.localdev.ui.terminal.TerminalScreen
import com.claudecontext.localdev.ui.settings.SettingsScreen

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    data object Projects : Screen("projects", "Projects", Icons.Default.Folder)
    data object Editor : Screen("editor/{projectId}", "Editor", Icons.Default.Code) {
        fun createRoute(projectId: Long) = "editor/$projectId"
    }
    data object Terminal : Screen("terminal/{projectId}", "Terminal", Icons.Default.Terminal) {
        fun createRoute(projectId: Long) = "terminal/$projectId"
    }
    data object Files : Screen("files/{projectId}", "Files", Icons.Default.FolderOpen) {
        fun createRoute(projectId: Long) = "files/$projectId"
    }
    data object Git : Screen("git/{projectId}", "Git", Icons.Default.AccountTree) {
        fun createRoute(projectId: Long) = "git/$projectId"
    }
    data object NewProject : Screen("new-project", "New Project", Icons.Default.Add)
    data object Settings : Screen("settings", "Settings", Icons.Default.Settings)
}

val projectScreens = listOf(Screen.Editor, Screen.Terminal, Screen.Files, Screen.Git)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClaudeLocalDevNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val projectId = navBackStackEntry?.arguments?.getString("projectId")?.toLongOrNull()
    val isInProject = projectId != null

    Scaffold(
        bottomBar = {
            if (isInProject) {
                NavigationBar {
                    projectScreens.forEach { screen ->
                        val route = when (screen) {
                            is Screen.Editor -> Screen.Editor.createRoute(projectId!!)
                            is Screen.Terminal -> Screen.Terminal.createRoute(projectId!!)
                            is Screen.Files -> Screen.Files.createRoute(projectId!!)
                            is Screen.Git -> Screen.Git.createRoute(projectId!!)
                            else -> screen.route
                        }
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = screen.title) },
                            label = { Text(screen.title) },
                            selected = currentRoute == screen.route,
                            onClick = {
                                navController.navigate(route) {
                                    popUpTo(navController.graph.startDestinationId)
                                    launchSingleTop = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Projects.route,
            modifier = Modifier.padding(paddingValues),
            enterTransition = {
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    tween(300)
                )
            },
            exitTransition = {
                slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    tween(300)
                )
            }
        ) {
            composable(Screen.Projects.route) {
                ProjectListScreen(
                    onProjectSelected = { id ->
                        navController.navigate(Screen.Editor.createRoute(id))
                    },
                    onNewProject = {
                        navController.navigate(Screen.NewProject.route)
                    },
                    onSettings = {
                        navController.navigate(Screen.Settings.route)
                    }
                )
            }

            composable(Screen.NewProject.route) {
                NewProjectScreen(
                    onProjectCreated = { id ->
                        navController.navigate(Screen.Editor.createRoute(id)) {
                            popUpTo(Screen.Projects.route)
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.Editor.route,
                arguments = listOf(navArgument("projectId") { type = NavType.LongType })
            ) { backStackEntry ->
                val id = backStackEntry.arguments?.getLong("projectId") ?: return@composable
                EditorScreen(
                    projectId = id,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.Terminal.route,
                arguments = listOf(navArgument("projectId") { type = NavType.LongType })
            ) { backStackEntry ->
                val id = backStackEntry.arguments?.getLong("projectId") ?: return@composable
                TerminalScreen(
                    projectId = id,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.Files.route,
                arguments = listOf(navArgument("projectId") { type = NavType.LongType })
            ) { backStackEntry ->
                val id = backStackEntry.arguments?.getLong("projectId") ?: return@composable
                FileManagerScreen(
                    projectId = id,
                    onFileSelected = { /* Navigate to editor with file */ },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.Git.route,
                arguments = listOf(navArgument("projectId") { type = NavType.LongType })
            ) { backStackEntry ->
                val id = backStackEntry.arguments?.getLong("projectId") ?: return@composable
                GitScreen(
                    projectId = id,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
