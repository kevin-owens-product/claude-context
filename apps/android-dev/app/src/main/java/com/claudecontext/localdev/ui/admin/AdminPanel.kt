package com.claudecontext.localdev.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.claudecontext.localdev.service.admin.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// --- Color Constants ---

private val AdminPrimary = Color(0xFF6366F1)
private val AdminSuccess = Color(0xFF10B981)
private val AdminWarning = Color(0xFFF59E0B)
private val AdminDanger = Color(0xFFEF4444)
private val AdminInfo = Color(0xFF3B82F6)

// --- Main Admin Panel ---

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminPanel(
    adminManager: AdminManager,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by adminManager.state.collectAsState()
    val currentRole by adminManager.currentUserRole.collectAsState()
    val moderationQueue by adminManager.moderationQueue.collectAsState()
    val error by adminManager.error.collectAsState()

    // Access gating for non-admins
    if (currentRole != "ADMIN") {
        AccessDeniedScreen(onBack = onBack)
        return
    }

    LaunchedEffect(Unit) {
        adminManager.initialize()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.AdminPanelSettings,
                            contentDescription = null,
                            tint = AdminPrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Admin Panel")
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Error banner
            error?.let { errorMsg ->
                Surface(
                    color = AdminDanger.copy(alpha = 0.1f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Error, null, tint = AdminDanger, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            errorMsg,
                            style = MaterialTheme.typography.bodySmall,
                            color = AdminDanger,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { adminManager.clearError() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, "Dismiss", modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }

            // Tab navigation
            AdminTabBar(
                selectedTab = state.selectedTab,
                onTabSelected = { adminManager.selectTab(it) }
            )

            // Loading indicator
            if (state.isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = AdminPrimary
                )
            }

            // Tab content
            when (state.selectedTab) {
                AdminTab.DASHBOARD -> DashboardTab(state, moderationQueue)
                AdminTab.USERS -> UsersTab(state, adminManager)
                AdminTab.ANALYTICS -> AnalyticsTab(state, onRefresh = { adminManager.refreshAnalytics() })
                AdminTab.FEATURE_FLAGS -> FeatureFlagsTab(state, adminManager)
                AdminTab.AUDIT_LOG -> AuditLogTab(state, adminManager)
                AdminTab.SYSTEM -> SystemHealthTab(state, adminManager)
            }
        }
    }
}

// --- Access Denied ---

@Composable
private fun AccessDeniedScreen(onBack: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.padding(32.dp),
            colors = CardDefaults.cardColors(containerColor = AdminDanger.copy(alpha = 0.05f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Default.Lock,
                    contentDescription = null,
                    tint = AdminDanger,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    "Access Denied",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = AdminDanger
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "You do not have admin privileges to access this panel. " +
                        "Contact your organization administrator for access.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.widthIn(max = 300.dp)
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = onBack,
                    colors = ButtonDefaults.buttonColors(containerColor = AdminDanger)
                ) {
                    Icon(Icons.Default.ArrowBack, null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Go Back")
                }
            }
        }
    }
}

// --- Tab Bar ---

@Composable
private fun AdminTabBar(
    selectedTab: AdminTab,
    onTabSelected: (AdminTab) -> Unit
) {
    val tabs = listOf(
        AdminTab.DASHBOARD to Pair("Dashboard", Icons.Default.Dashboard),
        AdminTab.USERS to Pair("Users", Icons.Default.People),
        AdminTab.ANALYTICS to Pair("Analytics", Icons.Default.Analytics),
        AdminTab.FEATURE_FLAGS to Pair("Flags", Icons.Default.Flag),
        AdminTab.AUDIT_LOG to Pair("Audit", Icons.Default.History),
        AdminTab.SYSTEM to Pair("System", Icons.Default.Monitor)
    )

    ScrollableTabRow(
        selectedTabIndex = tabs.indexOfFirst { it.first == selectedTab },
        containerColor = MaterialTheme.colorScheme.surface,
        edgePadding = 8.dp
    ) {
        tabs.forEach { (tab, labelIcon) ->
            val (label, icon) = labelIcon
            Tab(
                selected = selectedTab == tab,
                onClick = { onTabSelected(tab) },
                text = { Text(label, style = MaterialTheme.typography.labelSmall) },
                icon = { Icon(icon, label, modifier = Modifier.size(18.dp)) }
            )
        }
    }
}

