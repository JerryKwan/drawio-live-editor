<script lang="ts">
  import {
    chatHistory,
    chatInput,
    currentXml,
    settings,
    type ChatMessage,
  } from "../../stores/appStore";
  import { llmService } from "../../services/llmService";
  import { toastStore } from "../../stores/toastStore";
  import {
    Send,
    Trash2,
    Loader2,
    Play,
    ArrowDownCircle,
    Paperclip,
    Sparkles,
    Zap,
    FileText,
    Wand2,
    Hammer,
    Info,
    XCircle,
  } from "lucide-svelte";
  import { marked } from "marked";
  import DOMPurify from "dompurify";

  import ConfirmationDialog from "../ui/ConfirmationDialog.svelte";

  let chatContainer: HTMLDivElement;
  let isLoading = $state(false);
  let autoScroll = $state(true);
  let inputHeight = $state(150);
  let isResizingInput = $state(false);
  let showActions = $state(false);
  let showClearConfirm = $state(false);
  let fileInput: HTMLInputElement;

  function startResizeInput(e: MouseEvent) {
    isResizingInput = true;
    window.addEventListener("mousemove", handleResizeInput);
    window.addEventListener("mouseup", stopResizeInput);
  }

  function handleResizeInput(e: MouseEvent) {
    if (!isResizingInput) return;
    const newHeight = window.innerHeight - e.clientY;
    // Clamp height between 100px and 60% of screen
    if (newHeight > 100 && newHeight < window.innerHeight * 0.6) {
      inputHeight = newHeight;
    }
  }

  function stopResizeInput() {
    isResizingInput = false;
    window.removeEventListener("mousemove", handleResizeInput);
    window.removeEventListener("mouseup", stopResizeInput);
  }

  function scrollToBottom(force: boolean = false) {
    if ((autoScroll || force) && chatContainer) {
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 0);
    }
  }

  async function handleSubmit() {
    if (!$chatInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: $chatInput,
      timestamp: Date.now(),
    };

    chatHistory.update((h) => [...h, userMessage]);
    const userInput = $chatInput;
    chatInput.set("");
    isLoading = true;
    scrollToBottom(true);

    try {
      // 对于绘图的应用，为避免上下文超过模型上下文长度限制，暂时不处理history
      // const messages = $chatHistory
      //   .filter((msg) => msg.role === "user" || msg.role === "assistant")
      //   .map((msg) => ({
      //     role: msg.role,
      //     content: msg.content,
      //   }));

      const messages: { role: "user"; content: string }[] = [
        {
          role: "user",
          content: userInput,
        },
      ];

      const assistantMsgId = Date.now();
      const assistantMessage: ChatMessage = {
        role: "assistant", // Type assertion if needed, but 'assistant' is valid
        content: "",
        timestamp: assistantMsgId,
      };

      chatHistory.update((h) => [...h, assistantMessage]);
      scrollToBottom(true);

      let fullContent = "";

      await llmService.sendMessage(
        messages,
        (chunk) => {
          fullContent += chunk;

          // Update the last message (which is our assistant message)
          chatHistory.update((h) => {
            const newHistory = [...h];
            const lastMsg = newHistory[newHistory.length - 1];
            // Verify it's the right one (optional but safe)
            if (
              lastMsg.role === "assistant" &&
              lastMsg.timestamp === assistantMsgId
            ) {
              lastMsg.content = fullContent;
            }
            return newHistory;
          });
          scrollToBottom();
        },
        $currentXml,
      );

      // Final update is mostly redundant if chunks handled it, but good for consistency
      // The message is already in history, just updated in-place via the chunks logic.
      scrollToBottom();

      if ($settings.preferences?.autoApplyDrawioSnippets) {
        applyCodeBlock(fullContent);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: "system",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      };
      chatHistory.update((h) => [...h, errorMessage]);
    } finally {
      isLoading = false;
    }
  }

  function clearChat() {
    showClearConfirm = true;
  }

  function handleConfirmClear() {
    chatHistory.set([]);
    showClearConfirm = false;
    toastStore.add("Chat history cleared", "success");
  }

  function clearDiagram() {
    currentXml.set("");
    toastStore.add("Diagram cleared to empty", "success");
    showActions = false;
  }

  function applyCodeBlock(content: string) {
    const xmlMatch = content.match(/```xml\s*([\s\S]*?)\s*```/);
    if (xmlMatch) {
      currentXml.set(xmlMatch[1]);
      toastStore.add("XML applied to editor", "success");
    }
  }

  function handleAction(action: string) {
    chatInput.set(action);
    showActions = false;
    // Focus textarea?
  }

  function handleUpload() {
    toastStore.add("File upload is currently in development.", "info");
    // fileInput.click(); // Disable actual click for now as per request
  }

  function onFileSelected(e: Event) {
    // ... (keep existing logic if we re-enable it later, or comment it out)
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      chatInput.update(
        (current) =>
          current + `\n\n[File: ${file.name}]\n\`\`\`\n${text}\n\`\`\``,
      );
      toastStore.add(`File "${file.name}" attached`, "success");
    };
    reader.readAsText(file);
  }

  function renderMarkdown(content: string): string {
    try {
      const html = marked.parse(content, { async: false }) as string;
      return DOMPurify.sanitize(html);
    } catch (e) {
      console.error("Markdown rendering error:", e);
      return content;
    }
  }
