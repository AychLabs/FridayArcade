(function () {
  "use strict";

  const CASES = window.TechDetectiveCases;
  const PROFILE_ID = "tech-detective";
  const RELATIONSHIPS = ["SUPPORTS", "CONTRADICTS", "RELATED TO", "OCCURRED BEFORE", "OCCURRED AFTER"];
  const DEFAULT_DIRECTORY_SORT = Object.freeze({ by: "name", direction: "asc", foldersFirst: true });
  const NAME_COLLATOR = new Intl.Collator(undefined, { sensitivity: "base" });
  const view = document.querySelector("#game-view");
  const header = document.querySelector("#case-header");
  const modalRoot = document.querySelector("#modal-root");
  const toastNode = document.querySelector("#toast");
  let toastTimer = 0;
  let pageMode = "title";
  let pendingRestartCaseId = null;
  let restartReturnScreen = null;
  let progress = loadProgress();
  let active = normalizeCaseState(progress.activeCaseState);
  if (active) {
    active.lastClock = Date.now();
    saveProgress();
  }

  function defaultProgress() {
    return { version: 1, tutorialCompleted: false, case001Completed: false, activeCaseId: null, activeCaseState: null, bestCase001: null };
  }

  function loadProgress() {
    const api = window.FridayArcadeProfile;
    const saved = api ? api.getGameStats(PROFILE_ID) : {};
    const clean = Object.assign(defaultProgress(), saved || {});
    if (!clean.activeCaseId || !clean.activeCaseState || !CASES[clean.activeCaseId]) {
      clean.activeCaseId = null;
      clean.activeCaseState = null;
    }
    return clean;
  }

  function normalizeCaseState(state) {
    if (!state) return null;
    const def = CASES[state.caseId];
    if (!def) return null;
    const hintCount = Math.max(0, Number(state.hintsUsed) || 0);
    const hintLimit = CASES[state.caseId]?.hints?.length || 0;
    state.unlockedHints = [...new Set(Array.isArray(state.unlockedHints)
      ? state.unlockedHints.filter(index => Number.isInteger(index) && index >= 0)
      : Array.from({ length: Math.min(hintCount, hintLimit) }, (_, index) => index))]
      .filter(index => index < hintLimit)
      .sort((a, b) => a - b);
    state.hintsUsed = state.unlockedHints.length;
    state.optionOrders = buildCaseOptionOrders(def, state.optionOrders);
    state.reconstructionOrder = normalizeOptionOrder(
      state.reconstructionOrder,
      (def.reconstruction || []).map(event => event.id)
    );
    return state;
  }

  function shuffled(values) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function normalizeOptionOrder(savedOrder, validIds) {
    const valid = new Set(validIds);
    const retained = [...new Set(Array.isArray(savedOrder) ? savedOrder : [])].filter(id => valid.has(id));
    const missing = validIds.filter(id => !retained.includes(id));
    return retained.concat(shuffled(missing));
  }

  function caseOptionSets(def) {
    const sets = Object.fromEntries(Object.entries(def.caseEndingOptionSets || {}).map(([setId, options]) => [
      setId,
      options.map(option => typeof option === "string" ? option : option.id)
    ]));
    (def.finalTheory?.questions || []).forEach(question => {
      sets[`theory.${question.id}`] = question.options.map(option => option.id);
    });
    if (def.finalTheory?.supportEvidence) sets["theory.support"] = def.finalTheory.supportEvidence.slice();
    return sets;
  }

  function buildCaseOptionOrders(def, savedOrders = {}) {
    return Object.fromEntries(Object.entries(caseOptionSets(def)).map(([setId, ids]) => [
      setId,
      normalizeOptionOrder(savedOrders?.[setId], ids)
    ]));
  }

  function checkpoint() {
    if (!active || active.completed) return;
    const now = Date.now();
    active.elapsedSeconds = (active.elapsedSeconds || 0) + Math.max(0, (now - (active.lastClock || now)) / 1000);
    active.lastClock = now;
  }

  function saveProgress() {
    checkpoint();
    progress.activeCaseId = active ? active.caseId : null;
    progress.activeCaseState = active ? Object.assign({}, active, { lastClock: Date.now() }) : null;
    if (window.FridayArcadeProfile) window.FridayArcadeProfile.updateGameStats(PROFILE_ID, progress);
  }

  function makeCaseState(caseId) {
    const def = CASES[caseId];
    return {
      version: 1, caseId, screen: "briefing", currentPath: [def.locations[0].id], selectedId: null,
      opened: [], inspected: [], evidence: [], interviewTopics: [], flags: {}, connections: [], deductions: [],
      leads: {}, unlockedHints: [], hintsUsed: 0, theoryAttempts: 0, elapsedSeconds: 0, lastClock: Date.now(), compareIds: [],
      boardA: null, boardB: null, optionOrders: buildCaseOptionOrders(def),
      reconstructionOrder: shuffled((def.reconstruction || []).map(event => event.id)),
      reconstructionCompleted: false, reconstructionAttempts: 0, theory: { what: "", why: "", identifiedFile: null, supports: [] },
      redHerringsCleared: [], meaningfulEvidence: [], completed: false, report: null, finderMode: "investigate", returnScreen: "hub"
    };
  }

  function caseDef() { return active ? CASES[active.caseId] : null; }
  function includes(list, value) { return Array.isArray(list) && list.includes(value); }
  function addUnique(list, value) { if (!list.includes(value)) list.push(value); }
  function esc(value) { const node = document.createElement("span"); node.textContent = String(value == null ? "" : value); return node.innerHTML; }
  function formatTime(seconds) { const total = Math.floor(Number(seconds) || 0); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }
  function currentElapsed() { return (active?.elapsedSeconds || 0) + (active && !active.completed ? Math.max(0, (Date.now() - active.lastClock) / 1000) : 0); }

  function toast(message, tone) {
    clearTimeout(toastTimer);
    toastNode.textContent = message;
    toastNode.className = `toast show${tone ? ` ${tone}` : ""}`;
    toastTimer = setTimeout(() => { toastNode.className = "toast"; }, 2800);
  }

  function allNodes(def) {
    const result = [];
    function walk(node, path) {
      const nextPath = path.concat(node.id);
      result.push({ node, path: nextPath });
      (node.children || []).forEach(child => walk(child, nextPath));
    }
    def.locations.forEach(root => walk(root, []));
    return result;
  }

  function nodeRecord(id) { return allNodes(caseDef()).find(record => record.node.id === id) || null; }
  function nodeById(id) { return nodeRecord(id)?.node || null; }
  function folderAtPath() { return nodeById(active.currentPath[active.currentPath.length - 1]) || caseDef().locations[0]; }
  function pathLabel(path) { return path.map(id => nodeById(id)?.name).filter(Boolean).join(" / "); }

  function sortValue(node, by) {
    if (by === "type") return node.type || "";
    if (by === "modified" || by === "created") return Date.parse(node.metadata?.[by] || "") || 0;
    if (by === "size") {
      const match = String(node.metadata?.size || "").match(/^([\d.]+)\s*(B|KB|MB|GB)?$/i);
      if (!match) return 0;
      const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
      return Number(match[1]) * (units[(match[2] || "B").toUpperCase()] || 1);
    }
    return node.name || "";
  }

  function sortedDirectoryEntries(entries, override) {
    const sort = Object.assign({}, DEFAULT_DIRECTORY_SORT, override || {});
    if (sort.by === "manual" || sort.by === "data") return entries.slice();
    const direction = sort.direction === "desc" ? -1 : 1;
    return entries.slice().sort((left, right) => {
      if (sort.foldersFirst && left.kind !== right.kind) return left.kind === "folder" ? -1 : 1;
      const leftValue = sortValue(left, sort.by);
      const rightValue = sortValue(right, sort.by);
      const comparison = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : NAME_COLLATOR.compare(String(leftValue), String(rightValue));
      return comparison * direction || NAME_COLLATOR.compare(left.name || "", right.name || "");
    });
  }

  function directoryEntries(folder) {
    return sortedDirectoryEntries(folder.children || [], folder.sort || caseDef().directorySort);
  }

  function evidenceInfo(id) {
    const def = caseDef();
    if (def.evidence[id]) return Object.assign({ id }, def.evidence[id]);
    const record = nodeRecord(id);
    if (record?.node.evidence) return Object.assign({ id, source: pathLabel(record.path.slice(0, -1)) }, record.node.evidence);
    return { id, title: id, detail: "Evidence record", source: "Case file" };
  }

  function addEvidence(id, announce = true) {
    if (!active || includes(active.evidence, id)) return false;
    addUnique(active.evidence, id);
    addUnique(active.meaningfulEvidence, id);
    refreshLeadStates();
    saveProgress();
    if (announce) toast(`EVIDENCE ADDED — ${evidenceInfo(id).title}`, "good");
    return true;
  }

  function setScreen(name) {
    if (!active) return showTitle();
    active.screen = name;
    saveProgress();
    render();
  }

  function setHeader(show) {
    header.hidden = !show;
    if (show && active) {
      document.querySelector("#case-number").textContent = caseDef().number;
      document.querySelector("#case-name").textContent = caseDef().title;
      header.querySelector('[data-action="board"]').hidden = active.screen === "briefing" || active.completed;
      header.querySelector('[data-action="notebook"]').hidden = active.screen === "briefing" || active.completed;
    }
  }

  function showTitle() {
    pageMode = "title";
    setHeader(false);
    const canContinue = Boolean(active && !active.completed);
    view.innerHTML = `<section class="screen title-screen">
      <div class="title-lockup"><div class="title-emblem" aria-hidden="true">⌕</div><p class="kicker">Friday Arcade presents</p>
      <h1>Tech <em>Detective</em></h1><p class="tagline">Every file leaves a trail. Follow the evidence.</p></div>
      <div class="menu-stack" data-menu>
        ${canContinue ? '<button class="menu-button" data-nav data-action="continue">Continue</button>' : ""}
        <button class="menu-button" data-nav data-action="case-files">Case Files</button>
        <button class="menu-button" data-nav data-action="how-to">How to Play</button>
        <a class="menu-button" data-nav href="../../index.html">Return to Friday Arcade</a>
      </div><p class="help-text">↑ ↓ / W S Select &nbsp; Enter / Space Confirm</p>
    </section>`;
    focusFirst();
  }

  function showCaseFiles() {
    pageMode = "casefiles";
    setHeader(false);
    const trainingStatus = progress.tutorialCompleted ? "COMPLETE — REPLAY AVAILABLE" : "REQUIRED TRAINING";
    const caseStatus = !progress.tutorialCompleted ? "LOCKED — COMPLETE TRAINING FILE 000" : progress.case001Completed ? "SOLVED — REPLAY AVAILABLE" : active?.caseId === "case001" ? "INVESTIGATION IN PROGRESS" : "AVAILABLE";
    const hasSavedProgress = caseId => Boolean(active && active.caseId === caseId && !active.completed);
    const debugMode = new URLSearchParams(window.location.search).get("debug") === "1";
    view.innerHTML = `<section class="screen panel-screen">
      <div class="screen-heading"><div><p class="kicker">Tech Detective archive</p><h1>Case Files</h1><p>Choose a file. A careful investigator checks timestamps before blaming the computer.</p></div><div class="screen-actions"><button class="secondary-button" data-action="title">Title Screen</button></div></div>
      <div class="case-grid">
        <div class="case-file-entry">
          <button class="case-card" data-nav data-case="training"><small>Training File 000</small><h2>The Misplaced Screenshot</h2><p>Avery took a screenshot minutes ago and cannot find it. Learn the tools of digital investigation.</p><span class="case-status">${trainingStatus}</span></button>
          ${hasSavedProgress("training") ? '<button class="danger-button start-over-button" data-nav data-action="start-over" data-case-id="training">Start Over</button>' : ""}
        </div>
        <div class="case-file-entry">
          <button class="case-card" data-nav data-case="case001" ${progress.tutorialCompleted ? "" : "disabled"}><small>Case 001</small><h2>The Vanishing Assignment</h2><p>Miles finished a volcano project last night. This morning, the final edits appear to have vanished.</p><span class="case-status">${caseStatus}</span></button>
          ${hasSavedProgress("case001") ? '<button class="danger-button start-over-button" data-nav data-action="start-over" data-case-id="case001">Start Over</button>' : ""}
        </div>
      </div>
      ${debugMode ? '<aside class="developer-tools"><div><small>Developer / testing</small><p>Clear only Tech Detective save data and simulate a new Tech Detective player.</p></div><button class="danger-button" data-action="reset-tech-progress">Reset Tech Detective Progress</button></aside>' : ""}
    </section>`;
    focusFirst();
  }

  function showHowTo() {
    pageMode = "howto";
    setHeader(false);
    view.innerHTML = `<section class="screen panel-screen"><div class="screen-heading"><div><p class="kicker">Field manual</p><h1>How to Play</h1><p>Investigate freely. Open files, inspect metadata, interview people, and connect evidence. The game records facts; you decide what they mean.</p></div></div>
      <div class="notebook-panel"><h2>Detective Controls</h2><div class="controls-grid">
        <p><b>Arrows / WASD</b><br>Move through selectable items.</p><p><b>Enter / Space</b><br>Open or activate a selection.</p>
        <p><b>I</b><br>Inspect the selected file's metadata.</p><p><b>N</b><br>Open the Detective Notebook.</p>
        <p><b>B</b><br>Open the Evidence Board.</p><p><b>Esc</b><br>Pause during a case.</p>
      </div><p class="narration">Detective's rule #1: a dramatic filename is not the same thing as evidence.</p><button class="primary-button" data-action="case-files">Open Case Files</button></div>
    </section>`;
    focusFirst();
  }

  function chooseCase(caseId) {
    if (caseId === "case001" && !progress.tutorialCompleted) return;
    if (active && active.caseId === caseId && !active.completed) return render();
    active = makeCaseState(caseId);
    saveProgress();
    render();
  }

  function renderBriefing() {
    setHeader(true);
    const def = caseDef();
    view.innerHTML = `<section class="screen"><article class="briefing-file">
      <p class="kicker">${esc(def.number)} // Briefing</p><h1>${esc(def.title)}</h1><h2>Client: ${esc(def.client)}</h2>
      <blockquote>“${active.caseId === "training" ? "I took a screenshot a few minutes ago. Now I can't find it." : "I finished it last night. This morning, all my final edits were gone."}”</blockquote>
      <p><strong>Objective:</strong> ${esc(def.objective)}</p>
      <p>${active.caseId === "training" ? "Use the computer, inspect metadata, collect evidence, interview Avery, and connect the matching clues." : "Explore Miles's computer, question him, and build an evidence-based explanation. You may investigate in any order."}</p>
      <button class="primary-button" data-action="begin-case">Begin Investigation</button>
      <button class="secondary-button" data-action="case-files">Return to Case Files</button>
    </article></section>`;
    focusFirst();
  }

  function refreshLeadStates() {
    if (!active || active.caseId !== "case001") return;
    const has = id => includes(active.evidence, id);
    const inspected = id => includes(active.inspected, id);
    active.leads = {
      "find-work": has("miles-10pm") && inspected("volcano-final") ? (inspected("really-final") ? "resolved" : "active") : "locked",
      "completed-version": inspected("really-final") ? (active.flags.coreVersionsCompared || ["volcano-final", "really-final"].every(id => includes(active.compareIds, id)) ? "resolved" : "active") : "locked",
      "why-downloads": inspected("really-final") ? (includes(active.deductions, "duplicate-copy") ? "resolved" : "active") : "locked",
      "confirm-export": has("miles-pdf") ? (includes(active.opened, "volcano-export") && inspected("volcano-export") ? "resolved" : "active") : "locked",
      reconstruct: caseReady() || active.reconstructionCompleted ? (active.reconstructionCompleted ? "resolved" : "active") : "locked"
    };
  }

  function caseProgressComplete(id) {
    const completed = {
      "statement-time": includes(active.evidence, "miles-10pm"),
      "expected-version": includes(active.inspected, "volcano-final"),
      "matching-project": includes(active.inspected, "really-final"),
      "outside-folder": includes(active.deductions, "duplicate-copy"),
      reconstruct: active.reconstructionCompleted
    };
    return Boolean(completed[id]);
  }

  function caseReady() {
    return active?.caseId === "case001" && ["wrong-working-file", "timeline-match", "duplicate-copy"].every(id => includes(active.deductions, id));
  }

  function renderHub() {
    setHeader(true);
    refreshLeadStates();
    const training = active.caseId === "training";
    const ready = training ? includes(active.deductions, "training-match") : caseReady();
    view.innerHTML = `<section class="screen panel-screen">
      <div class="screen-heading"><div><p class="kicker">${esc(caseDef().number)} // Investigation Hub</p><h1>${training ? "Training Desk" : "Open Investigation"}</h1><p>${training ? "Find the screenshot, speak with Avery, then connect the evidence." : "Choose where to investigate. No route is mandatory, and no filename is under oath."}</p></div>
      <div class="screen-actions">${training ? "" : `<button class="secondary-button assist-button" data-action="hint">Forensics Assistance${active.unlockedHints.length ? ` (${active.unlockedHints.length})` : ""}</button>`}<button class="secondary-button" data-action="notebook">Detective Notebook</button></div></div>
      <div class="hub-grid">
        <button class="destination" data-nav data-action="finder"><span class="destination-icon" aria-hidden="true">▣</span><small>Digital Environment</small><strong>${training ? "Avery's Computer" : "Miles's Mac"}</strong><span>Explore folders, open files, and inspect metadata.</span></button>
        <button class="destination" data-nav data-action="interview"><span class="destination-icon" aria-hidden="true">◉</span><small>Witness Interview</small><strong>Interview ${training ? "Avery" : "Miles"}</strong><span>Ask about the timeline and unlock topics with evidence.</span></button>
        <button class="destination" data-nav data-action="board"><span class="destination-icon" aria-hidden="true">⌘</span><small>Analysis Workspace</small><strong>Evidence Board</strong><span>Connect facts and develop deductions.</span></button>
      </div>
      ${ready ? `<div class="ready-banner"><span>${training ? "Evidence Match Established" : "Case Ready for Reconstruction"}</span><button class="primary-button" data-action="${training ? "training-theory" : "reconstruction"}">${training ? "Submit Finding" : "Reconstruct Events"}</button></div>` : ""}
      <p class="narration">${training ? "Small mysteries still deserve properly labeled evidence." : "Detective Ctrl-Alt-Dee suspects malware. Detective Ctrl-Alt-Dee also suspects every printer."}</p>
    </section>`;
    saveProgress();
    focusFirst();
  }

  function inspectSelected() {
    const node = nodeById(active.selectedId);
    if (!node || node.kind !== "file") return toast("Select a file to inspect.");
    addUnique(active.inspected, node.id);
    if (node.id === "volcano-final") active.flags.scienceTimestampSeen = true;
    if (node.id === "volcano-old-trash") active.flags.trashTimestampSeen = true;
    if (node.id === "really-final") active.flags.reallyTimestampSeen = true;
    if (node.id === "volcano-export") active.flags.exportTimestampSeen = true;
    refreshLeadStates();
    saveProgress();
    renderFinder();
    toast(`METADATA INSPECTED — ${node.name}`, "good");
  }

  function openSelected() {
    const node = nodeById(active.selectedId);
    if (!node) return;
    if (node.kind === "folder") {
      active.currentPath = nodeRecord(node.id).path;
      active.selectedId = null;
      saveProgress();
      return renderFinder();
    }
    addUnique(active.opened, node.id);
    if (node.id === "really-final") active.flags.reallyOpened = true;
    if (node.id === "volcano-export") active.flags.exportOpened = true;
    refreshLeadStates();
    saveProgress();
    renderFinder();
    toast(`FILE OPENED — ${node.name}`);
  }

  function renderInspector(node) {
    if (!node) return '<div class="inspector-empty"><p>Select a file or folder.<br><small>Press I to inspect a selected file.</small></p></div>';
    const inspected = includes(active.inspected, node.id);
    const opened = includes(active.opened, node.id);
    if (node.kind === "folder") return `<div class="preview-icon">▰</div><h2>${esc(node.name)}</h2><p class="path">${esc(pathLabel(nodeRecord(node.id).path))}</p><div class="file-actions"><button data-action="open-selected">Open Folder</button></div><p class="narration">${node.children.length} item${node.children.length === 1 ? "" : "s"}. Folders: the natural habitat of other folders.</p>`;
    const metadata = inspected ? `<dl class="metadata"><dt>Type</dt><dd>${esc(node.type)}</dd><dt>Location</dt><dd>${esc(pathLabel(nodeRecord(node.id).path.slice(0, -1)))}</dd><dt>Created</dt><dd>${esc(node.metadata.created)}</dd><dt>Modified</dt><dd>${esc(node.metadata.modified)}</dd><dt>Size</dt><dd>${esc(node.metadata.size)}</dd></dl>` : '<p class="identified-file">Metadata not inspected. Press <kbd>I</kbd> or choose Inspect.</p>';
    const preview = opened ? `<div class="preview"><h3>${esc(node.preview.heading)}</h3>${node.preview.completion ? `<p><strong>${esc(node.preview.completion)}</strong></p>` : ""}<ul>${node.preview.lines.map(line => `<li>${esc(line)}</li>`).join("")}</ul></div>` : '<p class="identified-file">File contents not opened.</p>';
    const relevantCompare = active.caseId === "case001" && /Volcano|ReallyFinal/i.test(node.name) && ["Pages Document", "PDF Document"].includes(node.type);
    return `<div class="preview-icon">${node.type.includes("Image") ? "▧" : node.type.includes("PDF") ? "PDF" : "▤"}</div><h2>${esc(node.name)}</h2><p class="path">${esc(pathLabel(nodeRecord(node.id).path.slice(0, -1)))}</p>
      ${metadata}<div class="file-actions"><button data-action="open-selected">${opened ? "Reopen" : "Open"}</button><button data-action="inspect-selected">Inspect</button>
      <button data-action="add-selected-evidence" ${!inspected || !node.evidence || includes(active.evidence, node.id) ? "disabled" : ""}>${includes(active.evidence, node.id) ? "Evidence Added" : "Add Evidence"}</button>
      ${relevantCompare ? `<button data-action="compare-selected">Compare${includes(active.compareIds, node.id) ? " ✓" : ""}</button>` : ""}
      ${active.finderMode === "identify" ? '<button data-action="identify-selected">Identify This File</button>' : ""}</div>${preview}`;
  }

  function renderFinder() {
    setHeader(true);
    const folder = folderAtPath();
    const node = nodeById(active.selectedId);
    const modeLabel = active.finderMode === "identify" ? "Identify the completed assignment" : "Simulated file system";
    view.innerHTML = `<section class="screen panel-screen">
      <div class="screen-heading"><div><p class="kicker">${modeLabel}</p><h1>${active.caseId === "training" ? "Avery's Computer" : "Miles's Mac"}</h1></div><div class="screen-actions"><button class="secondary-button" data-action="finder-return">${active.finderMode === "identify" ? "Back to Theory" : "Investigation Hub"}</button></div></div>
      <div class="finder-shell">
        <div class="finder-toolbar"><button data-action="folder-back" aria-label="Back one folder" ${active.currentPath.length <= 1 ? "disabled" : ""}>←</button><div class="breadcrumb">${esc(pathLabel(active.currentPath))}</div><button data-action="inspect-selected" aria-label="Inspect selected file">I</button></div>
        <nav class="finder-sidebar" aria-label="Locations"><small>Locations</small>${sortedDirectoryEntries(caseDef().locations, caseDef().locationSort || caseDef().directorySort).map(location => `<button data-location="${location.id}" class="${active.currentPath[0] === location.id ? "active" : ""}"><span>${location.name === "Trash" ? "⌫" : "▰"}</span>${esc(location.name)}</button>`).join("")}</nav>
        <div class="finder-list" role="listbox" aria-label="Files in ${esc(folder.name)}"><div class="finder-list-head"><span>Name</span><span>Type</span><span>Modified</span></div>
          ${(folder.children || []).length ? directoryEntries(folder).map(child => `<button class="file-row ${active.selectedId === child.id ? "selected" : ""}" data-file="${child.id}" data-nav role="option" aria-selected="${active.selectedId === child.id}"><span class="file-name"><i class="file-icon ${child.kind}">${child.kind === "folder" ? "▰" : child.type.includes("Image") ? "▧" : child.type.includes("PDF") ? "P" : "▤"}</i>${esc(child.name)}</span><span>${esc(child.type)}</span><span>${child.metadata ? esc(child.metadata.modified) : "—"}</span></button>`).join("") : '<p class="inspector-empty">This folder is empty.</p>'}
        </div><aside class="inspector" aria-label="File inspector">${renderInspector(node)}</aside>
      </div><p class="help-text">↑ ↓ / W S Select &nbsp; Enter Open &nbsp; I Inspect &nbsp; Esc Pause</p>
    </section>`;
  }

  function topicDefinitions() {
    if (active.caseId === "training") return [{
      id: "avery-time", title: "When did you take it?", unlocked: includes(active.evidence, "avery-screenshot"),
      response: "It was right around 1:42 PM. I had just finished the code example when I took it.", evidence: ["avery-statement"]
    }];
    const has = id => includes(active.evidence, id);
    const seen = id => includes(active.inspected, id) || includes(active.opened, id);
    return [
      { id: "assignment", title: "The Assignment", unlocked: true, response: "The version in my Science folder is missing my final conclusion, image, and Sources section. I know I finished those.", evidence: ["miles-assignment"] },
      { id: "last-night", title: "Last Night", unlocked: true, response: "I worked until roughly 10 PM. When I finished, I exported a PDF too.", evidence: ["miles-10pm", "miles-pdf"] },
      { id: "usual-save", title: "Where You Usually Save Files", unlocked: true, response: "Documents, then School, Science, Volcano Project. That's where I always keep this class's work.", evidence: ["miles-normal-folder"] },
      { id: "file-not-edited", title: "This File Wasn't Edited Last Night", unlocked: active.flags.scienceTimestampSeen, response: "That doesn't make sense. VolcanoFinal.pages is the one I remember using... but September 9 isn't last night.", effect: () => { active.flags.timelineMismatch = true; } },
      { id: "trash-file", title: "File in Trash", unlocked: active.flags.trashTimestampSeen, response: "Wait—there's a project in Trash. Doesn't that prove it got deleted? ...Oh. August 28. That was an outline I threw away weeks ago.", effect: () => { addUnique(active.redHerringsCleared, "trash-file"); } },
      { id: "really-final", title: "ReallyFinal.pages", unlocked: seen("really-final"), response: "Yes! That's the finished one. The image, the full conclusion, my sources—this is what I remember finishing.", effect: () => { active.flags.reallyConfirmed = true; } },
      { id: "why-downloads", title: "Why Is It in Downloads?", unlocked: active.flags.reallyConfirmed, response: "I honestly don't know. Maybe the Mac put it there? I definitely didn't choose Downloads on purpose.", effect: () => { active.flags.downloadsQuestioned = true; } },
      { id: "timestamp-match", title: "Timestamp Match", unlocked: has("miles-10pm") && active.flags.reallyTimestampSeen, response: "9:47 PM? Yes, that fits. I finished just before ten. That's exactly when I remember wrapping up.", effect: () => { active.flags.timestampConfirmed = true; } },
      { id: "exported-pdf", title: "The Exported PDF", unlocked: has("miles-pdf") && seen("volcano-export"), response: "That's the PDF I exported. It has the diagram and finished conclusion. I made it right after I finished editing.", effect: () => { active.flags.exportConfirmedByMiles = true; } },
      { id: "how-here", title: "How Did This File Get Here?", unlocked: active.flags.reallyConfirmed && active.flags.reallyTimestampSeen && active.flags.timestampConfirmed, response: "I remember now. I couldn't find the project, so I downloaded another copy. It opened, so I just kept working in it. That must have been ReallyFinal.pages.", evidence: ["miles-downloaded-copy"] }
    ];
  }

  function renderInterview() {
    setHeader(true);
    const training = active.caseId === "training";
    const topics = topicDefinitions().filter(topic => topic.unlocked);
    const last = active.flags.lastDialogue || (training ? "Avery is ready to answer a question once you have a screenshot to discuss." : "Miles is confused and worried, but he wants to help reconstruct what happened.");
    view.innerHTML = `<section class="screen panel-screen"><div class="screen-heading"><div><p class="kicker">Witness interview</p><h1>${training ? "Avery" : "Miles"}</h1><p>Questions unlock when the evidence gives you something specific to ask.</p></div><div class="screen-actions"><button class="secondary-button" data-action="hub">Investigation Hub</button></div></div>
      <div class="interview-layout"><aside class="character-card"><div class="portrait ${training ? "avery" : ""}" aria-label="Simple portrait of ${training ? "Avery" : "Miles"}"></div><h2>${training ? "Avery Chen" : "Miles Rivera"}</h2><p>${training ? "Student • Screenshot missing" : "Student • Volcano project apparently vanished"}</p><p class="narration">${training ? "Calm, slightly embarrassed, and checking the Desktop without seeing the Desktop." : "Confused, not deceptive. His filing system, however, has requested legal counsel."}</p></aside>
      <div class="dialogue-panel"><div class="speech"><strong>${training ? "Avery" : "Miles"}</strong><p>${esc(last)}</p></div><div class="topic-list">${topics.length ? topics.map(topic => `<button data-topic="${topic.id}" data-nav class="${includes(active.interviewTopics, topic.id) ? "done" : ""}">${esc(topic.title)}</button>`).join("") : `<p class="identified-file">No specific questions are available yet. Inspect and collect relevant evidence first.</p>`}</div></div></div>
    </section>`;
    focusFirst();
  }

  function askTopic(id) {
    const topic = topicDefinitions().find(item => item.id === id && item.unlocked);
    if (!topic) return;
    addUnique(active.interviewTopics, id);
    active.flags.lastDialogue = topic.response;
    (topic.evidence || []).forEach(evidenceId => addEvidence(evidenceId, false));
    if (topic.effect) topic.effect();
    refreshLeadStates();
    saveProgress();
    renderInterview();
    if (topic.evidence?.length) toast("STATEMENT ADDED TO EVIDENCE", "good");
    if (id === "trash-file") toast("RED HERRING CLEARED — TRASH FILE", "good");
  }

  function pairRule(a, b) {
    if (!a || !b || a === b) return null;
    return caseDef().connectionRules.find(rule =>
      (rule.a === a && rule.b === b) || (rule.a === b && rule.b === a)
    ) || null;
  }

  function evidenceCard(id) {
    const item = evidenceInfo(id);
    const selected = active.boardA === id || active.boardB === id;
    const awaitingPair = active.caseId === "case001" && active.boardA && !active.boardB;
    const possible = awaitingPair && id !== active.boardA && pairRule(active.boardA, id);
    const unrelated = awaitingPair && id !== active.boardA && !possible;
    return `<button class="evidence-card ${selected ? "selected" : ""} ${possible ? "possible" : ""} ${unrelated ? "deemphasized" : ""}" data-evidence="${id}" data-nav><small>${esc(item.source || "Evidence")}${possible ? '<em>Possible connection</em>' : ""}</small><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span></button>`;
  }

  function renderBoard() {
    setHeader(true);
    const def = caseDef();
    const a = active.boardA ? evidenceInfo(active.boardA) : null;
    const b = active.boardB ? evidenceInfo(active.boardB) : null;
    const inferred = active.caseId === "case001";
    const workingRule = pairRule(active.boardA, active.boardB);
    view.innerHTML = `<section class="screen panel-screen"><div class="screen-heading"><div><p class="kicker">Analysis workspace</p><h1>Evidence Board</h1><p>${inferred ? "Select two evidence cards. Related clues are emphasized, and Case 001 relationships are inferred automatically." : "Select two evidence cards, choose a relationship, and test the connection."} Unhelpful links never cost points.</p></div><div class="screen-actions"><button class="secondary-button" data-action="hub">Investigation Hub</button></div></div>
      <div class="board-layout"><section class="board-section"><h2>Evidence Tray</h2><div class="evidence-tray">${active.evidence.length ? active.evidence.map(evidenceCard).join("") : '<p class="identified-file">No evidence collected yet. Inspect files or interview a witness.</p>'}</div></section>
      <section class="board-section"><h2>Working Board</h2><div class="connection-builder"><div class="connection-slot">${a ? `<strong>${esc(a.title)}</strong>` : "Choose the first clue"}</div>
        <select id="relationship" aria-label="Relationship"><option value="">Choose relationship…</option>${RELATIONSHIPS.map(rel => `<option>${rel}</option>`).join("")}</select>
        <div class="connection-slot">${b ? `<strong>${esc(b.title)}</strong>` : "Choose the second clue"}</div>
        <button class="primary-button" data-action="connect" ${a && b ? "" : "disabled"}>Confirm Connection</button><button class="secondary-button" data-action="clear-board">Clear Working Board</button></div>
        <div class="connection-list">${active.connections.map(connection => `<div class="connection-record">${esc(evidenceInfo(connection.a).title)} <strong>${connection.verb}</strong> ${esc(evidenceInfo(connection.b).title)}</div>`).join("")}</div></section>
      <section class="board-section"><h2>Deductions</h2>${def.deductions.map(deduction => `<div class="deduction-card ${includes(active.deductions, deduction.id) ? "" : "locked"}"><small>${includes(active.deductions, deduction.id) ? "DEDUCTION ESTABLISHED" : "UNRESOLVED"}</small><strong>${includes(active.deductions, deduction.id) ? esc(deduction.title) : "Evidence connection needed"}</strong>${includes(active.deductions, deduction.id) ? `<p>${esc(deduction.detail)}</p>` : ""}</div>`).join("")}</section></div>
      ${(active.caseId === "training" && includes(active.deductions, "training-match")) ? '<div class="ready-banner"><span>Evidence Match Established</span><button class="primary-button" data-action="training-theory">Submit Finding</button></div>' : caseReady() ? '<div class="ready-banner"><span>Case Ready for Reconstruction</span><button class="primary-button" data-action="reconstruction">Reconstruct Events</button></div>' : ""}
    </section>`;
    if (inferred) {
      const relationship = document.createElement("div");
      relationship.className = "inferred-relationship";
      relationship.textContent = workingRule ? workingRule.verb : a ? "Choose an emphasized clue" : "Relationship inferred automatically";
      view.querySelector("#relationship")?.replaceWith(relationship);
      view.querySelector('[data-action="connect"]')?.remove();
    }
    focusFirst();
  }

  function normalizedRule(a, verb, b) {
    const rules = caseDef().connectionRules;
    let match = rules.find(rule => rule.a === a && rule.verb === verb && rule.b === b);
    if (match) return match;
    if (["SUPPORTS", "CONTRADICTS", "RELATED TO"].includes(verb)) match = rules.find(rule => rule.a === b && rule.verb === verb && rule.b === a);
    if (match) return match;
    if (verb === "OCCURRED AFTER") return rules.find(rule => rule.a === b && rule.verb === "OCCURRED BEFORE" && rule.b === a);
    if (verb === "OCCURRED BEFORE") return rules.find(rule => rule.a === b && rule.verb === "OCCURRED AFTER" && rule.b === a);
    return null;
  }

  function establishInferredConnection(rule) {
    const isNew = !includes(active.deductions, rule.deduction);
    if (!active.connections.some(connection => connection.deduction === rule.deduction)) {
      active.connections.push({ a: rule.a, verb: rule.verb, b: rule.b, deduction: rule.deduction });
    }
    addUnique(active.deductions, rule.deduction);
    active.boardA = active.boardB = null;
    refreshLeadStates();
    saveProgress();
    renderBoard();
    if (!isNew) return toast("Connection already recorded.", "good");
    const deduction = caseDef().deductions.find(item => item.id === rule.deduction);
    openModal(`<p class="kicker">Evidence connected // ${esc(rule.verb)}</p><h2>Deduction — ${esc(deduction.title)}</h2><p>${esc(deduction.detail)}</p><p class="narration">This deduction has been recorded on the Evidence Board and in the Detective Notebook.</p>`, "Deduction Established", '<button class="primary-button" data-modal-close>Continue on Evidence Board</button>');
  }

  function makeConnection() {
    if (active.caseId === "case001") {
      if (!active.boardA || !active.boardB) return toast("Choose two evidence cards.", "bad");
      const inferredRule = pairRule(active.boardA, active.boardB);
      if (inferredRule) return establishInferredConnection(inferredRule);
      active.boardB = null;
      saveProgress();
      renderBoard();
      return toast("No established connection. Try another clue; nothing was lost.", "bad");
    }
    const verb = document.querySelector("#relationship")?.value;
    if (!active.boardA || !active.boardB || !verb) return toast("Choose two clues and a relationship.", "bad");
    const rule = normalizedRule(active.boardA, verb, active.boardB);
    if (!rule) {
      active.boardA = active.boardB = null;
      saveProgress(); renderBoard();
      return toast("Those clues don't establish a useful connection yet.", "bad");
    }
    if (!active.connections.some(c => c.deduction === rule.deduction)) active.connections.push({ a: active.boardA, verb, b: active.boardB, deduction: rule.deduction });
    const isNew = !includes(active.deductions, rule.deduction);
    addUnique(active.deductions, rule.deduction);
    active.boardA = active.boardB = null;
    refreshLeadStates(); saveProgress(); renderBoard();
    toast(isNew ? `DEDUCTION — ${caseDef().deductions.find(d => d.id === rule.deduction).title}` : "Connection already recorded.", "good");
  }

  function renderLegacyNotebookContent() {
    refreshLeadStates();
    const def = caseDef();
    const leads = active.caseId === "case001" ? def.leads.filter(lead => active.leads[lead.id] !== "locked") : [];
    return `<div class="notebook-panel"><h2>Detective Notebook</h2><div class="notebook-section"><h3>Objective</h3><p>${esc(def.objective)}</p></div>
      ${leads.length ? `<div class="notebook-section"><h3>Leads</h3>${leads.map(lead => `<div class="lead ${active.leads[lead.id]}"><span class="lead-status">${active.leads[lead.id] === "resolved" ? "✓" : "○"}</span><div><strong>${esc(lead.title)}</strong><p>${esc(lead.detail)}</p></div></div>`).join("")}</div>` : ""}
      <div class="notebook-section"><h3>Factual Notes</h3>${active.evidence.length ? active.evidence.map(id => { const item = evidenceInfo(id); return `<div class="lead"><span class="lead-status">•</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div></div>`; }).join("") : "<p>No factual notes recorded yet.</p>"}</div></div>`;
  }

  function renderNotebookContent() {
    refreshLeadStates();
    const def = caseDef();
    const leads = active.caseId === "case001" ? def.leads.filter(lead => active.leads[lead.id] !== "locked") : [];
    const progressGoals = active.caseId === "case001" ? def.progressGoals || [] : [];
    const deductions = def.deductions.filter(deduction => includes(active.deductions, deduction.id));
    const progressHtml = progressGoals.length ? `<div class="notebook-section case-progress"><h3>Case Progress / Unresolved Questions</h3>${progressGoals.map(goal => {
      const complete = caseProgressComplete(goal.id);
      return `<div class="progress-goal ${complete ? "complete" : ""}"><span aria-hidden="true">${complete ? "✓" : "○"}</span><p>${esc(goal.text)}</p></div>`;
    }).join("")}</div>` : "";
    const leadsHtml = leads.length ? `<div class="notebook-section"><h3>Active Leads</h3>${leads.map(lead => {
      const resolved = active.leads[lead.id] === "resolved";
      return `<div class="lead ${resolved ? "resolved" : "active"}"><span class="lead-status">${resolved ? "RESOLVED" : "ACTIVE"}</span><div><strong>${esc(lead.title)}</strong><p>${esc(lead.detail)}</p></div></div>`;
    }).join("")}</div>` : "";
    const deductionHtml = deductions.length ? `<div class="notebook-section"><h3>Established Deductions</h3>${deductions.map(deduction => `<div class="notebook-deduction"><strong>DEDUCTION — ${esc(deduction.title)}</strong><p>${esc(deduction.detail)}</p></div>`).join("")}</div>` : "";
    const notesHtml = active.evidence.length ? active.evidence.map(id => {
      const item = evidenceInfo(id);
      return `<div class="lead factual-note"><span class="lead-status" aria-hidden="true">•</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div></div>`;
    }).join("") : "<p>No factual notes recorded yet.</p>";
    return `<div class="notebook-panel"><h2>Detective Notebook</h2><div class="notebook-section"><h3>Objective</h3><p>${esc(def.objective)}</p></div>
      ${progressHtml}${leadsHtml}${deductionHtml}
      <div class="notebook-section"><h3>Factual Notes</h3>${notesHtml}</div>
      ${active.caseId === "case001" ? `<button class="secondary-button assist-button" data-action="hint">Open Forensics Assistance${active.unlockedHints.length ? ` (${active.unlockedHints.length} unlocked)` : ""}</button>` : ""}</div>`;
  }

  function showNotebook() { openModal(renderNotebookContent(), "Notebook", '<button class="primary-button" data-modal-close>Return to Investigation</button>'); }

  function renderCompare() {
    setHeader(true);
    const [left, right] = active.compareIds.map(nodeById);
    if (!left || !right) return setScreen("finder");
    const rows = [
      ["Filename", left.name, right.name], ["Type", left.type, right.type],
      ["Location", pathLabel(nodeRecord(left.id).path.slice(0, -1)), pathLabel(nodeRecord(right.id).path.slice(0, -1))],
      ["Modified", left.metadata.modified, right.metadata.modified], ["Created", left.metadata.created, right.metadata.created],
      ["Completion", left.preview.completion || left.preview.heading, right.preview.completion || right.preview.heading], ["Size", left.metadata.size, right.metadata.size]
    ];
    const column = (node, index) => `<article class="compare-file"><h3>${esc(node.name)}</h3>${rows.map(row => `<div class="compare-row"><span>${esc(row[0])}</span><span class="${row[1] !== row[2] ? "compare-different" : ""}">${esc(row[index])}</span></div>`).join("")}</article>`;
    view.innerHTML = `<section class="screen panel-screen"><div class="screen-heading"><div><p class="kicker">File comparison</p><h1>Compare Versions</h1><p>Differences are highlighted for inspection. Their meaning is yours to establish.</p></div><div class="screen-actions"><button class="secondary-button" data-action="clear-compare">Choose Different Files</button><button class="secondary-button" data-action="finder">Return to Finder</button></div></div>
      <div class="compare-panel"><h2>Side-by-side Metadata</h2><div class="compare-grid">${column(left, 1)}${column(right, 2)}</div></div></section>`;
    focusFirst();
  }

  function renderReconstruction() {
    setHeader(true);
    const events = active.reconstructionOrder.map(id => caseDef().reconstruction.find(event => event.id === id));
    view.innerHTML = `<section class="screen panel-screen"><div class="screen-heading"><div><p class="kicker">Reconstruct the night</p><h1>Event Sequence</h1><p>Arrange the events in the order supported by the evidence. Use the buttons, or focus a card and press Shift + ↑ / ↓.</p></div><div class="screen-actions"><button class="secondary-button" data-action="hub">Keep Investigating</button></div></div>
      <div class="reconstruction-list">${events.map((event, index) => `<div class="event-card" tabindex="0" data-event-index="${index}"><span class="event-number">${index + 1}</span><p>${esc(event.text)}</p><span class="reorder-actions"><button data-move-event="${index}" data-direction="-1" aria-label="Move event up" ${index === 0 ? "disabled" : ""}>↑</button><button data-move-event="${index}" data-direction="1" aria-label="Move event down" ${index === events.length - 1 ? "disabled" : ""}>↓</button></span></div>`).join("")}</div>
      <p class="feedback">${esc(active.flags.reconstructionFeedback || "The timestamps establish several fixed points. Arrange everything around them.")}</p><button class="primary-button" data-action="check-reconstruction">Check Sequence</button>
    </section>`;
    focusFirst();
  }

  function moveEvent(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= active.reconstructionOrder.length) return;
    [active.reconstructionOrder[index], active.reconstructionOrder[target]] = [active.reconstructionOrder[target], active.reconstructionOrder[index]];
    saveProgress(); renderReconstruction();
    document.querySelector(`[data-event-index="${target}"]`)?.focus();
  }

  function checkReconstruction() {
    active.reconstructionAttempts += 1;
    const correct = caseDef().reconstruction.map(event => event.id);
    if (active.reconstructionOrder.join("|") !== correct.join("|")) {
      active.flags.reconstructionFeedback = "The timestamps don't support this sequence. Check when the Pages file was saved and when the PDF was created.";
      saveProgress(); renderReconstruction(); return;
    }
    active.reconstructionCompleted = true;
    active.flags.reconstructionFeedback = "Sequence supported. The final save occurs before the PDF export, and the Science-folder check happens the next morning.";
    saveProgress(); setScreen("theory");
  }

  function renderTheory() {
    setHeader(true);
    const t = active.theory;
    const theory = caseDef().finalTheory;
    const supportOptions = active.optionOrders["theory.support"].filter(id => includes(active.evidence, id));
    const question = questionId => {
      const definition = theory.questions.find(item => item.id === questionId);
      const optionsById = Object.fromEntries(definition.options.map(option => [option.id, option]));
      return `<fieldset class="theory-fieldset"><legend>${esc(definition.legend)}</legend>${active.optionOrders[`theory.${questionId}`].map(id => {
        const option = optionsById[id];
        return theoryOption(questionId, option.id, option.label, t[questionId]);
      }).join("")}</fieldset>`;
    };
    view.innerHTML = `<section class="screen panel-screen"><div class="screen-heading"><div><p class="kicker">Close the case</p><h1>Final Theory</h1><p>Build an explanation that accounts for the file contents, location, timestamps, and Miles's actions.</p></div><div class="screen-actions"><button class="secondary-button" data-action="hub">Keep Investigating</button></div></div>
      <form class="theory-panel" id="theory-form">${question("what")}${question("why")}
      <fieldset class="theory-fieldset"><legend>Where is the completed assignment?</legend><div class="identified-file">${t.identifiedFile ? `Identified: <strong>${esc(pathLabel(nodeRecord(t.identifiedFile).path))}</strong>` : "No file identified. Return to the simulated Finder and select the completed assignment."}</div><button type="button" class="secondary-button" data-action="locate-file">${t.identifiedFile ? "Choose Another File" : "Return to Finder"}</button></fieldset>
      <fieldset class="theory-fieldset"><legend>Attach Supporting Evidence</legend><div class="support-grid">${supportOptions.length ? supportOptions.map(id => `<label class="theory-option"><input type="checkbox" name="support" value="${id}" ${includes(t.supports, id) ? "checked" : ""}>${esc(evidenceInfo(id).title)}</label>`).join("") : "Collect evidence before submitting a theory."}</div></fieldset>
      <p class="feedback">${esc(active.flags.theoryFeedback || "A strong theory explains every major clue without inventing a new one.")}</p><button class="primary-button" type="submit">Submit Theory</button></form>
    </section>`;
    focusFirst();
  }

  function theoryOption(name, value, label, current) { return `<label class="theory-option"><input type="radio" name="${name}" value="${value}" ${current === value ? "checked" : ""}>${esc(label)}</label>`; }

  function syncTheoryForm() {
    const form = document.querySelector("#theory-form");
    if (!form) return;
    active.theory.what = form.elements.what?.value || "";
    active.theory.why = form.elements.why?.value || "";
    active.theory.supports = [...form.querySelectorAll('input[name="support"]:checked')].map(input => input.value);
  }

  function submitTheory() {
    syncTheoryForm();
    active.theoryAttempts += 1;
    const t = active.theory;
    const correctAnswers = Object.fromEntries(caseDef().finalTheory.questions.map(question => [question.id, question.correct]));
    let feedback = "";
    if (t.what === "deleted") feedback = "The completed assignment still exists, so deletion doesn't explain all of the evidence.";
    else if (t.what === "unsaved") feedback = "The 9:47 PM modification and 9:51 PM PDF show that work was saved.";
    else if (t.what === "moved") feedback = "You've established where the file is, but not evidence that the computer moved it.";
    else if (t.what !== correctAnswers.what) feedback = "Your theory needs to explain what happened to the completed assignment.";
    else if (t.why !== correctAnswers.why) feedback = t.why === "trash" ? "The Trash file is an August draft and cannot explain September 10 activity." : "That cause is not supported by the file history or Miles's statement.";
    else if (t.identifiedFile !== "really-final") feedback = "The identified file does not contain all of Miles's completed sections with a matching timestamp.";
    else if (!includes(t.supports, "really-final") || !t.supports.some(id => ["volcano-final", "volcano-export", "miles-10pm", "miles-downloaded-copy", "miles-pdf"].includes(id))) feedback = "Attach the completed file plus another clue that supports its timeline or origin.";
    if (feedback) { active.flags.theoryFeedback = feedback; saveProgress(); renderTheory(); return; }
    completeCase001();
  }

  function beginTrainingTheory() {
    active.finderMode = "identify";
    active.returnScreen = "hub";
    active.theory.identifiedFile = null;
    active.flags.trainingTheory = true;
    setScreen("finder");
  }

  function identifySelected() {
    const node = nodeById(active.selectedId);
    if (!node || node.kind !== "file") return toast("Select a file first.", "bad");
    if (active.caseId === "training") {
      if (node.id !== "avery-screenshot") return toast("That file's type, location, or timestamp does not match all the evidence.", "bad");
      active.theory.identifiedFile = node.id;
      return completeTraining();
    }
    active.theory.identifiedFile = node.id;
    active.finderMode = "investigate";
    saveProgress(); setScreen("theory");
  }

  function completeTraining() {
    const first = !progress.tutorialCompleted;
    checkpoint();
    progress.tutorialCompleted = true;
    active.completed = true;
    active.report = { rank: "DETECTIVE LICENSE ISSUED", elapsed: active.elapsedSeconds, evidence: active.evidence.length, deductions: active.deductions.length };
    active.screen = "report";
    if (first && window.FridayArcadeProfile) {
      window.FridayArcadeProfile.addXP(25);
      window.FridayArcadeProfile.unlockBadge("tech-detective:licensed");
    }
    saveProgress(); render();
  }

  function caseScore() {
    return Math.max(0, active.deductions.length * 3 + Math.min(6, active.meaningfulEvidence.length) + active.redHerringsCleared.length * 2 + (active.reconstructionCompleted ? 2 : 0) - active.hintsUsed - Math.max(0, active.theoryAttempts - 1));
  }

  function rankFor(score) { return score >= 20 ? "MASTER SLEUTH" : score >= 16 ? "SENIOR DETECTIVE" : score >= 11 ? "DIGITAL DETECTIVE" : "ROOKIE INVESTIGATOR"; }

  function completeCase001() {
    const first = !progress.case001Completed;
    checkpoint();
    const score = caseScore();
    const report = { rank: rankFor(score), score, elapsed: active.elapsedSeconds, evidence: active.meaningfulEvidence.length, deductions: active.deductions.length, redHerrings: active.redHerringsCleared.length, hints: active.hintsUsed, theoryAttempts: active.theoryAttempts, reconstruction: active.reconstructionCompleted };
    active.completed = true; active.report = report; active.screen = "report";
    progress.case001Completed = true;
    if (!progress.bestCase001 || score > progress.bestCase001.score) progress.bestCase001 = report;
    if (first && window.FridayArcadeProfile) {
      window.FridayArcadeProfile.addXP(100);
      window.FridayArcadeProfile.addTokens(2);
      window.FridayArcadeProfile.unlockBadge("tech-detective:case-001");
    }
    saveProgress(); render();
  }

  function renderReport() {
    setHeader(false);
    const training = active.caseId === "training";
    const report = active.report;
    view.innerHTML = `<section class="screen"><article class="report-panel"><p class="kicker">${training ? "Training complete" : "Case 001 closed"}</p><h1>${training ? "Detective License Issued" : "Case Solved"}</h1><div class="rank">${esc(report.rank)}</div>
      <div class="ending-dialogue">${training ? '<p><strong>Avery:</strong> “That\'s it! It was on the Desktop the whole time?”</p><p><strong>Detective:</strong> “Some mysteries are complicated.<br>Some mysteries are on the Desktop.”</p>' : '<p><strong>Miles:</strong> “THAT\'S IT!”</p><p><strong>Detective:</strong> “Your computer didn\'t eat your homework.”</p><p><strong>Miles:</strong> “So what did?”</p><p><strong>Detective:</strong> “Your filing system.”</p>'}</div>
      <div class="report-stats"><span><small>Evidence</small><b>${report.evidence}</b></span><span><small>Deductions</small><b>${report.deductions}</b></span><span><small>Elapsed</small><b>${formatTime(report.elapsed)}</b></span>${training ? "" : `<span><small>Red Herrings Cleared</small><b>${report.redHerrings}</b></span><span><small>Hints Used</small><b>${report.hints}</b></span><span><small>Theory Attempts</small><b>${report.theoryAttempts}</b></span>`}</div>
      <button class="primary-button" data-action="finish-report">${training ? "Open Case 001" : "Return to Case Files"}</button><a class="secondary-button" href="../../index.html">Return to Friday Arcade</a>
    </article></section>`;
    focusFirst();
  }

  function render() {
    pageMode = "game";
    modalRoot.replaceChildren();
    if (!active) return showTitle();
    const renderers = { briefing: renderBriefing, hub: renderHub, finder: renderFinder, interview: renderInterview, board: renderBoard, compare: renderCompare, reconstruction: renderReconstruction, theory: renderTheory, report: renderReport };
    (renderers[active.screen] || renderHub)();
  }

  function openModal(body, label, actions) {
    modalRoot.innerHTML = `<div class="modal-shade" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(label)}">${body}<div class="modal-actions">${actions || '<button class="primary-button" data-modal-close>Close</button>'}</div></section></div>`;
    modalRoot.querySelector("button,a")?.focus();
  }

  function closeModal() { modalRoot.replaceChildren(); view.focus(); }

  function showPause() {
    if (!active || active.completed || active.screen === "briefing") return;
    checkpoint(); saveProgress();
    openModal('<p class="kicker">Investigation paused</p><h2>Case Menu</h2><p>Your current evidence and case state have been saved.</p>', "Pause Menu",
      '<button class="primary-button" data-modal-close>Resume</button><button class="secondary-button" data-action="notebook">Case Notes</button><button class="secondary-button" data-action="controls">Controls</button><button class="danger-button" data-action="restart-confirm">Restart Case</button><button class="secondary-button" data-action="leave-case-files">Return to Case Files</button><a class="secondary-button" href="../../index.html">Return to Friday Arcade</a>');
  }

  function showControls() {
    openModal('<p class="kicker">Field controls</p><h2>Keyboard & Mouse</h2><div class="controls-grid"><p><b>Arrows / WASD</b><br>Navigate</p><p><b>Enter / Space</b><br>Activate</p><p><b>I</b><br>Inspect selected file</p><p><b>N</b><br>Notebook</p><p><b>B</b><br>Evidence Board</p><p><b>Esc</b><br>Pause</p></div>', "Controls", '<button class="primary-button" data-action="pause">Back to Pause Menu</button>');
  }

  function showHint() {
    const hints = caseDef().hints || [];
    const history = active.unlockedHints.map(index => `<article class="hint-entry"><small>Hint ${index + 1}</small><p>${esc(hints[index])}</p></article>`).join("");
    const nextIndex = Array.from({ length: hints.length }, (_, index) => index).find(index => !includes(active.unlockedHints, index));
    const actions = `${nextIndex == null ? '<span class="hint-complete">All assistance unlocked</span>' : `<button class="primary-button" data-action="unlock-hint">${active.unlockedHints.length ? "Request Next Stronger Hint" : "Request First Hint"}</button>`}<button class="secondary-button" data-modal-close>Return to Investigation</button>`;
    openModal(`<p class="kicker">Forensics assistance // Persistent case log</p><h2>Unlocked Guidance</h2><div class="hint-history">${history || '<p class="identified-file">No hints unlocked yet. Request one when you want a nudge toward the next useful investigation.</p>'}</div><p class="narration">Unlocked hints remain here for the rest of this case and survive save/resume.</p>`, "Forensics Assistance", actions);
  }

  function unlockNextHint() {
    const hints = caseDef().hints || [];
    const nextIndex = Array.from({ length: hints.length }, (_, index) => index).find(index => !includes(active.unlockedHints, index));
    if (nextIndex == null) return showHint();
    addUnique(active.unlockedHints, nextIndex);
    active.unlockedHints.sort((a, b) => a - b);
    active.hintsUsed = active.unlockedHints.length;
    saveProgress();
    showHint();
  }

  function showRestartConfirm(caseId = active?.caseId, returnScreen = "pause") {
    if (!caseId || !CASES[caseId]) return;
    pendingRestartCaseId = caseId;
    restartReturnScreen = returnScreen;
    openModal('<p class="kicker">Confirm reset</p><h2>Restart this case?</h2><p>This will erase your current investigation progress for this case, including collected evidence, leads, deductions, hints, interviews, reconstruction progress, and elapsed time.</p><p>Your completed-case record / best rank will not be erased.</p>', "Restart Case", '<button class="secondary-button" data-action="cancel-restart">Cancel</button><button class="danger-button" data-action="restart-case">Restart Case</button>');
  }

  function cancelRestart() {
    pendingRestartCaseId = null;
    if (restartReturnScreen === "pause") return showPause();
    restartReturnScreen = null;
    closeModal();
  }

  function restartCase() {
    const caseId = pendingRestartCaseId;
    if (!caseId || !CASES[caseId]) return closeModal();
    active = makeCaseState(caseId);
    pendingRestartCaseId = null;
    restartReturnScreen = null;
    clearTimeout(toastTimer);
    toastTimer = 0;
    toastNode.textContent = "";
    toastNode.className = "toast";
    saveProgress();
    closeModal();
    render();
  }

  function showTechResetConfirm() {
    openModal('<p class="kicker">Developer / testing reset</p><h2>Reset Tech Detective Progress?</h2><p>This clears Training File 000 and all Tech Detective case progress, completion records, and best statistics. Friday Arcade profile data and other games will not be changed.</p>', "Reset Tech Detective Progress", '<button class="secondary-button" data-modal-close>Cancel</button><button class="danger-button" data-action="confirm-tech-reset">Reset Tech Detective Progress</button>');
  }

  function resetTechDetectiveProgress() {
    if (window.FridayArcadeProfile?.clearGameStats) window.FridayArcadeProfile.clearGameStats(PROFILE_ID);
    progress = defaultProgress();
    active = null;
    pendingRestartCaseId = null;
    restartReturnScreen = null;
    clearTimeout(toastTimer);
    toastTimer = 0;
    toastNode.textContent = "";
    toastNode.className = "toast";
    closeModal();
    showCaseFiles();
    toast("TECH DETECTIVE PROGRESS RESET", "good");
  }

  function finishReport() {
    const completedTraining = active.caseId === "training";
    active = null; saveProgress(); showCaseFiles();
    if (completedTraining) toast("CASE 001 UNLOCKED", "good");
  }

  function leaveToCaseFiles() { closeModal(); saveProgress(); showCaseFiles(); }
  function focusFirst() { requestAnimationFrame(() => view.querySelector("[data-nav], button, a, input")?.focus()); }

  document.addEventListener("click", event => {
    const close = event.target.closest("[data-modal-close]"); if (close) return closeModal();
    const caseButton = event.target.closest("[data-case]"); if (caseButton) return chooseCase(caseButton.dataset.case);
    const location = event.target.closest("[data-location]"); if (location) { active.currentPath = [location.dataset.location]; active.selectedId = null; saveProgress(); return renderFinder(); }
    const fileRow = event.target.closest("[data-file]"); if (fileRow) {
      if (active.selectedId === fileRow.dataset.file && event.detail > 1) return openSelected();
      active.selectedId = fileRow.dataset.file; saveProgress(); return renderFinder();
    }
    const topic = event.target.closest("[data-topic]"); if (topic) return askTopic(topic.dataset.topic);
    const evidence = event.target.closest("[data-evidence]"); if (evidence) {
      const id = evidence.dataset.evidence;
      if (!active.boardA || active.boardA === id || active.boardB) { active.boardA = id; active.boardB = null; }
      else {
        active.boardB = id;
        if (active.caseId === "case001") return makeConnection();
      }
      saveProgress(); return renderBoard();
    }
    const mover = event.target.closest("[data-move-event]"); if (mover) return moveEvent(Number(mover.dataset.moveEvent), Number(mover.dataset.direction));
    const actionNode = event.target.closest("[data-action]");
    const action = actionNode?.dataset.action;
    if (!action) return;
    const actions = {
      title: () => { saveProgress(); showTitle(); }, continue: render, "case-files": showCaseFiles, "how-to": showHowTo,
      "begin-case": () => setScreen("hub"), hub: () => { active.finderMode = "investigate"; setScreen("hub"); },
      finder: () => { active.finderMode = "investigate"; active.returnScreen = "hub"; setScreen("finder"); }, interview: () => setScreen("interview"), board: () => setScreen("board"), notebook: showNotebook, pause: showPause,
      "finder-return": () => { if (active.finderMode === "identify" && active.caseId === "case001") { active.finderMode = "investigate"; setScreen("theory"); } else setScreen("hub"); },
      "folder-back": () => { if (active.currentPath.length > 1) { active.currentPath.pop(); active.selectedId = null; saveProgress(); renderFinder(); } },
      "open-selected": openSelected, "inspect-selected": inspectSelected,
      "add-selected-evidence": () => { const id = active.selectedId; if (id && includes(active.inspected, id) && nodeById(id)?.evidence) { addEvidence(id); renderFinder(); } },
      "compare-selected": () => {
        const id = active.selectedId;
        if (!includes(active.compareIds, id)) {
          if (active.compareIds.length >= 2) active.compareIds.shift();
          active.compareIds.push(id);
        } else active.compareIds = active.compareIds.filter(item => item !== id);
        if (active.caseId === "case001" && ["volcano-final", "really-final"].every(fileId => includes(active.compareIds, fileId))) active.flags.coreVersionsCompared = true;
        refreshLeadStates();
        saveProgress();
        if (active.compareIds.length === 2) setScreen("compare"); else renderFinder();
      },
      "clear-compare": () => { active.compareIds = []; setScreen("finder"); },
      connect: makeConnection, "clear-board": () => { active.boardA = active.boardB = null; saveProgress(); renderBoard(); },
      hint: showHint, "unlock-hint": unlockNextHint, reconstruction: () => setScreen("reconstruction"), "check-reconstruction": checkReconstruction,
      "training-theory": beginTrainingTheory, "identify-selected": identifySelected,
      "locate-file": () => { syncTheoryForm(); active.finderMode = "identify"; active.returnScreen = "theory"; saveProgress(); setScreen("finder"); },
      controls: showControls,
      "restart-confirm": () => showRestartConfirm(active?.caseId, "pause"),
      "start-over": () => showRestartConfirm(actionNode.dataset.caseId, "casefiles"),
      "cancel-restart": cancelRestart,
      "restart-case": restartCase,
      "reset-tech-progress": showTechResetConfirm,
      "confirm-tech-reset": resetTechDetectiveProgress,
      "leave-case-files": leaveToCaseFiles, "finish-report": finishReport
    };
    actions[action]?.();
  });

  document.addEventListener("submit", event => { if (event.target.id === "theory-form") { event.preventDefault(); submitTheory(); } });

  window.addEventListener("keydown", event => {
    if (event.code === "Escape") {
      event.preventDefault();
      if (modalRoot.children.length) return closeModal();
      if (pageMode === "game" && active && !active.completed && active.screen !== "briefing") return showPause();
      return showTitle();
    }
    const globalNavKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
    if (pageMode !== "game" && !modalRoot.children.length && globalNavKeys.includes(event.code)) {
      const items = [...view.querySelectorAll("[data-nav]:not([disabled])")].filter(node => node.offsetParent !== null);
      if (items.length) {
        event.preventDefault();
        const current = items.indexOf(document.activeElement);
        const backwards = ["ArrowUp", "ArrowLeft", "KeyW", "KeyA"].includes(event.code);
        items[(current + (backwards ? -1 : 1) + items.length) % items.length].focus();
      }
      return;
    }
    if (!active || active.completed || modalRoot.children.length) return;
    const tag = document.activeElement?.tagName;
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(tag);
    if (!typing && event.code === "KeyI" && active.screen === "finder") { event.preventDefault(); return inspectSelected(); }
    if (!typing && event.code === "KeyN" && active.screen !== "briefing") { event.preventDefault(); return showNotebook(); }
    if (!typing && event.code === "KeyB" && active.screen !== "briefing") { event.preventDefault(); return setScreen("board"); }
    if (active.screen === "reconstruction" && event.shiftKey && ["ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code)) {
      const card = document.activeElement?.closest("[data-event-index]");
      if (card) { event.preventDefault(); return moveEvent(Number(card.dataset.eventIndex), ["ArrowUp", "KeyW"].includes(event.code) ? -1 : 1); }
    }
    if (active.screen === "finder" && ["ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code) && !typing) {
      const rows = [...view.querySelectorAll("[data-file]")];
      if (rows.length) {
        event.preventDefault();
        const current = rows.findIndex(row => row.dataset.file === active.selectedId);
        const next = ["ArrowUp", "KeyW"].includes(event.code) ? (current <= 0 ? rows.length - 1 : current - 1) : (current + 1) % rows.length;
        active.selectedId = rows[next].dataset.file; saveProgress(); renderFinder(); view.querySelector(`[data-file="${active.selectedId}"]`)?.focus();
      }
      return;
    }
    if (active.screen === "finder" && ["Enter", "Space"].includes(event.code) && document.activeElement?.matches("[data-file]")) { event.preventDefault(); return openSelected(); }
    if (!typing && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      const items = [...view.querySelectorAll("[data-nav]:not([disabled])")].filter(node => node.offsetParent !== null);
      if (!items.length) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement);
      const backwards = ["ArrowUp", "ArrowLeft", "KeyW", "KeyA"].includes(event.code);
      items[(current + (backwards ? -1 : 1) + items.length) % items.length].focus();
    }
  });

  window.addEventListener("beforeunload", saveProgress);
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveProgress(); else if (active) active.lastClock = Date.now(); });

  window.TechDetectiveTest = Object.freeze({
    get progress() { return progress; }, get active() { return active; }, CASES,
    startCase: chooseCase, addEvidence, inspect(id) { active.selectedId = id; inspectSelected(); },
    askTopic, connect(a, verb, b) { active.boardA = a; active.boardB = b; const select = document.querySelector("#relationship"); if (select) select.value = verb; makeConnection(); },
    caseReady, save: saveProgress, render
  });

  showTitle();
}());
