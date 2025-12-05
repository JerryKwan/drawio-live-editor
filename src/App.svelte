<script lang="ts">
  import { onMount } from "svelte";
  import MonacoEditor from "./lib/components/editor/MonacoEditor.svelte";
  import DrawioEmbed from "./lib/components/drawio/DrawioEmbed.svelte";
  import ChatPanel from "./lib/components/chat/ChatPanel.svelte";
  import SettingsDialog from "./lib/components/settings/SettingsDialog.svelte";
  import ToastContainer from "./lib/components/ui/ToastContainer.svelte";
  import {
    Settings,
    MessageSquare,
    PanelLeft,
    PanelRight,
    Code,
  } from "lucide-svelte";
  import { isChatOpen } from "./lib/stores/appStore";

  let showSettings = $state(false);
  let showEditor = $state(false);

  // Panel widths in percentage
  let leftWidth = $state(40); // Diagram
  let rightWidth = $state(25); // Chat
  let isDraggingLeft = $state(false);
  let isDraggingRight = $state(false);

  function startResizeLeft() {
    isDraggingLeft = true;
  }
  function startResizeRight() {
    isDraggingRight = true;
  }

  function stopResize() {
    isDraggingLeft = false;
    isDraggingRight = false;
    document.body.style.cursor = "default";
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDraggingLeft && !isDraggingRight) return;

    // Safety check: if mouse button is not pressed, stop resizing
    if (e.buttons === 0) {
      stopResize();
      return;
    }

    const containerWidth = window.innerWidth;

    if (isDraggingLeft) {
      const newWidth = (e.clientX / containerWidth) * 100;
      if (newWidth > 10 && newWidth < 80) {
        leftWidth = newWidth;
      }
      document.body.style.cursor = "col-resize";
    }

    if (isDraggingRight) {
      // Right width is calculated from the right edge
      const newWidth = ((containerWidth - e.clientX) / containerWidth) * 100;
      if (newWidth > 10 && newWidth < 50) {
        rightWidth = newWidth;
      }
      document.body.style.cursor = "col-resize";
    }
  }
</script>

<svelte:window onmouseup={stopResize} onmousemove={handleMouseMove} />

<main
  class="h-screen w-screen bg-white text-neutral-900 overflow-hidden flex flex-col font-sans"
>
  <!-- Header -->
  <header
    class="h-12 border-b border-neutral-200 flex items-center justify-between px-4 bg-white shadow-sm z-10"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold shadow-sm"
      >
        D
      </div>
      <h1 class="font-semibold text-lg text-neutral-800 tracking-tight">
        AI Powered Draw.io Live Editor
      </h1>
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={() => (showSettings = true)}
        class="p-2 hover:bg-neutral-100 rounded-md transition-colors text-neutral-600 hover:text-neutral-900"
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>

      <button
        onclick={() => (showEditor = !showEditor)}
        class="p-2 hover:bg-neutral-100 rounded-md transition-colors {showEditor
          ? 'text-blue-600 bg-blue-50'
          : 'text-neutral-600'}"
        aria-label="Toggle XML Editor"
        title={showEditor ? "Hide XML Editor" : "Show XML Editor"}
      >
        <Code size={20} />
      </button>

      <button
        onclick={() => ($isChatOpen = !$isChatOpen)}
        class="p-2 hover:bg-neutral-100 rounded-md transition-colors {$isChatOpen
          ? 'text-blue-600 bg-blue-50'
          : 'text-neutral-600'}"
        aria-label="Toggle Chat"
      >
        <MessageSquare size={20} />
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <div class="flex-1 overflow-hidden flex relative">
    <!-- LEFT PANEL: Diagram -->
    <!-- When editor is hidden, this becomes flex-1 to fill space. When editor is shown, it uses fixed percentage width. -->
    <div
      style={showEditor ? `width: ${leftWidth}%` : ""}
      class="{showEditor
        ? 'flex-none'
        : 'flex-1'} flex flex-col min-w-[200px] relative group {isDraggingLeft ||
      isDraggingRight
        ? 'pointer-events-none select-none'
        : ''}"
    >
      <div
        class="h-9 bg-neutral-50 border-b border-neutral-200 flex items-center px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider select-none"
      >
        <PanelLeft size={14} class="mr-2" /> Diagram
      </div>
      <div class="flex-1 relative bg-white">
        <DrawioEmbed />
      </div>
    </div>

    {#if showEditor}
      <!-- RESIZER 1 -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="w-1 bg-neutral-100 hover:bg-blue-500 cursor-col-resize transition-colors duration-150 z-20 flex items-center justify-center relative"
        onmousedown={startResizeLeft}
      >
        <div class="w-[1px] h-full bg-neutral-200"></div>
      </div>

      <!-- CENTER PANEL: Editor -->
      <div
        class="flex-1 flex flex-col min-w-[200px] overflow-hidden {isDraggingLeft ||
        isDraggingRight
          ? 'pointer-events-none select-none'
          : ''}"
      >
        <div class="flex-1 relative bg-white">
          <MonacoEditor />
        </div>
      </div>
    {/if}

    <!-- RESIZER 2 -->
    {#if $isChatOpen}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="w-1 bg-neutral-100 hover:bg-blue-500 cursor-col-resize transition-colors duration-150 z-20 flex items-center justify-center relative"
        onmousedown={startResizeRight}
      >
        <div class="w-[1px] h-full bg-neutral-200"></div>
      </div>

      <!-- RIGHT PANEL: Chat -->
      <div
        style="width: {rightWidth}%"
        class="flex flex-col min-w-[250px] max-w-[50%] border-l border-neutral-200"
      >
        <ChatPanel />
      </div>
    {/if}
  </div>

  {#if showSettings}
    <SettingsDialog bind:open={showSettings} />
  {/if}

  <ToastContainer />

  {#if isDraggingLeft || isDraggingRight}
    <div class="fixed inset-0 z-50 bg-transparent cursor-col-resize"></div>
  {/if}
</main>
