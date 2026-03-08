/* Anovo Chrome Extension — Background Service Worker */

const TOOLS = [
  { id: "humanize", title: "Humanize with Anovo" },
  { id: "paraphrase", title: "Paraphrase with Anovo" },
  { id: "grammar", title: "Grammar Check with Anovo" },
  { id: "summarize", title: "Summarize with Anovo" },
  { id: "translate", title: "Translate with Anovo" },
  { id: "tone", title: "Detect Tone with Anovo" },
];

// Create context menu items on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "anovo-parent",
    title: "Anovo",
    contexts: ["selection"],
  });

  for (const tool of TOOLS) {
    chrome.contextMenus.create({
      id: `anovo-${tool.id}`,
      parentId: "anovo-parent",
      title: tool.title,
      contexts: ["selection"],
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.menuItemId.toString().startsWith("anovo-") || !tab?.id) return;

  const toolId = info.menuItemId.toString().replace("anovo-", "");
  const text = info.selectionText || "";

  if (!text.trim()) return;

  chrome.tabs.sendMessage(tab.id, {
    action: "process",
    tool: toolId,
    text: text,
  });
});
