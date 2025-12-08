<script lang="ts">
  import {
    settings,
    type AppSettings,
    type LLMProfile,
  } from "../../stores/appStore";
  import { llmService } from "../../services/llmService";
  import { toastStore } from "../../stores/toastStore";
  import {
    SYSTEM_PROVIDER_DEFAULTS,
    OPENAI_COMPATIBLE_PROVIDER_DEFAULTS,
    DRAWIO_DEFAULTS,
  } from "../../config";
  import ConfirmationDialog from "../ui/ConfirmationDialog.svelte";
  import {
    X,
    Save,
    Bot,
    PenTool,
    RotateCcw,
    Sliders,
    Plus,
    Trash2,
    Edit2,
    ArrowLeft,
    PlugZap,
    Loader2,
    Shield,
    Globe,
  } from "lucide-svelte";

  let { open = $bindable() } = $props();

  let localSettings = $state<AppSettings>(
    JSON.parse(JSON.stringify($settings)),
  );
  let activeTab = $state<"llm" | "drawio" | "preferences">("llm");

  // Profile Management State
  let editingProfileId = $state<string | null>(null);
  let isEditing = $state(false);
  let tempProfile = $state<LLMProfile | null>(null);
  let isTestingConnection = $state(false);

  // Confirmation State
  let confirmOpen = $state(false);
  let confirmTitle = $state("");
  let confirmMessage = $state("");
  let confirmAction: (() => void) | null = null;
  let confirmVariant = $state<"danger" | "default">("default");

  function save() {
    settings.set(localSettings);
    open = false;
  }

  // Reset state when dialog opens
  $effect(() => {
    if (open) {
      localSettings = JSON.parse(JSON.stringify($settings));
      isEditing = false;
      tempProfile = null;
      editingProfileId = null;
    }
  });

  // --- Profile Logic ---

  function createProfile() {
    // Start with minimal structure, provider defaults fill the rest
    tempProfile = {
      id: crypto.randomUUID(),
      name: "New Profile",
      provider: "openai-compatible",
      ...OPENAI_COMPATIBLE_PROVIDER_DEFAULTS,
    };
    isEditing = true;
    editingProfileId = null;
  }

  function editProfile(profile: LLMProfile) {
    tempProfile = { ...profile };
    // Ensure provider exists for legacy/migrated profiles - safely fallback to openai-compatible if missing
    if (!tempProfile.provider) {
      tempProfile.provider = "openai-compatible";
    }
    isEditing = true;
    editingProfileId = profile.id;
  }

  function setProviderType(type: "system" | "openai-compatible") {
    if (!tempProfile) return;
    tempProfile.provider = type;

    if (type === "system") {
      Object.assign(tempProfile, SYSTEM_PROVIDER_DEFAULTS);
    } else {
      // When switching to OpenAI Compatible, apply defaults
      Object.assign(tempProfile, OPENAI_COMPATIBLE_PROVIDER_DEFAULTS);
    }
  }

  function triggerResetConfirmation() {
    confirmTitle = "Reset to Defaults";
    confirmMessage =
      "Are you sure you want to reset this profile? All custom settings for this provider will be lost.";
    confirmVariant = "danger";
    confirmAction = () => {
      if (!tempProfile) return;
      if (tempProfile.provider === "system") {
        Object.assign(tempProfile, SYSTEM_PROVIDER_DEFAULTS);
      } else {
        Object.assign(tempProfile, OPENAI_COMPATIBLE_PROVIDER_DEFAULTS);
      }
      toastStore.add("Profile reset to defaults", "success");
    };
    confirmOpen = true;
  }

  function triggerDeleteConfirmation(id: string) {
    if (localSettings.llmProfiles.length <= 1) {
      toastStore.add("Cannot delete the last profile.", "error");
      return;
    }
    confirmTitle = "Delete Profile";
    confirmMessage =
      "Are you sure you want to delete this profile? This action cannot be undone.";
    confirmVariant = "danger";
    confirmAction = () => {
      localSettings.llmProfiles = localSettings.llmProfiles.filter(
        (p) => p.id !== id,
      );
      if (localSettings.activeProfileId === id) {
        localSettings.activeProfileId = localSettings.llmProfiles[0].id;
      }
      toastStore.add("Profile deleted", "success");
    };
    confirmOpen = true;
  }

  function handleConfirm() {
    if (confirmAction) confirmAction();
  }

  function saveProfile() {
    if (!tempProfile) return;
    if (!tempProfile.name) {
      toastStore.add("Profile name is required.", "error");
      return;
    }

    if (editingProfileId) {
      // Update existing
      const index = localSettings.llmProfiles.findIndex(
        (p) => p.id === editingProfileId,
      );
      if (index !== -1) {
        localSettings.llmProfiles[index] = tempProfile;
      }
    } else {
      // Add new
      localSettings.llmProfiles = [...localSettings.llmProfiles, tempProfile];
    }
    isEditing = false;
    tempProfile = null;
    editingProfileId = null;
  }

  function cancelEdit() {
    isEditing = false;
    tempProfile = null;
    editingProfileId = null;
  }

  async function testConnection() {
    if (!tempProfile) return;
    isTestingConnection = true;
    try {
      await llmService.testConnection(tempProfile);
      toastStore.add("Connection successful!", "success");
    } catch (error) {
      toastStore.add(
        `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    } finally {
      isTestingConnection = false;
    }
  }

  function setActiveProfile(id: string) {
    localSettings.activeProfileId = id;
  }

  // --- Reset Logic ---
  function resetDrawioDefault() {
    localSettings.drawio.baseUrl = DRAWIO_DEFAULTS.baseUrl;
  }

  function resetPreferenceDefault(field: "autoApplyDrawioSnippets") {
    if (field === "autoApplyDrawioSnippets") {
      localSettings.preferences.autoApplyDrawioSnippets = false;
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity"
  >
    <div
      class="bg-white w-[700px] h-[650px] overflow-hidden rounded-2xl border border-neutral-200 shadow-2xl flex flex-col transform transition-all scale-100"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white"
      >
        <h2 class="text-xl font-semibold text-neutral-800 tracking-tight">
          Settings
        </h2>
        <button
          onclick={() => (open = false)}
          class="text-neutral-400 hover:text-neutral-600 transition-colors p-1 hover:bg-neutral-50 rounded-full"
        >
          <X size={20} />
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-neutral-100 px-6 gap-6 bg-neutral-50/30">
        <button
          type="button"
          class="py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 {activeTab ===
          'llm'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-neutral-500 hover:text-neutral-700'}"
          onclick={() => (activeTab = "llm")}
        >
          <Bot size={16} /> LLM Configuration
        </button>
        <button
          type="button"
          class="py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 {activeTab ===
          'drawio'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-neutral-500 hover:text-neutral-700'}"
          onclick={() => (activeTab = "drawio")}
        >
          <PenTool size={16} /> Draw.io Configuration
        </button>
        <button
          type="button"
          class="py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 {activeTab ===
          'preferences'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-neutral-500 hover:text-neutral-700'}"
          onclick={() => (activeTab = "preferences")}
        >
          <Sliders size={16} /> Preferences
        </button>
      </div>

      <!-- Content -->
      <div class="p-0 overflow-hidden bg-neutral-50/50 flex-1 relative">
        {#if activeTab === "llm"}
          <!-- LLM Settings -->
          <div
            class="absolute inset-0 overflow-y-auto p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {#if isEditing && tempProfile}
              <!-- Add/Edit Profile Form -->
              <div class="space-y-4">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <button
                      onclick={cancelEdit}
                      class="text-neutral-500 hover:text-neutral-700 p-1 hover:bg-neutral-200 rounded-full transition-colors"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h3 class="text-lg font-medium text-neutral-800">
                      {editingProfileId ? "Edit Profile" : "Add Profile"}
                    </h3>
                  </div>
                  <button
                    onclick={triggerResetConfirmation}
                    class="text-xs flex items-center gap-1 font-medium text-neutral-500 hover:text-blue-600 bg-neutral-100 hover:bg-blue-50 px-2 pl-2.5 py-1.5 rounded-full transition-colors"
                    title="Reset all fields to defaults"
                  >
                    Reset to Defaults <RotateCcw size={12} class="mr-1" />
                  </button>
                </div>

                <div class="space-y-3">
                  <label class="block text-sm font-medium text-neutral-700"
                    >Profile Name</label
                  >
                  <input
                    type="text"
                    bind:value={tempProfile.name}
                    class="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g., OpenAI, Local LLM"
                  />
                </div>

                <!-- Provider Type Selection -->
                <div class="space-y-2">
                  <label class="block text-sm font-medium text-neutral-700"
                    >Provider Type</label
                  >
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      onclick={() => setProviderType("system")}
                      class="flex items-center gap-3 p-3 rounded-xl border text-left transition-all {tempProfile.provider ===
                      'system'
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-neutral-200 hover:border-neutral-300'}"
                    >
                      <div class="p-2 bg-blue-100/50 text-blue-600 rounded-lg">
                        <Shield size={20} />
                      </div>
                      <div>
                        <div class="font-medium text-sm text-neutral-900">
                          System Provided
                        </div>
                        <div class="text-xs text-neutral-500">
                          Built-in configuration
                        </div>
                      </div>
                    </button>

                    <button
                      onclick={() => setProviderType("openai-compatible")}
                      class="flex items-center gap-3 p-3 rounded-xl border text-left transition-all {tempProfile.provider ===
                      'openai-compatible'
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-neutral-200 hover:border-neutral-300'}"
                    >
                      <div
                        class="p-2 bg-green-100/50 text-green-600 rounded-lg"
                      >
                        <Globe size={20} />
                      </div>
                      <div>
                        <div class="font-medium text-sm text-neutral-900">
                          OpenAI Compatible
                        </div>
                        <div class="text-xs text-neutral-500">
                          Custom API endpoint
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {#if tempProfile.provider === "system"}
                  <div
                    class="p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-600 flex gap-3"
                  >
                    <Shield size={18} class="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p class="font-medium text-neutral-900 mb-1">
                        System Managed Configuration
                      </p>
                      <p>
                        Endpoints, models, and keys are managed by the system to
                        ensure optimal compatibility. You can still adjust the
                        system prompt and generation parameters below.
                      </p>
                    </div>
                  </div>
                {:else}
                  <div
                    class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <label class="block text-sm font-medium text-neutral-700"
                      >Base URL</label
                    >
                    <input
                      type="text"
                      bind:value={tempProfile.baseUrl}
                      class="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>

                  <div
                    class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <label class="block text-sm font-medium text-neutral-700"
                      >API Key</label
                    >
                    <input
                      type="password"
                      bind:value={tempProfile.apiKey}
                      class="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="sk-..."
                    />
                  </div>

                  <div
                    class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <label class="block text-sm font-medium text-neutral-700"
                      >Model</label
                    >
                    <input
                      type="text"
                      bind:value={tempProfile.model}
                      class="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="gpt-4o"
                    />
                  </div>
                {/if}

                <div
                  class="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4"
                >
                  <div class="space-y-3">
                    <label class="block text-sm font-medium text-neutral-700"
                      >Temperature</label
                    >
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      bind:value={tempProfile.temperature}
                      class="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div class="space-y-3">
                    <label class="block text-sm font-medium text-neutral-700"
                      >Max Tokens</label
                    >
                    <input
                      type="number"
                      step="100"
                      bind:value={tempProfile.maxTokens}
                      class="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div class="space-y-3">
                  <label class="block text-sm font-medium text-neutral-700"
                    >System Prompt</label
                  >
                  <textarea
                    bind:value={tempProfile.systemPrompt}
                    class="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none"
                  ></textarea>
                </div>

                <div
                  class="flex justify-between items-center pt-4 border-t border-neutral-200 mt-4"
                >
                  <button
                    onclick={testConnection}
                    disabled={isTestingConnection}
                    class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {#if isTestingConnection}
                      <Loader2 size={16} class="animate-spin" /> Testing...
                    {:else}
                      <PlugZap size={16} /> Test Connection
                    {/if}
                  </button>
                  <div class="flex gap-2">
                    <button
                      onclick={cancelEdit}
                      class="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg"
                      >Cancel</button
                    >
                    <button
                      onclick={saveProfile}
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                      >Save Profile</button
                    >
                  </div>
                </div>
              </div>
            {:else}
              <!-- Profile List View -->
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3
                    class="text-sm font-medium text-neutral-500 uppercase tracking-wider"
                  >
                    Available Services
                  </h3>
                  <button
                    onclick={createProfile}
                    class="text-xs flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <Plus size={14} /> Add Service
                  </button>
                </div>

                <div class="space-y-2">
                  {#each localSettings.llmProfiles as profile (profile.id)}
                    <div
                      class="bg-white border text-left p-4 rounded-xl flex items-center justify-between group hover:border-blue-300 transition-all shadow-sm {localSettings.activeProfileId ===
                      profile.id
                        ? 'ring-2 ring-blue-500 border-blue-500'
                        : 'border-neutral-200'}"
                    >
                      <div class="flex-1 flex flex-col text-left mr-4">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-neutral-800"
                            >{profile.name}</span
                          >
                          {#if localSettings.activeProfileId === profile.id}
                            <span
                              class="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full"
                              >ACTIVE</span
                            >
                          {/if}
                        </div>
                        <div
                          class="text-xs text-neutral-500 mt-1 flex items-center gap-3"
                        >
                          {#if profile.provider === "system"}
                            <span class="flex items-center gap-1 text-blue-600"
                              ><Shield size={12} /> System Provided</span
                            >
                          {:else}
                            <span class="flex items-center gap-1 text-green-600"
                              ><Globe size={12} /> {profile.baseUrl}</span
                            >
                          {/if}
                          <span class="w-1 h-1 rounded-full bg-neutral-300"
                          ></span>
                          <span>{profile.model}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-1">
                        {#if localSettings.activeProfileId !== profile.id}
                          <button
                            onclick={() => setActiveProfile(profile.id)}
                            class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Set as Active"
                          >
                            Set Active
                          </button>
                        {/if}
                        <button
                          onclick={() => editProfile(profile)}
                          class="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onclick={() => triggerDeleteConfirmation(profile.id)}
                          class="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                          disabled={localSettings.llmProfiles.length <= 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {:else if activeTab === "preferences"}
          <!-- Preferences Settings -->
          <div
            class="absolute inset-0 overflow-y-auto p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-neutral-700 block"
                  >Auto-apply Draw.io Snippets</label
                >
                <button
                  onclick={() =>
                    resetPreferenceDefault("autoApplyDrawioSnippets")}
                  class="text-neutral-400 hover:text-blue-600 transition-colors"
                  title="Reset to default"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <div
                class="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-200"
              >
                <button
                  onclick={() =>
                    (localSettings.preferences.autoApplyDrawioSnippets =
                      !localSettings.preferences.autoApplyDrawioSnippets)}
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 {localSettings
                    .preferences.autoApplyDrawioSnippets
                    ? 'bg-blue-600'
                    : 'bg-neutral-200'}"
                >
                  <span class="sr-only">Enable auto-apply</span>
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {localSettings
                      .preferences.autoApplyDrawioSnippets
                      ? 'translate-x-6'
                      : 'translate-x-1'}"
                  />
                </button>
                <span class="text-sm text-neutral-600">
                  Automatically apply diagram changes from AI responses
                </span>
              </div>
              <p class="text-xs text-neutral-500 px-1">
                When enabled, XML code blocks from the AI will be immediately
                applied to the editor without requiring confirmation.
              </p>
            </div>
          </div>
        {:else}
          <!-- Draw.io Settings -->
          <div
            class="absolute inset-0 overflow-y-auto p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-neutral-700 block"
                  >Draw.io Base URL</label
                >
                <button
                  onclick={resetDrawioDefault}
                  class="text-neutral-400 hover:text-orange-600 transition-colors"
                  title="Reset to default"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <input
                type="text"
                bind:value={localSettings.drawio.baseUrl}
                class="w-full bg-white border border-neutral-200 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-shadow shadow-sm placeholder:text-neutral-400"
                placeholder="https://embed.diagrams.net"
              />
              <p class="text-xs text-neutral-500 flex items-center gap-1">
                <span
                  class="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"
                ></span>
                Requires page reload to take effect.
              </p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      {#if !isEditing}
        <div
          class="p-4 border-t border-neutral-100 flex justify-end gap-3 bg-white z-10"
        >
          <button
            onclick={() => (open = false)}
            class="px-5 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onclick={save}
            class="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<ConfirmationDialog
  bind:open={confirmOpen}
  title={confirmTitle}
  message={confirmMessage}
  variant={confirmVariant}
  on:confirm={handleConfirm}
/>
