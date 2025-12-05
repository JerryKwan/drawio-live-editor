<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { currentXml, settings } from "../../stores/appStore";

  let iframe: HTMLIFrameElement;
  let isInternalChange = false;
  let isDrawioReady = false;
  let lastSentXml = "";

  const drawioUrl = new URL($settings.drawio.baseUrl);
  // Configure Draw.io embed mode
  drawioUrl.searchParams.append("embed", "1");
  drawioUrl.searchParams.append("ui", "min");
  drawioUrl.searchParams.append("spin", "1");
  drawioUrl.searchParams.append("modified", "unsavedChanges");
  drawioUrl.searchParams.append("proto", "json");
  drawioUrl.searchParams.append("configure", "1");

  onMount(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "string") return;

      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch (err) {
        return;
      }

      switch (msg.event) {
        case "configure":
          // Configure draw.io
          iframe.contentWindow?.postMessage(
            JSON.stringify({
              action: "configure",
              config: {
                compressXml: false, // We want readable XML
              },
            }),
            "*",
          );
          break;

        case "init":
          isDrawioReady = true;
          // Load initial XML
          loadXml($currentXml);
          break;

        case "autosave":
        case "save":
          if (msg.xml) {
            // IGNORE ECHO: If the XML received is identical to what we just sent,
            // it's an echo from our own loadXml(). Ignore it to prevent loops.
            if (msg.xml === lastSentXml) return;

            isInternalChange = true;
            currentXml.set(msg.xml);
            isInternalChange = false;
          }
          break;

        case "export":
          // Handle export if needed
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    let debounceTimer: ReturnType<typeof setTimeout>;
    const unsubscribe = currentXml.subscribe((value) => {
      if (isDrawioReady && !isInternalChange) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadXml(value);
        }, 1000);
      }
    });

    const unsubscribeSettings = settings.subscribe((newSettings) => {
      // Reload if base URL changes? For now just assume it's static for the session or requires reload
    });

    return () => {
      window.removeEventListener("message", handleMessage);
      unsubscribe();
      unsubscribeSettings();
    };
  });

  function loadXml(xml: string) {
    if (!iframe?.contentWindow) return;

    // Store the XML we are sending to detect echoes
    lastSentXml = xml;

    iframe.contentWindow.postMessage(
      JSON.stringify({
        action: "load",
        xml: xml,
        autosave: 1, // Enable autosave events
      }),
      "*",
    );
  }
</script>

<iframe
  bind:this={iframe}
  src={drawioUrl.toString()}
  class="w-full h-full border-0"
  title="Draw.io Editor"
></iframe>
