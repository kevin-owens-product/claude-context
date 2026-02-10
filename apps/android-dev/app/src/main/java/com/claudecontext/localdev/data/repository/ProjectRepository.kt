package com.claudecontext.localdev.data.repository

import com.claudecontext.localdev.data.local.ProjectDao
import com.claudecontext.localdev.data.models.Project
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProjectRepository @Inject constructor(
    private val projectDao: ProjectDao
) {
    fun getAllProjects(): Flow<List<Project>> = projectDao.getAllProjects()

    suspend fun getProject(id: Long): Project? = projectDao.getProjectById(id)

    suspend fun createProject(project: Project): Long = projectDao.insertProject(project)

    suspend fun updateProject(project: Project) = projectDao.updateProject(project)

    suspend fun deleteProject(project: Project) = projectDao.deleteProject(project)

    suspend fun markOpened(id: Long) = projectDao.updateLastOpened(id)
}
