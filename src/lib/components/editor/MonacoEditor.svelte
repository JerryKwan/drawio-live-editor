<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import * as monaco from "monaco-editor";
  import {
    currentXml,
    chatHistory,
    chatInput,
    isChatOpen,
    isEditorFocused,
    focusRestoreTrigger,
  } from "../../stores/appStore";
  import { Lock, Unlock } from "lucide-svelte";
  import "./worker";

  let editorContainer: HTMLDivElement;
  let editor: monaco.editor.IStandaloneCodeEditor;
  let isInternalChange = false;
  let isReadOnly = $state(true);

  onMount(() => {
    // Initialize Monaco Editor
    editor = monaco.editor.create(editorContainer, {
      value: $currentXml,
      language: "xml",
      theme: "vs",
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      readOnly: isReadOnly,
    });

    // Track focus
    const focusListener = editor.onDidFocusEditorText(() => {
      isEditorFocused.set(true);
    });
    const blurListener = editor.onDidBlurEditorText(() => {
      isEditorFocused.set(false);
    });

    // Restore focus trigger
    const unsubscribeFocusRestore = focusRestoreTrigger.subscribe((n) => {
      if (n > 0 && editor) {
        editor.focus();
      }
    });

    // ... (keep existing addAction)
    editor.addAction({
      id: "send-to-llm",
      label: "Send to LLM",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1,
      run: (ed) => {
        const selection = ed.getModel()?.getValueInRange(ed.getSelection()!);
        if (selection) {
          // Set chat input with selected XML
          chatInput.set(
            `Here is a snippet of the XML:\n\`\`\`xml\n${selection}\n\`\`\`\nCan you explain or modify this?`,
          );
          // Open chat if closed
          isChatOpen.set(true);
        }
      },
    });

    // Listen for editor changes
    editor.onDidChangeModelContent(() => {
      if (!isInternalChange) {
        const value = editor.getValue();
        currentXml.set(value);
      }
    });

    // Subscribe to store changes
    const unsubscribe = currentXml.subscribe((value) => {
      if (editor && value !== editor.getValue()) {
        isInternalChange = true;
        const position = editor.getPosition();
        editor.setValue(value);
        if (position) {
          editor.setPosition(position);
        }
        isInternalChange = false;
      }
    });

    return () => {
      unsubscribe();
      unsubscribeFocusRestore();
      focusListener.dispose();
      blurListener.dispose();
      editor.dispose();
    };
  });

  $effect(() => {
    if (editor) {
      editor.updateOptions({ readOnly: isReadOnly });
    }
  });
</script>

<div class="flex flex-col h-full w-full bg-white">
  <!-- Header -->
  <div
    class="h-9 border-b border-neutral-200 flex items-center justify-between px-4 bg-neutral-50 shrink-0"
  >
    <span class="font-medium text-xs text-neutral-500 uppercase tracking-wider"
      >XML Editor</span
    >

    <button
      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors
      {isReadOnly
        ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}"
      onclick={() => (isReadOnly = !isReadOnly)}
      title={isReadOnly ? "Click to Unlock" : "Click to Lock"}
    >
      {#if isReadOnly}
        <Lock size={12} />
        <span>Locked</span>
      {:else}
        <Unlock size={12} />
        <span>Unlocked</span>
      {/if}
    </button>
  </div>

  <!-- Editor Container -->
  <div class="flex-1 relative min-h-0">
    <div bind:this={editorContainer} class="absolute inset-0"></div>
  </div>
</div>

<style>
  /* Ensure container takes full height */
  :global(.monaco-editor) {
    padding-top: 8px;
  }
</style>
