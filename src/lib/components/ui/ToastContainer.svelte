<script lang="ts">
  import { toastStore } from '../../stores/toastStore';
  import { fly } from 'svelte/transition';
  import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-svelte';

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle
  };

  const colors = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200'
  };
</script>

<div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-md pointer-events-none px-4">
  {#each $toastStore as toast (toast.id)}
    <div
      in:fly={{ y: -20, duration: 300 }}
      out:fly={{ y: -20, duration: 300 }}
      class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border {colors[toast.type]} bg-white"
    >
      <svelte:component this={icons[toast.type]} size={20} />
      <span class="text-sm font-medium flex-1">{toast.message}</span>
      <button 
        onclick={() => toastStore.remove(toast.id)}
        class="p-1 hover:bg-black/5 rounded-full transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  {/each}
</div>
