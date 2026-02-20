window.addEventListener("DOMContentLoaded", () => {
  const cvTrigger = document.querySelector("[data-cv-open]");
  const cvPanel = document.querySelector("#cv-panel");
  const cvCloseTriggers = document.querySelectorAll("[data-cv-close]");
  const notesTrigger = document.querySelector("#notes");
  const notesPanel = document.querySelector("#notes-panel");
  const desktopContent = document.querySelector("#desktop-content");
  const notesCloseTriggers = document.querySelectorAll("[data-notes-close]");
  const notesTree = document.querySelector("#notes-tree");
  const notesPosts = document.querySelector("#notes-posts");
  const notesCount = document.querySelector("#notes-count");
  const notesSource = document.querySelector("#notes-source");
  const minimizeButtons = document.querySelectorAll("[data-window-minimize]");
  const maximizeButtons = document.querySelectorAll("[data-window-maximize]");
  const restoreButtons = document.querySelectorAll("[data-window-restore]");
  const notesRestoreButton = document.querySelector('[data-window-restore="notes"]');
  const cvRestoreButton = document.querySelector('[data-window-restore="cv"]');
  const notesMaximizeButton = document.querySelector('[data-window-maximize="notes"]');
  const cvMaximizeButton = document.querySelector('[data-window-maximize="cv"]');
  let notesLoaded = false;

  const escapeHtml = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const extractTitle = (markdown, fallback) => {
    const headingMatch = markdown.match(/^#\s+(.+)$/m);
    if (!headingMatch) return fallback;
    return headingMatch[1].trim();
  };

  const stripPrimaryHeading = (markdown) => {
    const withoutFirstHeading = markdown.replace(/^#\s+.+\r?\n+/m, "");
    return withoutFirstHeading.trim();
  };

  const renderMarkdown = (markdown) => {
    if (window.marked && typeof window.marked.parse === "function") {
      return window.marked.parse(markdown);
    }
    const fallbackHtml = escapeHtml(markdown)
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");
    return `<p>${fallbackHtml}</p>`;
  };

  const renderNotes = (entries) => {
    if (!notesTree || !notesPosts) return;

    if (!entries.length) {
      notesTree.innerHTML = "<li>No markdown files found.</li>";
      notesPosts.innerHTML = `
        <article class="notes-post">
          <fieldset>
            <legend>No posts yet</legend>
            <p>Add markdown files into <code>notes/</code> and list them in <code>notes/index.json</code>.</p>
          </fieldset>
        </article>
      `;
      if (notesCount) notesCount.textContent = "0 posts";
      return;
    }

    const treeHtml = entries
      .map(
        (entry, index) =>
          `<li><a class="notes-tree__link" href="#note-${index + 1}">${escapeHtml(entry.title)}</a></li>`
      )
      .join("");

    const postsHtml = entries
      .map(
        (entry, index) => `
          <article class="notes-post" id="note-${index + 1}">
            <fieldset>
              <legend>${escapeHtml(entry.title)}</legend>
              ${renderMarkdown(entry.markdown)}
            </fieldset>
          </article>
        `
      )
      .join("");

    notesTree.innerHTML = treeHtml;
    notesPosts.innerHTML = postsHtml;
    if (notesCount) notesCount.textContent = `${entries.length} posts`;
  };

  const loadNotes = async () => {
    if (notesLoaded) return;
    if (!notesTree || !notesPosts) return;

    try {
      const manifestResponse = await fetch("./notes/index.json", { cache: "no-store" });
      if (!manifestResponse.ok) throw new Error("manifest_missing");

      const manifest = await manifestResponse.json();
      const files = Array.isArray(manifest) ? manifest : manifest.files;
      const markdownFiles = Array.isArray(files)
        ? files.filter((file) => typeof file === "string" && file.toLowerCase().endsWith(".md"))
        : [];

      const entries = [];
      for (const fileName of markdownFiles) {
        const noteResponse = await fetch(`./notes/${encodeURIComponent(fileName)}`, {
          cache: "no-store",
        });
        if (!noteResponse.ok) continue;
        const markdown = await noteResponse.text();
        const fallbackTitle = fileName.replace(/\.md$/i, "");
        const title = extractTitle(markdown, fallbackTitle);
        const bodyMarkdown = stripPrimaryHeading(markdown);
        entries.push({
          title,
          markdown: bodyMarkdown || markdown,
        });
      }

      renderNotes(entries);
      if (notesSource) notesSource.textContent = "notes/index.json";
      notesLoaded = true;
    } catch (error) {
      notesTree.innerHTML = "<li>Cannot load notes manifest.</li>";
      notesPosts.innerHTML = `
        <article class="notes-post">
          <fieldset>
            <legend>Notes unavailable</legend>
            <p>Create <code>notes/index.json</code> and add your markdown file names.</p>
            <p>If you opened the file directly, run with a local server (not <code>file://</code>).</p>
          </fieldset>
        </article>
      `;
      if (notesCount) notesCount.textContent = "0 posts";
      if (notesSource) notesSource.textContent = "manifest missing";
      notesLoaded = false;
    }
  };

  const windows = {
    notes: {
      panel: notesPanel,
      openClass: "notes-open",
      restoreButton: notesRestoreButton,
      maximizeButton: notesMaximizeButton,
    },
    cv: {
      panel: cvPanel,
      openClass: "cv-open",
      restoreButton: cvRestoreButton,
      maximizeButton: cvMaximizeButton,
    },
  };

  const setDesktopVisible = (visible) => {
    if (!desktopContent) return;
    desktopContent.setAttribute("aria-hidden", visible ? "false" : "true");
  };

  const setMaximized = (name, value) => {
    const win = windows[name];
    if (!win?.panel) return;
    win.panel.classList.toggle("is-maximized", value);
    if (win.maximizeButton) {
      win.maximizeButton.setAttribute("aria-label", value ? "Restore" : "Maximize");
    }
  };

  const isOpen = (name) => document.body.classList.contains(windows[name].openClass);

  const hideWindow = (name) => {
    const win = windows[name];
    if (!win?.panel) return;
    win.panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove(win.openClass);
  };

  const showWindow = (name) => {
    const win = windows[name];
    if (!win?.panel) return;
    win.panel.setAttribute("aria-hidden", "false");
    document.body.classList.add(win.openClass);
  };

  const openWindow = (name) => {
    Object.keys(windows).forEach((key) => {
      if (key !== name) hideWindow(key);
    });

    showWindow(name);
    setDesktopVisible(false);

    const win = windows[name];
    if (win?.restoreButton) win.restoreButton.hidden = true;

    if (name === "notes") void loadNotes();
  };

  const closeWindow = (name) => {
    hideWindow(name);
    setMaximized(name, false);
    const win = windows[name];
    if (win?.restoreButton) win.restoreButton.hidden = true;
    setDesktopVisible(true);
  };

  const minimizeWindow = (name) => {
    hideWindow(name);
    const win = windows[name];
    if (win?.restoreButton) win.restoreButton.hidden = false;
    setDesktopVisible(true);
  };

  const toggleMaximize = (name) => {
    const win = windows[name];
    if (!win?.panel) return;
    const next = !win.panel.classList.contains("is-maximized");
    setMaximized(name, next);
  };

  if (cvTrigger && cvPanel) {
    cvTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      openWindow("cv");
    });
  }

  cvCloseTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      closeWindow("cv");
    });
  });

  if (notesTrigger && notesPanel) {
    notesTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      openWindow("notes");
    });
  }

  if (notesTree) {
    notesTree.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const link = target.closest(".notes-tree__link");
      if (!(link instanceof HTMLAnchorElement)) return;
      event.preventDefault();
      const noteId = link.getAttribute("href")?.replace("#", "");
      if (!noteId) return;
      const noteElement = document.getElementById(noteId);
      if (!noteElement) return;
      noteElement.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  notesCloseTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      closeWindow("notes");
    });
  });

  minimizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.windowMinimize;
      if (name === "notes" || name === "cv") {
        minimizeWindow(name);
      }
    });
  });

  maximizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.windowMaximize;
      if (name === "notes" || name === "cv") {
        toggleMaximize(name);
      }
    });
  });

  restoreButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.windowRestore;
      if (name === "notes" || name === "cv") {
        openWindow(name);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isOpen("cv")) {
      closeWindow("cv");
      return;
    }
    if (isOpen("notes")) {
      closeWindow("notes");
    }
  });
});