</script>

<ConfirmationDialog
  bind:open={showClearConfirm}
  title="Clear Chat History"
  message="Are you sure you want to clear all chat messages? This action cannot be undone."
  confirmText="Clear Messages"
  variant="danger"
  on:confirm={handleConfirmClear}
/>

<div class="flex flex-col h-full bg-white text-neutral-900 relative group/chat">
  <!-- Header -->
  <div
    class="h-9 border-b border-neutral-200 flex items-center justify-between px-4 bg-neutral-50 shrink-0"
  >
    <span class="font-medium text-xs text-neutral-500 uppercase tracking-wider"
      >AI Assistant</span
    >
    <div class="flex items-center gap-1">
      <button
        onclick={() => (autoScroll = !autoScroll)}
        class="p-1.5 rounded transition-colors {autoScroll
          ? 'text-blue-600 bg-blue-50'
          : 'text-neutral-400 hover:bg-neutral-200'}"
        title={autoScroll ? "Auto-scroll On" : "Auto-scroll Off"}
      >
        <ArrowDownCircle size={16} />
      </button>
      <button
        onclick={clearChat}
        class="p-1.5 hover:bg-neutral-200 rounded text-neutral-400 hover:text-red-500 transition-colors"
        title="Clear Chat"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>

  <!-- Messages -->
  <div
    bind:this={chatContainer}
    class="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
  >
    {#if $chatHistory.length === 0}
      <div class="text-center text-neutral-400 mt-10 text-sm">
        <p>Ask me anything about your diagram.</p>
        <p class="mt-2 text-xs">I can see the current diagram structure.</p>
      </div>
    {/if}

    {#each $chatHistory as msg, i}
      <div
        class="flex flex-col gap-1 {msg.role === 'user'
          ? 'items-end'
          : 'items-start'}"
      >
        <div
          class="max-w-[90%] rounded-2xl px-4 py-2.5 text-sm shadow-sm
          {msg.role === 'user' || msg.role === 'system'
            ? 'whitespace-pre-wrap'
            : 'markdown-content'}
          {msg.role === 'user'
            ? 'bg-blue-600 text-white rounded-br-none'
            : msg.role === 'system'
              ? 'bg-red-50 text-red-800 border border-red-100'
              : 'bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-bl-none'}"
        >
          {#if msg.role === "assistant"}
            {@html renderMarkdown(msg.content)}
          {:else}
            {msg.content}
          {/if}
        </div>
        {#if msg.role === "assistant" && msg.content.includes("```xml") && (!isLoading || i !== $chatHistory.length - 1)}
          <button
            class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium ml-2"
            onclick={() => applyCodeBlock(msg.content)}
          >
            <Play size={12} /> Apply to Editor
          </button>
        {/if}
      </div>
    {/each}

    {#if isLoading}
      <div class="flex items-center gap-2 text-neutral-400 text-xs ml-2">
        <Loader2 size={12} class="animate-spin" />
        Thinking...
      </div>
    {/if}
  </div>

  <!-- Resize Handle -->
  <div
    class="h-1 bg-transparent hover:bg-blue-500/50 cursor-row-resize transition-colors z-10 shrink-0 opacity-0 group-hover/chat:opacity-100"
    onmousedown={startResizeInput}
  ></div>

  <!-- Input Area -->
  <div
    class="bg-white relative shrink-0 flex flex-col p-2 pt-2"
    style="height: {inputHeight}px"
  >
    <!-- Command Suggestions (Slash) -->
    {#if $chatInput === "/"}
      <div
        class="absolute bottom-16 left-4 right-4 mb-2 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-10 animate-in slide-in-from-bottom-2 ring-1 ring-black/5"
      >
        <div class="p-1">
          <button
            class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-2"
            onclick={() => chatInput.set("/explain ")}
          >
            <span
              class="font-mono text-xs bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-600"
              >/explain</span
            > Explain diagram
          </button>
          <button
            class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-2"
            onclick={() => chatInput.set("/fix ")}
          >
            <span
              class="font-mono text-xs bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-600"
              >/fix</span
            > Fix issues
          </button>
          <button
            class="w-full text-left px-4 py-2 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-2"
            onclick={() => chatInput.set("/optimize ")}
          >
            <span
              class="font-mono text-xs bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-600"
              >/optimize</span
            > Optimize XML
          </button>
        </div>
      </div>
    {/if}

    <div
      class="flex-1 flex flex-col relative bg-neutral-50 border border-neutral-200 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm hover:border-neutral-300"
    >
      <textarea
        bind:value={$chatInput}
        onkeydown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Type a message or / for commands..."
        class="flex-1 w-full bg-transparent border-none focus:ring-0 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 resize-none focus:outline-none"
      ></textarea>

      <!-- Bottom Toolbar -->
      <div class="flex items-center justify-between px-2 pb-2 mt-auto">
        <div class="flex items-center gap-1">
          <!-- Actions Menu Button Wrapper -->
          <div class="relative">
            <button
              class="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors {showActions
                ? 'bg-blue-50 text-blue-600'
                : ''}"
              title="Actions"
              onclick={() => (showActions = !showActions)}
            >
              <Zap size={18} />
            </button>

            <!-- Actions Menu (Anchored to button) -->
            {#if showActions}
              <div
                class="absolute bottom-full left-0 mb-2 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden z-20 w-56 animate-in slide-in-from-bottom-2 ring-1 ring-black/5"
              >
                <div class="p-1">
                  <button
                    class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-3 transition-colors"
                    onclick={() => handleAction("Create a diagram of ")}
                  >
                    <FileText size={16} class="text-blue-500" />
                    <span>Create Diagram...</span>
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-3 transition-colors"
                    onclick={clearDiagram}
                  >
                    <XCircle size={16} class="text-red-500" />
                    <span>Clear Diagram</span>
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-3 transition-colors"
                    onclick={() => handleAction("Beautify this diagram by ")}
                  >
                    <Wand2 size={16} class="text-purple-500" />
                    <span>Beautify...</span>
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-3 transition-colors"
                    onclick={() => handleAction("Refactor this diagram to ")}
                  >
                    <Hammer size={16} class="text-orange-500" />
                    <span>Refactor...</span>
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-lg text-sm text-neutral-700 flex items-center gap-3 transition-colors"
                    onclick={() => handleAction("Explain this diagram")}
                  >
                    <Info size={16} class="text-green-500" />
                    <span>Explain Diagram</span>
                  </button>
                </div>
              </div>
              <!-- Backdrop to close (fixed to viewport) -->
              <div
                class="fixed inset-0 z-10"
                onclick={() => (showActions = false)}
              ></div>
            {/if}
          </div>

          <button
            class="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
            title="Upload file (Text/XML)"
            onclick={handleUpload}
          >
            <Paperclip size={18} />
          </button>
          <input
            type="file"
            bind:this={fileInput}
            class="hidden"
            accept=".xml,.txt,.md,.json"
            onchange={onFileSelected}
          />
        </div>

        <button
          onclick={handleSubmit}
          disabled={!$chatInput.trim() || isLoading}
          class="p-2 bg-blue-600 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-all shadow-sm hover:shadow active:scale-95"
        >
          {#if isLoading}
            <Loader2 size={18} class="animate-spin" />
          {:else}
            <Send size={18} />
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  /* Basic Markdown Styles for Chat */
  :global(.markdown-content p) {
    margin-bottom: 0.75em;
  }
  :global(.markdown-content p:last-child) {
    margin-bottom: 0;
  }
  :global(.markdown-content ul),
  :global(.markdown-content ol) {
    margin-left: 1.5em;
    margin-bottom: 0.75em;
    list-style-type: disc;
  }
  :global(.markdown-content ol) {
    list-style-type: decimal;
  }
  :global(.markdown-content pre) {
    background-color: #f3f4f6;
    padding: 0.75em;
    border-radius: 0.5em;
    overflow-x: auto;
    margin-bottom: 0.75em;
    font-family: monospace;
    font-size: 0.9em;
  }
  :global(.markdown-content code) {
    background-color: #f3f4f6; /* Neutral 100 */
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    font-family: monospace;
    font-size: 0.9em;
  }
  :global(.markdown-content pre code) {
    background-color: transparent;
    padding: 0;
  }
  :global(.markdown-content h1),
  :global(.markdown-content h2),
  :global(.markdown-content h3) {
    font-weight: 600;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }
  :global(.markdown-content h1) {
    font-size: 1.25em;
  }
  :global(.markdown-content h2) {
    font-size: 1.1em;
  }
  :global(.markdown-content blockquote) {
    border-left: 3px solid #e5e7eb;
    padding-left: 1em;
    color: #6b7280;
    margin-bottom: 0.75em;
  }
  :global(.markdown-content a) {
    color: #2563eb;
    text-decoration: underline;
  }
</style>
