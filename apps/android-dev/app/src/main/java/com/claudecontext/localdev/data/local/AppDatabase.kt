package com.claudecontext.localdev.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.claudecontext.localdev.data.models.Project

@Database(
    entities = [Project::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun projectDao(): ProjectDao
}
