package com.claudecontext.localdev.ui.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.claudecontext.localdev.data.models.Project
import com.claudecontext.localdev.data.repository.ProjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProjectListViewModel @Inject constructor(
    private val projectRepository: ProjectRepository
) : ViewModel() {

    val projects: Flow<List<Project>> = projectRepository.getAllProjects()

    fun deleteProject(project: Project) {
        viewModelScope.launch {
            projectRepository.deleteProject(project)
        }
    }
}