// --- Dashboard Tab ---

@Composable
private fun DashboardTab(state: AdminState, moderationQueue: List<ModerationItem>) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            "Overview",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        // KPI Cards Row 1
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            KpiCard(
                title = "DAU",
                value = state.analytics?.dau?.toString() ?: "--",
                icon = Icons.Default.PersonOutline,
                color = AdminInfo,
                modifier = Modifier.weight(1f)
            )
            KpiCard(
                title = "MAU",
                value = state.analytics?.mau?.toString() ?: "--",
                icon = Icons.Default.People,
                color = AdminPrimary,
                modifier = Modifier.weight(1f)
            )
        }

        // KPI Cards Row 2
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            KpiCard(
                title = "Revenue",
                value = state.analytics?.let { "$${String.format("%.2f", it.monthlyRevenue)}/mo" } ?: "--",
                icon = Icons.Default.AttachMoney,
                color = AdminSuccess,
                modifier = Modifier.weight(1f)
            )
            KpiCard(
                title = "API Calls",
                value = state.analytics?.apiCallsToday?.let { formatNumber(it) } ?: "--",
                icon = Icons.Default.Api,
                color = AdminWarning,
                modifier = Modifier.weight(1f)
            )
        }

        // KPI Cards Row 3
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            KpiCard(
                title = "Retention",
                value = state.analytics?.let { "${(it.retentionRate * 100).toInt()}%" } ?: "--",
                icon = Icons.Default.TrendingUp,
                color = AdminSuccess,
                modifier = Modifier.weight(1f)
            )
            KpiCard(
                title = "Churn",
                value = state.analytics?.let { "${(it.churnRate * 100).toInt()}%" } ?: "--",
                icon = Icons.Default.TrendingDown,
                color = AdminDanger,
                modifier = Modifier.weight(1f)
            )
        }

        // Quick Stats
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "Quick Stats",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(12.dp))
                QuickStatRow("Total Users", "${state.users.size}")
                QuickStatRow("Active Users", "${state.users.count { it.status == "active" }}")
                QuickStatRow("Suspended Users", "${state.users.count { it.status == "suspended" }}")
                QuickStatRow("Feature Flags", "${state.featureFlags.size} (${state.featureFlags.count { it.enabled }} enabled)")
                QuickStatRow("Moderation Queue", "${moderationQueue.count { it.status == ModerationStatus.PENDING }} pending")
                QuickStatRow("Avg Session Duration",
                    state.analytics?.let { "${it.avgSessionDuration / 60_000}m" } ?: "--")
            }
        }

        // API Usage by Model
        state.analytics?.apiCallsByModel?.let { modelCalls ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "API Usage by Model",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    val maxCalls = modelCalls.values.maxOrNull()?.toFloat() ?: 1f
                    modelCalls.forEach { (model, calls) ->
                        ModelUsageBar(model, calls, maxCalls)
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                }
            }
        }

        // Recent Audit Entries
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "Recent Activity",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(8.dp))
                state.auditLogs.take(5).forEach { entry ->
                    AuditLogRow(entry)
                    if (entry != state.auditLogs.take(5).last()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(80.dp))
    }
}

// --- Users Tab ---

