package com.claudecontext.localdev.service

import com.claudecontext.localdev.data.models.*
import com.claudecontext.localdev.service.ai.MultiModelService
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class MultiModelServiceTest {

    private lateinit var service: MultiModelService

    @Before
    fun setup() {
        service = MultiModelService()
    }

    // --- Provider Configuration ---

    @Test
    fun `configureProvider stores config correctly`() {
        service.configureProvider(ModelProvider.ANTHROPIC, "test-key-123")

        val available = service.getAvailableModels()
        assertTrue(available.any { it.provider == ModelProvider.ANTHROPIC })
    }

    @Test
    fun `getAvailableModels returns only configured providers`() {
        assertEquals(0, service.getAvailableModels().size)

        service.configureProvider(ModelProvider.ANTHROPIC, "key1")
        val models = service.getAvailableModels()
        assertTrue(models.isNotEmpty())
        assertTrue(models.all { it.provider == ModelProvider.ANTHROPIC })
    }

    @Test
    fun `getAvailableModels returns multiple providers when configured`() {
        service.configureProvider(ModelProvider.ANTHROPIC, "key1")
        service.configureProvider(ModelProvider.OPENAI, "key2")

        val models = service.getAvailableModels()
        val providers = models.map { it.provider }.toSet()
        assertTrue(providers.contains(ModelProvider.ANTHROPIC))
        assertTrue(providers.contains(ModelProvider.OPENAI))
    }

    @Test
    fun `configureProvider with custom base URL`() {
        service.configureProvider(ModelProvider.CUSTOM, "key", "https://custom.api.com/v1")
        // Should not throw
        val models = service.getAvailableModels()
        // Custom provider has no catalog models, so this just verifies no crash
        assertNotNull(models)
    }

    // --- Routing Configuration ---

    @Test
    fun `setRoutingConfig updates routing state`() = runTest {
        val config = ModelRoutingConfig(
            primaryModel = "gpt-4o",
            fastModel = "gpt-4o-mini",
            autoRoute = false
        )
        service.setRoutingConfig(config)

        val current = service.routingConfig.first()
        assertEquals("gpt-4o", current.primaryModel)
        assertEquals("gpt-4o-mini", current.fastModel)
        assertFalse(current.autoRoute)
    }

    @Test
    fun `default routing config uses Claude Sonnet`() = runTest {
        val config = service.routingConfig.first()
        assertEquals("claude-sonnet-4-20250514", config.primaryModel)
        assertTrue(config.autoRoute)
    }

    // --- Model Catalog ---

    @Test
    fun `ModelCatalog contains expected providers`() {
        val providers = ModelCatalog.models.map { it.provider }.toSet()
        assertTrue(providers.contains(ModelProvider.ANTHROPIC))
        assertTrue(providers.contains(ModelProvider.OPENAI))
        assertTrue(providers.contains(ModelProvider.GOOGLE))
        assertTrue(providers.contains(ModelProvider.MISTRAL))
        assertTrue(providers.contains(ModelProvider.GROQ))
    }

    @Test
    fun `ModelCatalog getByProvider returns correct models`() {
        val anthropicModels = ModelCatalog.getByProvider(ModelProvider.ANTHROPIC)
        assertTrue(anthropicModels.isNotEmpty())
        assertTrue(anthropicModels.all { it.provider == ModelProvider.ANTHROPIC })
    }

    @Test
    fun `ModelCatalog getById finds models`() {
        val model = ModelCatalog.getById("claude-sonnet-4-20250514")
        assertNotNull(model)
        assertEquals("Claude Sonnet 4", model!!.displayName)
        assertEquals(ModelProvider.ANTHROPIC, model.provider)
    }

    @Test
    fun `ModelCatalog getById returns null for unknown model`() {
        val model = ModelCatalog.getById("nonexistent-model")
        assertNull(model)
    }

    @Test
    fun `ModelCatalog getByTier filters correctly`() {
        val fastModels = ModelCatalog.getByTier(ModelTier.FAST)
        assertTrue(fastModels.isNotEmpty())
        assertTrue(fastModels.all { it.tier == ModelTier.FAST })

        val premiumModels = ModelCatalog.getByTier(ModelTier.PREMIUM)
        assertTrue(premiumModels.isNotEmpty())
        assertTrue(premiumModels.all { it.tier == ModelTier.PREMIUM })
    }

    // --- Cost Estimate ---

    @Test
    fun `AiModel costEstimate formats correctly`() {
        val model = ModelCatalog.getById("claude-sonnet-4-20250514")!!
        assertTrue(model.costEstimate.contains("$"))
        assertTrue(model.costEstimate.contains("/1k"))
    }

    @Test
    fun `local model costEstimate shows free`() {
        val model = AiModel(
            id = "local-test",
            provider = ModelProvider.LOCAL,
            displayName = "Local Test",
            contextWindow = 4096,
            isLocal = true
        )
        assertEquals("Free (local)", model.costEstimate)
    }
}
