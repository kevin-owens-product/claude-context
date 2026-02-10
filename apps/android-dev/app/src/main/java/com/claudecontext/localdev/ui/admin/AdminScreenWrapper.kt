package com.claudecontext.localdev.ui.admin

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import com.claudecontext.localdev.service.admin.AdminManager
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class AdminViewModel @Inject constructor(
    val adminManager: AdminManager
) : ViewModel()

@Composable
fun AdminScreenWrapper(
    onBack: () -> Unit,
    viewModel: AdminViewModel = hiltViewModel()
) {
    AdminPanel(
        adminManager = viewModel.adminManager,
        onBack = onBack
    )
}
