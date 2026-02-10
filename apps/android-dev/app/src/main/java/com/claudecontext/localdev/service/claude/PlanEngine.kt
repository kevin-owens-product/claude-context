package com.claudecontext.localdev.service.claude

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.shell.ShellExecutor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Strategic planning engine that researches the codebase, asks clarifying questions,
 * creates a structured step-by-step plan, and then executes it. Mirrors Cursor's Plan mode.
 */
@Singleton
class PlanEngine @Inject constructor(
    private val claudeApi: ClaudeApiService,
    private val agentEngine: AgentEngine,
    private val shell: ShellExecutor
) {

    private val _session = MutableStateFlow<PlanSession?>(null)
    val session: StateFlow<PlanSession?> = _session.asStateFlow()

    private var projectPath = ""
    private var projectLanguage = ProjectLanguage.OTHER

    companion object {
        private const val CLARIFY_PROMPT = """You are a senior software architect planning a feature implementation. Before creating a plan, ask clarifying questions to understand scope and constraints.

Respond with valid JSON:
{
  "questions": [
    "Question 1 about scope or approach?",
    "Question 2 about constraints or preferences?"
  ],
  "enough_context": false
}

If the request is clear enough to proceed without questions, set enough_context to true and questions to an empty array. Only ask 2-4 essential questions."""

        private const val RESEARCH_PROMPT = """You are a senior software architect. Research the codebase structure to understand how to implement the requested feature.

Given the project files and structure, identify:
1. Which files are relevant to the feature
2. Existing patterns and conventions
3. Dependencies and integration points
4. Potential risks or complexities

Respond with valid JSON:
{
  "findings": [
    {"file": "path/to/file", "summary": "What this file does", "relevance": "How it relates to the task"}
  ],
  "architecture_notes": "Summary of project architecture relevant to this task",
  "suggested_approach": "High-level approach recommendation"
}"""

        private const val PLAN_PROMPT = """You are a senior software architect creating a detailed implementation plan.

Create a structured, step-by-step plan as a Markdown document. Each step should be specific and actionable.

Respond with valid JSON:
{
  "title": "Plan title",
  "summary": "1-2 sentence summary",
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description of what to do",
      "files": ["paths/to/modify"],
      "depends_on": []
    }
  ],
  "estimated_files": ["all/files/that/will/be/touched"],
  "markdown": "# Full Plan Title\n\n## Summary\n...\n\n## Steps\n\n### 1. Step Title\n- [ ] Action item\n- [ ] Action item\n..."
}

Rules:
- Each step should be independently completable
- List specific file paths when known
- Include testing steps
- Order steps by dependency (do foundations first)
- Keep steps focused: one concern per step"""
    }

    fun configure(path: String, language: ProjectLanguage) {
        projectPath = path
        projectLanguage = language
        agentEngine.configure(path, language)
    }

    suspend fun startPlan(goal: String): PlanSession {
        val session = PlanSession(goal = goal, phase = PlanPhase.CLARIFY)
        _session.value = session
        return askClarifyingQuestions(session)
    }

    suspend fun askClarifyingQuestions(session: PlanSession): PlanSession {
        val updated = session.copy(phase = PlanPhase.CLARIFY)
        _session.value = updated

        val response = claudeApi.sendMessage(
            messages = listOf(
                ClaudeMessage(
                    role = MessageRole.USER,
                    content = "Goal: ${session.goal}\nProject: $projectPath\nLanguage: ${projectLanguage.displayName}"
                )
            ),
            systemPrompt = CLARIFY_PROMPT
        )

        val questions = parseClarifyingQuestions(response.content)
        val enoughContext = response.content.contains("\"enough_context\": true") ||
                response.content.contains("\"enough_context\":true")

        val result = if (enoughContext || questions.isEmpty()) {
            updated.copy(
                phase = PlanPhase.RESEARCH,
                messages = updated.messages + response
            )
        } else {
            updated.copy(
                questions = questions.map { ClarifyingQuestion(it) },
                messages = updated.messages + response
            )
        }

        _session.value = result

        if (result.phase == PlanPhase.RESEARCH) {
            return researchCodebase(result)
        }

        return result
    }

    suspend fun answerQuestions(session: PlanSession, answers: Map<String, String>): PlanSession {
        val answeredQuestions = session.questions.map { q ->
            q.copy(answer = answers[q.question] ?: q.answer)
        }

        val updated = session.copy(
            questions = answeredQuestions,
            phase = PlanPhase.RESEARCH
        )
        _session.value = updated

        return researchCodebase(updated)
    }

    suspend fun researchCodebase(session: PlanSession): PlanSession {
        val updated = session.copy(phase = PlanPhase.RESEARCH)
        _session.value = updated

        // Gather project structure
        val structureResult = shell.execute("find . -type f -name '*.${projectLanguage.extensions.firstOrNull() ?: "*"}' | head -50", projectPath)
        val treeResult = shell.execute("ls -R | head -100", projectPath)

        val answersContext = session.questions
            .filter { it.answer != null }
            .joinToString("\n") { "Q: ${it.question}\nA: ${it.answer}" }

        val response = claudeApi.sendMessage(
            messages = listOf(
                ClaudeMessage(
                    role = MessageRole.USER,
                    content = buildString {
                        appendLine("Goal: ${session.goal}")
                        appendLine("Language: ${projectLanguage.displayName}")
                        if (answersContext.isNotBlank()) {
                            appendLine("\nClarifications:\n$answersContext")
                        }
                        appendLine("\nProject files:\n${structureResult.stdout}")
                        appendLine("\nDirectory structure:\n${treeResult.stdout}")
                    }
                )
            ),
            systemPrompt = RESEARCH_PROMPT
        )

        val findings = parseResearchFindings(response.content)
        val result = updated.copy(
            researchFindings = findings,
            phase = PlanPhase.DRAFT,
            messages = updated.messages + response
        )
        _session.value = result

        return createPlan(result)
    }

    suspend fun createPlan(session: PlanSession): PlanSession {
        val updated = session.copy(phase = PlanPhase.DRAFT)
        _session.value = updated

        val findingsContext = session.researchFindings.joinToString("\n") {
            "- ${it.file}: ${it.summary} (${it.relevance})"
        }

        val answersContext = session.questions
            .filter { it.answer != null }
            .joinToString("\n") { "Q: ${it.question}\nA: ${it.answer}" }

        val response = claudeApi.sendMessage(
            messages = listOf(
                ClaudeMessage(
                    role = MessageRole.USER,
                    content = buildString {
                        appendLine("Goal: ${session.goal}")
                        appendLine("Language: ${projectLanguage.displayName}")
                        if (answersContext.isNotBlank()) {
                            appendLine("\nClarifications:\n$answersContext")
                        }
                        appendLine("\nCodebase research:\n$findingsContext")
                    }
                )
            ),
            systemPrompt = PLAN_PROMPT
        )

        val plan = parsePlan(response.content)
        val result = updated.copy(
            plan = plan,
            phase = PlanPhase.REVIEW,
            messages = updated.messages + response
        )
        _session.value = result
        return result
    }

    suspend fun updatePlan(session: PlanSession, updatedSteps: List<PlanStep>): PlanSession {
        val updatedPlan = session.plan?.copy(steps = updatedSteps)
        val result = session.copy(plan = updatedPlan)
        _session.value = result
        return result
    }

    suspend fun executePlan(session: PlanSession): PlanSession {
        val plan = session.plan ?: return session
        var current = session.copy(phase = PlanPhase.EXECUTE)
        _session.value = current

        for (step in plan.steps) {
            if (step.status == PlanStepStatus.SKIPPED) continue

            val updatedSteps = current.plan!!.steps.map {
                if (it.id == step.id) it.copy(status = PlanStepStatus.IN_PROGRESS) else it
            }
            current = current.copy(plan = current.plan!!.copy(steps = updatedSteps))
            _session.value = current

            // Execute each step using the agent engine
            val agentSession = agentEngine.startTask(
                "Execute this plan step:\n${step.title}\n${step.description}\n\nFiles to modify: ${step.files.joinToString(", ")}"
            )

            val stepStatus = when (agentSession.status) {
                AgentSessionStatus.COMPLETED -> PlanStepStatus.COMPLETED
                AgentSessionStatus.FAILED -> PlanStepStatus.FAILED
                else -> PlanStepStatus.COMPLETED
            }

            val progress = PlanStepProgress(
                stepId = step.id,
                status = stepStatus,
                output = agentSession.actions.lastOrNull()?.output ?: "",
                filesModified = agentSession.filesModified
            )

            val finalSteps = current.plan!!.steps.map {
                if (it.id == step.id) it.copy(status = stepStatus) else it
            }
            current = current.copy(
                plan = current.plan!!.copy(steps = finalSteps),
                executionProgress = current.executionProgress + progress
            )
            _session.value = current

            if (stepStatus == PlanStepStatus.FAILED) break
        }

        val done = current.copy(phase = PlanPhase.DONE)
        _session.value = done
        return done
    }

    suspend fun executeSingleStep(session: PlanSession, stepId: String): PlanSession {
        val plan = session.plan ?: return session
        val step = plan.steps.find { it.id == stepId } ?: return session

        val updatedSteps = plan.steps.map {
            if (it.id == stepId) it.copy(status = PlanStepStatus.IN_PROGRESS) else it
        }
        var current = session.copy(plan = plan.copy(steps = updatedSteps))
        _session.value = current

        val agentSession = agentEngine.startTask(
            "Execute this plan step:\n${step.title}\n${step.description}\n\nFiles: ${step.files.joinToString(", ")}"
        )

        val stepStatus = when (agentSession.status) {
            AgentSessionStatus.COMPLETED -> PlanStepStatus.COMPLETED
            AgentSessionStatus.FAILED -> PlanStepStatus.FAILED
            else -> PlanStepStatus.COMPLETED
        }

        val finalSteps = current.plan!!.steps.map {
            if (it.id == stepId) it.copy(status = stepStatus) else it
        }
        current = current.copy(
            plan = current.plan!!.copy(steps = finalSteps),
            executionProgress = current.executionProgress + PlanStepProgress(
                stepId = stepId,
                status = stepStatus,
                output = agentSession.actions.lastOrNull()?.output ?: "",
                filesModified = agentSession.filesModified
            )
        )
        _session.value = current
        return current
    }

    fun savePlanToFile(session: PlanSession): String? {
        val plan = session.plan ?: return null
        val filePath = "$projectPath/PLAN.md"
        val content = plan.markdownContent.ifEmpty {
            buildString {
                appendLine("# ${plan.title}")
                appendLine()
                appendLine("## Summary")
                appendLine(plan.summary)
                appendLine()
                appendLine("## Steps")
                plan.steps.forEachIndexed { i, step ->
                    val checkbox = when (step.status) {
                        PlanStepStatus.COMPLETED -> "[x]"
                        PlanStepStatus.IN_PROGRESS -> "[-]"
                        PlanStepStatus.SKIPPED -> "[~]"
                        PlanStepStatus.FAILED -> "[!]"
                        else -> "[ ]"
                    }
                    appendLine()
                    appendLine("### ${i + 1}. ${step.title}")
                    appendLine("- $checkbox ${step.description}")
                    if (step.files.isNotEmpty()) {
                        appendLine("- Files: ${step.files.joinToString(", ")}")
                    }
                }
            }
        }
        File(filePath).writeText(content)
        return filePath
    }

    fun reset() {
        _session.value = null
    }

    private fun parseClarifyingQuestions(content: String): List<String> {
        val regex = Regex(""""([^"]+\?)\"""")
        return regex.findAll(content).map { it.groupValues[1] }.toList()
    }

    private fun parseResearchFindings(content: String): List<ResearchFinding> {
        val fileRegex = Regex(""""file"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        val summaryRegex = Regex(""""summary"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        val relevanceRegex = Regex(""""relevance"\s*:\s*"((?:[^"\\]|\\.)*)"""")

        val files = fileRegex.findAll(content).map { it.groupValues[1] }.toList()
        val summaries = summaryRegex.findAll(content).map { it.groupValues[1] }.toList()
        val relevances = relevanceRegex.findAll(content).map { it.groupValues[1] }.toList()

        return files.mapIndexed { i, file ->
            ResearchFinding(
                file = file,
                summary = summaries.getOrElse(i) { "" },
                relevance = relevances.getOrElse(i) { "" }
            )
        }
    }

    private fun parsePlan(content: String): Plan {
        val titleRegex = Regex(""""title"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        val summaryRegex = Regex(""""summary"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        val markdownRegex = Regex(""""markdown"\s*:\s*"((?:[^"\\]|\\.)*)"""")

        val title = titleRegex.find(content)?.groupValues?.get(1) ?: "Implementation Plan"
        val summary = summaryRegex.find(content)?.groupValues?.get(1) ?: ""
        val markdown = markdownRegex.find(content)?.groupValues?.get(1)
            ?.replace("\\n", "\n")
            ?.replace("\\\"", "\"")
            ?: ""

        val steps = parseSteps(content)

        return Plan(
            title = title,
            summary = summary,
            steps = steps,
            markdownContent = markdown
        )
    }

    private fun parseSteps(content: String): List<PlanStep> {
        val stepTitleRegex = Regex(""""title"\s*:\s*"((?:[^"\\]|\\.)*)"""")
        val stepDescRegex = Regex(""""description"\s*:\s*"((?:[^"\\]|\\.)*)"""")

        // Find steps array region
        val stepsStart = content.indexOf("\"steps\"")
        if (stepsStart == -1) return emptyList()

        val stepsContent = content.substring(stepsStart)
        val titles = stepTitleRegex.findAll(stepsContent).map { it.groupValues[1] }.toList()
        val descs = stepDescRegex.findAll(stepsContent).map { it.groupValues[1] }.toList()

        return titles.mapIndexed { i, title ->
            PlanStep(
                title = title,
                description = descs.getOrElse(i) { "" }
            )
        }
    }
}