@Composable
private fun UsersTab(state: AdminState, adminManager: AdminManager) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedUserId by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { query ->
                searchQuery = query
                if (query.isNotEmpty()) {
                    adminManager.searchUsers(query)
                } else {
                    adminManager.loadUsers()
                }
            },
            placeholder = { Text("Search users by name, email, or plan...") },
            leadingIcon = { Icon(Icons.Default.Search, "Search") },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = {
                        searchQuery = ""
                        adminManager.loadUsers()
                    }) {
                        Icon(Icons.Default.Clear, "Clear")
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // User count
        Text(
            "${state.users.size} users",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        // User list
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.users, key = { it.id }) { user ->
                UserCard(
                    user = user,
                    isExpanded = selectedUserId == user.id,
                    onToggleExpand = {
                        selectedUserId = if (selectedUserId == user.id) null else user.id
                    },
                    onSuspend = { adminManager.suspendUser(user.id) },
                    onActivate = { adminManager.activateUser(user.id) },
                    onDelete = { adminManager.deleteUser(user.id) }
                )
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun UserCard(
    user: AdminUser,
    isExpanded: Boolean,
    onToggleExpand: () -> Unit,
    onSuspend: () -> Unit,
    onActivate: () -> Unit,
    onDelete: () -> Unit
) {
    val statusColor = when (user.status) {
        "active" -> AdminSuccess
        "suspended" -> AdminDanger
        "inactive" -> Color.Gray
        else -> Color.Gray
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onToggleExpand),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isExpanded) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(AdminPrimary.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        user.name.take(2).uppercase(),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = AdminPrimary
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        user.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        user.email,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Status chip
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = statusColor.copy(alpha = 0.1f)
                ) {
                    Text(
                        user.status.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall,
                        color = statusColor,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            // Plan chip
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PlanChip(user.plan)
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        "${user.totalSessions} sessions",
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        "${formatNumber(user.totalTokensUsed)} tokens",
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            // Expanded details
            if (isExpanded) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(12.dp))

                // Details grid
                Row(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        DetailLabel("User ID")
                        DetailValue(user.id)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        DetailLabel("Last Login")
                        DetailValue(formatTimestamp(user.lastLogin))
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (user.status == "active") {
                        Button(
                            onClick = onSuspend,
                            colors = ButtonDefaults.buttonColors(containerColor = AdminWarning),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Block, null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Suspend", style = MaterialTheme.typography.labelSmall)
                        }
                    } else {
                        Button(
                            onClick = onActivate,
                            colors = ButtonDefaults.buttonColors(containerColor = AdminSuccess),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Activate", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    OutlinedButton(
                        onClick = onDelete,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = AdminDanger),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = androidx.compose.ui.graphics.SolidColor(AdminDanger)
                        ),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Delete, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Delete", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

// --- Analytics Tab ---

@Composable
private fun AnalyticsTab(state: AdminState, onRefresh: () -> Unit) {
    val scrollState = rememberScrollState()
    val analytics = state.analytics

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Analytics",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = onRefresh) {
                Icon(Icons.Default.Refresh, "Refresh")
            }
        }

        if (analytics == null) {
            Box(
                modifier = Modifier.fillMaxWidth().height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = AdminPrimary)
            }
        } else {
            // Revenue chart
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Revenue Overview",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Total", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                "$${String.format("%.2f", analytics.totalRevenue)}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = AdminSuccess
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Monthly", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                "$${String.format("%.2f", analytics.monthlyRevenue)}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = AdminPrimary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Simple bar chart for revenue breakdown
                    Text("Revenue by Plan", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(8.dp))

                    val planBreakdown = mapOf(
                        "Pro Monthly" to state.users.count { it.plan == "pro_monthly" } * 4.99,
                        "Pro Annual" to state.users.count { it.plan == "pro_annual" } * (49.99 / 12.0),
                        "Enterprise" to state.users.count { it.plan == "enterprise" } * 99.99
                    )
                    val maxRevenue = planBreakdown.values.maxOrNull()?.toFloat() ?: 1f

                    planBreakdown.forEach { (plan, revenue) ->
                        SimpleBarChartRow(
                            label = plan,
                            value = revenue.toFloat(),
                            maxValue = maxRevenue,
                            displayText = "$${String.format("%.2f", revenue)}",
                            color = when (plan) {
                                "Pro Monthly" -> AdminInfo
                                "Pro Annual" -> AdminPrimary
                                "Enterprise" -> AdminSuccess
                                else -> Color.Gray
                            }
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                }
            }

            // User activity chart
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "User Activity",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        MetricCircle("DAU", analytics.dau, AdminInfo)
                        MetricCircle("MAU", analytics.mau, AdminPrimary)
                        MetricCircle("Retention", "${(analytics.retentionRate * 100).toInt()}%", AdminSuccess)
                        MetricCircle("Churn", "${(analytics.churnRate * 100).toInt()}%", AdminDanger)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // User distribution by plan
                    Text("User Distribution", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(8.dp))

                    val planDistribution = state.users.groupBy { it.plan }.mapValues { it.value.size }
                    val totalUsers = state.users.size.coerceAtLeast(1)

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(24.dp)
                            .clip(RoundedCornerShape(12.dp))
                    ) {
                        planDistribution.forEach { (plan, count) ->
                            val fraction = count.toFloat() / totalUsers
                            val color = when (plan) {
                                "free" -> Color.Gray
                                "pro_monthly" -> AdminInfo
                                "pro_annual" -> AdminPrimary
                                "enterprise" -> AdminSuccess
                                else -> Color.Gray
                            }
                            Box(
                                modifier = Modifier
                                    .weight(fraction.coerceAtLeast(0.01f))
                                    .fillMaxHeight()
                                    .background(color)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Legend
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        planDistribution.forEach { (plan, count) ->
                            val color = when (plan) {
                                "free" -> Color.Gray
                                "pro_monthly" -> AdminInfo
                                "pro_annual" -> AdminPrimary
                                "enterprise" -> AdminSuccess
                                else -> Color.Gray
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(color)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "$plan ($count)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            // API usage by model
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "API Calls by Model",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    val maxCalls = analytics.apiCallsByModel.values.maxOrNull()?.toFloat() ?: 1f

                    analytics.apiCallsByModel.entries.sortedByDescending { it.value }.forEach { (model, calls) ->
                        ModelUsageBar(model, calls, maxCalls)
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }

            // Session metrics
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Session Metrics",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    QuickStatRow("Avg Session Duration", "${analytics.avgSessionDuration / 60_000}m")
                    QuickStatRow("Total API Calls Today", formatNumber(analytics.apiCallsToday))
                    QuickStatRow("Retention Rate", "${(analytics.retentionRate * 100).toInt()}%")
                    QuickStatRow("Churn Rate", "${(analytics.churnRate * 100).toInt()}%")
                }
            }
        }

        Spacer(modifier = Modifier.height(80.dp))
    }
}

// --- Feature Flags Tab ---

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FeatureFlagsTab(state: AdminState, adminManager: AdminManager) {
    var showCreateDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Feature Flags",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            FilledTonalButton(onClick = { showCreateDialog = true }) {
                Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("New Flag")
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            "${state.featureFlags.size} flags (${state.featureFlags.count { it.enabled }} enabled)",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(state.featureFlags, key = { it.id }) { flag ->
                FeatureFlagCard(
                    flag = flag,
                    onToggle = { adminManager.toggleFeatureFlag(flag.id) },
                    onUpdateRollout = { percent -> adminManager.updateFlagRolloutPercent(flag.id, percent) },
                    onUpdateTargetPlans = { plans -> adminManager.updateFlagTargetPlans(flag.id, plans) },
                    onDelete = { adminManager.deleteFeatureFlag(flag.id) }
                )
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }

    // Create dialog
    if (showCreateDialog) {
        CreateFeatureFlagDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { name, description ->
                adminManager.createFeatureFlag(name, description)
                showCreateDialog = false
            }
        )
    }
}

@Composable
private fun FeatureFlagCard(
    flag: FeatureFlag,
    onToggle: () -> Unit,
    onUpdateRollout: (Int) -> Unit,
    onUpdateTargetPlans: (List<String>) -> Unit,
    onDelete: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    var rolloutSlider by remember(flag.rolloutPercent) { mutableStateOf(flag.rolloutPercent.toFloat()) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (flag.enabled) AdminSuccess.copy(alpha = 0.05f)
            else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        flag.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        flag.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Switch(
                    checked = flag.enabled,
                    onCheckedChange = { onToggle() },
                    colors = SwitchDefaults.colors(checkedTrackColor = AdminSuccess)
                )
            }

            // Summary chips
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.horizontalScroll(rememberScrollState())
            ) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = AdminPrimary.copy(alpha = 0.1f)
                ) {
                    Text(
                        "Rollout: ${flag.rolloutPercent}%",
                        style = MaterialTheme.typography.labelSmall,
                        color = AdminPrimary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
                if (flag.targetPlans.isNotEmpty()) {
                    flag.targetPlans.forEach { plan ->
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = AdminInfo.copy(alpha = 0.1f)
                        ) {
                            Text(
                                plan,
                                style = MaterialTheme.typography.labelSmall,
                                color = AdminInfo,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        "Created: ${formatTimestamp(flag.createdAt)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            // Expanded controls
            if (expanded) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(12.dp))

                // Rollout percentage slider
                Text(
                    "Rollout Percentage: ${rolloutSlider.toInt()}%",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Slider(
                    value = rolloutSlider,
                    onValueChange = { rolloutSlider = it },
                    onValueChangeFinished = { onUpdateRollout(rolloutSlider.toInt()) },
                    valueRange = 0f..100f,
                    steps = 19,
                    colors = SliderDefaults.colors(
                        thumbColor = AdminPrimary,
                        activeTrackColor = AdminPrimary
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Target plans
                Text(
                    "Target Plans",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))

                val allPlans = listOf("free", "pro_monthly", "pro_annual", "enterprise")
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    allPlans.forEach { plan ->
                        val isSelected = plan in flag.targetPlans
                        FilterChip(
                            selected = isSelected,
                            onClick = {
                                val newPlans = if (isSelected) {
                                    flag.targetPlans - plan
                                } else {
                                    flag.targetPlans + plan
                                }
                                onUpdateTargetPlans(newPlans)
                            },
                            label = { Text(plan, style = MaterialTheme.typography.labelSmall) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Delete button
                OutlinedButton(
                    onClick = onDelete,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = AdminDanger),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(AdminDanger)
                    )
                ) {
                    Icon(Icons.Default.Delete, null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Delete Flag")
                }
            }
        }
    }
}

@Composable
private fun CreateFeatureFlagDialog(
    onDismiss: () -> Unit,
    onCreate: (String, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Feature Flag") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Flag Name") },
                    placeholder = { Text("e.g., dark_mode_v2") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    placeholder = { Text("What does this flag control?") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreate(name, description) },
                enabled = name.isNotBlank() && description.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = AdminPrimary)
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

// --- Audit Log Tab ---

@Composable
private fun AuditLogTab(state: AdminState, adminManager: AdminManager) {
    var actionFilter by remember { mutableStateOf("") }
    var userFilter by remember { mutableStateOf("") }
    var showFilters by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Audit Log",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(onClick = { showFilters = !showFilters }) {
                    Icon(
                        Icons.Default.FilterList,
                        "Filters",
                        tint = if (showFilters) AdminPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(onClick = { adminManager.clearAuditLogFilters() }) {
                    Icon(Icons.Default.Refresh, "Refresh")
                }
            }
        }

        // Filter panel
        if (showFilters) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        "Filters",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = actionFilter,
                        onValueChange = { actionFilter = it },
                        label = { Text("Action Type") },
                        placeholder = { Text("e.g., login, api_call, error") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = userFilter,
                        onValueChange = { userFilter = it },
                        label = { Text("User ID or Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    // Quick action type filters
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.horizontalScroll(rememberScrollState())
                    ) {
                        listOf("login", "api_call", "error", "session_create", "export", "flag_toggle").forEach { action ->
                            FilterChip(
                                selected = actionFilter == action,
                                onClick = {
                                    actionFilter = if (actionFilter == action) "" else action
                                },
                                label = { Text(action, style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            adminManager.filterAuditLogs(
                                actionType = actionFilter.ifBlank { null },
                                userId = userFilter.ifBlank { null }
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AdminPrimary)
                    ) {
                        Text("Apply Filters")
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        Text(
            "${state.auditLogs.size} entries",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(state.auditLogs, key = { it.id }) { entry ->
                AuditLogCard(entry)
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
private fun AuditLogCard(entry: AuditLogEntry) {
    val actionColor = when {
        entry.action.contains("error", ignoreCase = true) -> AdminDanger
        entry.action.contains("login", ignoreCase = true) -> AdminSuccess
        entry.action.contains("api_call", ignoreCase = true) -> AdminInfo
        entry.action.contains("suspend", ignoreCase = true) -> AdminWarning
        entry.action.contains("flag", ignoreCase = true) -> AdminPrimary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Action icon
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(actionColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                val icon = when {
                    entry.action.contains("login") -> Icons.Default.Login
                    entry.action.contains("error") -> Icons.Default.Error
                    entry.action.contains("api_call") -> Icons.Default.Api
                    entry.action.contains("suspend") -> Icons.Default.Block
                    entry.action.contains("flag") -> Icons.Default.Flag
                    entry.action.contains("session") -> Icons.Default.Chat
                    entry.action.contains("export") -> Icons.Default.Download
                    else -> Icons.Default.Info
                }
                Icon(icon, null, modifier = Modifier.size(16.dp), tint = actionColor)
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        entry.action,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                        color = actionColor
                    )
                    Text(
                        formatTimestamp(entry.timestamp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(
                    entry.details,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Row {
                    Text(
                        entry.userName,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    entry.ipAddress?.let { ip ->
                        Text(
                            " | $ip",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

// --- System Health Tab ---

@Composable
private fun SystemHealthTab(state: AdminState, adminManager: AdminManager) {
    val scrollState = rememberScrollState()
    val health = state.systemHealth

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "System Health",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(onClick = { adminManager.loadSystemHealth() }) {
                    Icon(Icons.Default.Refresh, "Refresh")
                }
                FilledTonalButton(onClick = { adminManager.startHealthMonitoring() }) {
                    Icon(Icons.Default.PlayArrow, null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Auto-refresh")
                }
            }
        }

        if (health == null) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = AdminPrimary)
            }
        } else {
            // Overall status
            val overallStatus = when {
                health.cpuUsage > 0.9f || health.memoryUsage > 0.9f || health.errorRate > 0.1f -> "Critical"
                health.cpuUsage > 0.7f || health.memoryUsage > 0.7f || health.errorRate > 0.05f -> "Warning"
                else -> "Healthy"
            }
            val statusColor = when (overallStatus) {
                "Critical" -> AdminDanger
                "Warning" -> AdminWarning
                else -> AdminSuccess
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = statusColor.copy(alpha = 0.1f))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val statusIcon = when (overallStatus) {
                        "Critical" -> Icons.Default.Error
                        "Warning" -> Icons.Default.Warning
                        else -> Icons.Default.CheckCircle
                    }
                    Icon(statusIcon, null, tint = statusColor, modifier = Modifier.size(32.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            "System Status: $overallStatus",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = statusColor
                        )
                        Text(
                            "Uptime: ${formatUptime(health.uptime)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Metrics grid
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                HealthMetricCard(
                    title = "CPU Usage",
                    value = "${(health.cpuUsage * 100).toInt()}%",
                    progress = health.cpuUsage,
                    color = getHealthColor(health.cpuUsage),
                    icon = Icons.Default.Memory,
                    modifier = Modifier.weight(1f)
                )
                HealthMetricCard(
                    title = "Memory",
                    value = "${(health.memoryUsage * 100).toInt()}%",
                    progress = health.memoryUsage,
                    color = getHealthColor(health.memoryUsage),
                    icon = Icons.Default.Storage,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                HealthMetricCard(
                    title = "API Latency",
                    value = "${health.apiLatencyMs}ms",
                    progress = (health.apiLatencyMs / 1000f).coerceIn(0f, 1f),
                    color = getLatencyColor(health.apiLatencyMs),
                    icon = Icons.Default.Speed,
                    modifier = Modifier.weight(1f)
                )
                HealthMetricCard(
                    title = "Error Rate",
                    value = "${(health.errorRate * 100).toInt()}%",
                    progress = health.errorRate,
                    color = getHealthColor(health.errorRate),
                    icon = Icons.Default.BugReport,
                    modifier = Modifier.weight(1f)
                )
            }

            // Additional metrics
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Connection Details",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    QuickStatRow("Active Connections", "${health.activeConnections}")
                    QuickStatRow("API Latency", "${health.apiLatencyMs}ms")
                    QuickStatRow("Error Rate", "${(health.errorRate * 100).toInt()}%")
                    QuickStatRow("Uptime", formatUptime(health.uptime))
                }
            }

            // CPU usage visualization
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Resource Usage",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    ResourceUsageBar("CPU", health.cpuUsage, getHealthColor(health.cpuUsage))
                    Spacer(modifier = Modifier.height(10.dp))
                    ResourceUsageBar("Memory", health.memoryUsage, getHealthColor(health.memoryUsage))
                    Spacer(modifier = Modifier.height(10.dp))
                    ResourceUsageBar("Error Rate", health.errorRate, getHealthColor(health.errorRate))
                }
            }
        }

        Spacer(modifier = Modifier.height(80.dp))
    }
}

@Composable
private fun HealthMetricCard(
    title: String,
    value: String,
    progress: Float,
    color: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Progress bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(color.copy(alpha = 0.1f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress.coerceIn(0f, 1f))
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(3.dp))
                        .background(color)
                )
            }
        }
    }
}

@Composable
private fun ResourceUsageBar(label: String, usage: Float, color: Color) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(label, style = MaterialTheme.typography.bodySmall)
            Text(
                "${(usage * 100).toInt()}%",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                color = color
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(color.copy(alpha = 0.1f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(usage.coerceIn(0f, 1f))
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(4.dp))
                    .background(color)
            )
        }
    }
}

// --- Shared Components ---

@Composable
private fun KpiCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.05f))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    title,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun QuickStatRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun ModelUsageBar(model: String, calls: Long, maxCalls: Float) {
    val fraction = (calls.toFloat() / maxCalls).coerceIn(0f, 1f)
    val color = when {
        model.contains("opus") -> AdminPrimary
        model.contains("sonnet") -> AdminInfo
        model.contains("haiku") -> AdminSuccess
        model.contains("gpt") -> Color(0xFF10B981)
        model.contains("gemini") -> Color(0xFF4285F4)
        else -> Color.Gray
    }

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(model, style = MaterialTheme.typography.labelSmall)
            Text(formatNumber(calls), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
        }
        Spacer(modifier = Modifier.height(2.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(color.copy(alpha = 0.1f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(4.dp))
                    .background(color)
            )
        }
    }
}

@Composable
private fun MetricCircle(label: String, value: Any, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.1f))
                .border(2.dp, color, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                value.toString(),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun SimpleBarChartRow(
    label: String,
    value: Float,
    maxValue: Float,
    displayText: String,
    color: Color
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(label, style = MaterialTheme.typography.labelSmall)
            Text(displayText, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
        }
        Spacer(modifier = Modifier.height(2.dp))
        val fraction = if (maxValue > 0f) (value / maxValue).coerceIn(0f, 1f) else 0f
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .clip(RoundedCornerShape(5.dp))
                .background(color.copy(alpha = 0.1f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(5.dp))
                    .background(color)
            )
        }
    }
}

@Composable
private fun AuditLogRow(entry: AuditLogEntry) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                entry.action,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "${entry.userName} - ${entry.details}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Text(
            formatTimestamp(entry.timestamp),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun PlanChip(plan: String) {
    val color = when (plan) {
        "free" -> Color.Gray
        "pro_monthly" -> AdminInfo
        "pro_annual" -> AdminPrimary
        "enterprise" -> AdminSuccess
        else -> Color.Gray
    }
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            plan.replace("_", " ").replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun DetailLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

@Composable
private fun DetailValue(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodySmall,
        fontWeight = FontWeight.SemiBold
    )
}

// --- Utility Functions ---

private fun formatTimestamp(timestamp: Long): String {
    if (timestamp == 0L) return "N/A"
    val sdf = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
    return sdf.format(Date(timestamp))
}

private fun formatNumber(value: Long): String {
    return when {
        value >= 1_000_000 -> "${String.format("%.1f", value / 1_000_000.0)}M"
        value >= 1_000 -> "${String.format("%.1f", value / 1_000.0)}K"
        else -> value.toString()
    }
}

private fun formatUptime(millis: Long): String {
    val seconds = millis / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24
    return when {
        days > 0 -> "${days}d ${hours % 24}h"
        hours > 0 -> "${hours}h ${minutes % 60}m"
        minutes > 0 -> "${minutes}m ${seconds % 60}s"
        else -> "${seconds}s"
    }
}

private fun getHealthColor(value: Float): Color {
    return when {
        value > 0.9f -> AdminDanger
        value > 0.7f -> AdminWarning
        else -> AdminSuccess
    }
}

private fun getLatencyColor(latencyMs: Long): Color {
    return when {
        latencyMs > 500 -> AdminDanger
        latencyMs > 200 -> AdminWarning
        else -> AdminSuccess
    }
}
