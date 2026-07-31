/* Anovo Chrome Extension — Background Service Worker */

const TOOLS = [
  { id: "humanize", title: "Humanize with Anovo" },
  { id: "paraphrase", title: "Paraphrase with Anovo" },
  { id: "grammar", title: "Grammar Check with Anovo" },
  { id: "summarize", title: "Summarize with Anovo" },
  { id: "translate", title: "Translate with Anovo" },
  { id: "tone", title: "Detect Tone with Anovo" },
];

// Create context menu items and register side panel on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
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

    chrome.contextMenus.create({
      id: "anovo-sidebar",
      title: "Open Anovo Sidebar",
      contexts: ["page", "selection"],
    });
  });

  // Enable side panel
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({ path: "sidebar.html", enabled: true });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "anovo-sidebar") {
    if (chrome.sidePanel) {
      chrome.sidePanel.open({ windowId: tab.windowId });
    }
    return;
  }

  if (!info.menuItemId.toString().startsWith("anovo-")) return;

  const toolId = info.menuItemId.toString().replace("anovo-", "");
  const text = info.selectionText || "";

  if (!text.trim()) return;

  showSelectionWorkspace(tab.id, toolId, text);
});

async function showSelectionWorkspace(tabId, tool, text) {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["content.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await chrome.tabs.sendMessage(tabId, {
      action: "process",
      tool,
      text,
    });
  } catch (error) {
    console.warn("Anovo cannot run on this browser page.", error);
  }
}

// Listen for messages from popup to open sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openSidebar") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && chrome.sidePanel) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId });
      }
    });
    sendResponse({ ok: true });
  }
});
