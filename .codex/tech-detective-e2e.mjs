import { spawn } from "node:child_process";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const url = "file:///C:/Dev/FridayArcade/games/tech-detective/index.html";
const port = 9342;
const profileDir = "C:\\Dev\\FridayArcade\\.codex-edge-tech-detective-test";
const browser = spawn(edge, ["--headless", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, url], { stdio: "ignore" });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
try {
  let page;
  for (let i = 0; i < 50; i++) {
    await delay(200);
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === "page" && item.url.includes("tech-detective")); } catch {}
    if (page) break;
  }
  if (!page) throw new Error("Edge debugging page did not start");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  const browserErrors = [];
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.exceptionThrown") browserErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") browserErrors.push("console.error");
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) => new Promise(resolve => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  const evaluate = async expression => {
    const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description || reply.result.exceptionDetails.text);
    return reply.result.result.value;
  };
  const keyMap = {
    Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 },
    Space: { key: " ", code: "Space", windowsVirtualKeyCode: 32 },
    ArrowDown: { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 },
    ArrowUp: { key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 },
    KeyI: { key: "i", code: "KeyI", windowsVirtualKeyCode: 73 },
    KeyB: { key: "b", code: "KeyB", windowsVirtualKeyCode: 66 }
  };
  const press = async (name, modifiers = 0) => {
    const key = keyMap[name];
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", modifiers, ...key });
    await send("Input.dispatchKeyEvent", { type: "keyUp", modifiers, ...key });
    await delay(35);
  };
  const focus = async selector => {
    const found = await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)return false;node.focus();return true})()`);
    if (!found) throw new Error(`Keyboard target not found: ${selector}`);
  };
  const activate = async selector => { await focus(selector); await press("Space"); };
  for (let i = 0; i < 40 && !(await evaluate("Boolean(window.TechDetectiveTest)")); i++) await delay(100);
  if (!(await evaluate("Boolean(window.TechDetectiveTest)"))) throw new Error(`Tech Detective did not initialize: ${browserErrors.join(" | ")}`);
  await evaluate(`(()=>{ localStorage.removeItem("fridayArcade.profile.v1"); location.reload(); return true; })()`);
  await delay(500);
  for (let i = 0; i < 40 && !(await evaluate("Boolean(window.TechDetectiveTest)")); i++) await delay(100);
  await evaluate(`(()=>{ TechDetectiveTest.startCase("training"); TechDetectiveTest.active.screen="hub"; TechDetectiveTest.save(); location.reload(); return true; })()`);
  await delay(500);
  for (let i = 0; i < 40 && !(await evaluate("Boolean(window.TechDetectiveTest)")); i++) await delay(100);
  const resumeCheck = await evaluate(`(()=>{ const button=document.querySelector('[data-action="continue"]'); if(!button) return false; button.click(); return TechDetectiveTest.active.screen==="hub"; })()`);
  if (!resumeCheck) throw new Error("active case did not resume after reload");
  await evaluate(`(()=>{ localStorage.removeItem("fridayArcade.profile.v1"); location.reload(); return true; })()`);
  await delay(500);
  for (let i = 0; i < 40 && !(await evaluate("Boolean(window.TechDetectiveTest)")); i++) await delay(100);
  const result = await evaluate(`(()=>{
    const game=TechDetectiveTest, check=(value,message)=>{if(!value)throw new Error(message);};
    check(document.querySelector('[data-action="case-files"]'),"title menu rendered");
    check(document.documentElement.scrollWidth<=1366,"title fits classroom desktop width");
    document.querySelector('[data-action="case-files"]').focus(); window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyS",bubbles:true}));
    check(document.activeElement?.dataset.action==="how-to","WASD navigates the title menu");
    game.startCase("training");
    document.querySelector('[data-action="begin-case"]')?.click();
    game.addEvidence("avery-screenshot",false);
    window.dispatchEvent(new KeyboardEvent("keydown",{code:"Escape",bubbles:true}));
    check(document.querySelector('[aria-label="Pause Menu"]'),"escape opens pause menu");
    document.querySelector('[data-action="restart-confirm"]').click();
    document.querySelector('[data-action="restart-case"]').click();
    check(game.active.screen==="briefing"&&game.active.evidence.length===0,"restart resets active case");
    game.active.screen="hub"; game.active.selectedId="avery-screenshot"; game.active.currentPath=["t-desktop"]; game.active.screen="finder"; game.render();
    check([...document.querySelectorAll("[data-file]")].map(node=>node.dataset.file).join("|")==="t-homework|t-notes|avery-screenshot","Training File 000 uses alphabetical file order");
    window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyN",bubbles:true}));
    check(document.querySelector('[aria-label="Notebook"]'),"N opens notebook");
    window.dispatchEvent(new KeyboardEvent("keydown",{code:"Escape",bubbles:true}));
    game.inspect("avery-screenshot"); game.addEvidence("avery-screenshot",false); game.askTopic("avery-time");
    game.active.screen="board"; game.render(); game.connect("avery-statement","SUPPORTS","avery-screenshot");
    check(game.active.deductions.includes("training-match"),"training deduction");
    game.active.theory.identifiedFile="avery-screenshot";
    document.querySelector('[data-action="training-theory"]').click();
    game.active.selectedId="avery-screenshot"; document.querySelector('[data-action="identify-selected"]').click();
    check(game.progress.tutorialCompleted,"training completion persists");
    document.querySelector('[data-action="finish-report"]').click();
    game.startCase("case001"); game.active.screen="hub";
    game.render();
    document.querySelector('[data-action="hint"]').click();
    check(document.querySelectorAll(".hint-entry").length===0,"forensics log opens without spending a hint");
    document.querySelector('[data-action="unlock-hint"]').click();
    document.querySelector('[data-action="unlock-hint"]').click();
    check(document.querySelectorAll(".hint-entry").length===2,"later hints preserve earlier hint history");
    check(document.querySelector(".hint-entry:first-child").textContent.includes("Start with Miles"),"first hint remains readable");
    check(document.querySelector(".hint-entry:last-child").textContent.includes("September 9"),"second hint is appended");
    document.querySelector("[data-modal-close]").click();
    const storedHints=JSON.parse(localStorage.getItem("fridayArcade.profile.v1")).gameStats["tech-detective"].activeCaseState.unlockedHints;
    check(storedHints.join("|")==="0|1","unlocked hint history is stored in localStorage case state");
    game.active.screen="interview"; game.render();
    check(!document.querySelector('[data-topic="file-not-edited"]')&&!document.querySelector('[data-topic="how-here"]'),"progressive interview topics stay locked");
    game.active.screen="finder"; game.active.currentPath=["desktop"]; game.active.selectedId=null; game.render();
    check([...document.querySelectorAll("[data-file]")].map(node=>node.dataset.file).join("|")==="school-old|stuff|final-english|desktop-screenshot","Finder sorts folders first, then alphabetizes folders and files independently");
    game.active.currentPath=["downloads"]; game.render();
    check(document.documentElement.scrollWidth<=1366,"Finder fits classroom desktop width");
    check([...document.querySelectorAll("[data-file]")].map(node=>node.dataset.file).join("|")==="img4822|meme|really-final|volcano-diagram|volcano-notes|volcano-export|worksheet","Downloads use case-insensitive alphabetical order");
    window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyS",bubbles:true}));
    check(game.active.selectedId==="img4822","WASD selects the first alphabetically sorted Finder row");
    document.querySelector('[data-file="really-final"]').click();
    window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyI",bubbles:true}));
    check(game.active.inspected.includes("really-final")&&!game.caseReady()&&!game.active.completed,"finding completed file early does not solve case");
    window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyB",bubbles:true}));
    check(game.active.screen==="board","B opens evidence board");
    ["volcano-final","really-final","volcano-export","volcano-old-trash"].forEach(id=>{game.active.selectedId=id; game.active.screen="finder"; game.render(); game.inspect(id); game.addEvidence(id,false);});
    game.active.selectedId="volcano-export"; game.active.screen="finder"; game.render(); document.querySelector('[data-action="open-selected"]').click();
    game.active.compareIds=[]; game.active.selectedId="volcano-final"; game.render(); document.querySelector('[data-action="compare-selected"]').click();
    game.active.selectedId="really-final"; game.active.screen="finder"; game.render(); document.querySelector('[data-action="compare-selected"]').click();
    check(game.active.flags.coreVersionsCompared&&game.active.screen==="compare","core versions can be compared and update lead progress");
    game.askTopic("last-night"); game.askTopic("usual-save"); game.askTopic("file-not-edited"); game.askTopic("trash-file"); game.askTopic("really-final"); game.askTopic("why-downloads"); game.askTopic("timestamp-match"); game.askTopic("exported-pdf"); game.askTopic("how-here");
    game.active.screen="board"; game.render();
    document.querySelector('[data-evidence="miles-10pm"]').click();
    check(document.querySelector('[data-evidence="really-final"]').classList.contains("possible"),"first clue emphasizes meaningful possible connections");
    const before=game.active.deductions.length;
    document.querySelector('[data-evidence="volcano-old-trash"]').click();
    check(game.active.deductions.length===before&&game.active.boardA==="miles-10pm"&&!game.active.boardB,"wrong connection is harmless and keeps the first clue");
    document.querySelector('[data-evidence="really-final"]').click();
    check(game.active.deductions.includes("timeline-match")&&game.active.connections.some(link=>link.verb==="SUPPORTS"),"valid pair infers SUPPORTS");
    check(document.querySelector('[aria-label="Deduction Established"]').textContent.includes("9:47 PM"),"deduction feedback explains why the match matters");
    document.querySelector("[data-modal-close]").click();
    const connectByClick=(a,b)=>{document.querySelector('[data-evidence="'+a+'"]').click();document.querySelector('[data-evidence="'+b+'"]').click();document.querySelector("[data-modal-close]")?.click();};
    connectByClick("volcano-final","miles-10pm");
    connectByClick("really-final","miles-downloaded-copy");
    connectByClick("really-final","volcano-export");
    check(game.caseReady(),"core deductions unlock reconstruction");
    check(game.active.connections.some(link=>link.verb==="CONTRADICTS")&&game.active.connections.some(link=>link.verb==="RELATED TO")&&game.active.connections.some(link=>link.verb==="OCCURRED BEFORE"),"all critical relationship verbs are inferred");
    window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyN",bubbles:true}));
    check(document.querySelectorAll(".progress-goal.complete").length===4,"case progress reflects four completed milestones before reconstruction");
    check([...document.querySelectorAll(".lead.resolved .lead-status")].every(node=>node.textContent==="RESOLVED"),"resolved leads remain reviewable with explicit status");
    check(document.querySelectorAll(".notebook-deduction").length===4&&document.querySelector(".notebook-deduction").textContent.includes("DEDUCTION"),"deduction explanations remain reviewable in notebook");
    document.querySelector("[data-modal-close]").click();
    game.active.screen="reconstruction"; game.render(); document.querySelector('[data-event-index="0"]').focus();
    const firstEvent=game.active.reconstructionOrder[0]; window.dispatchEvent(new KeyboardEvent("keydown",{code:"ArrowDown",shiftKey:true,bubbles:true}));
    check(game.active.reconstructionOrder[1]===firstEvent,"keyboard reorders reconstruction cards");
    game.active.reconstructionOrder=["opened","edited","saved","exported","checked"]; game.active.reconstructionCompleted=true; game.active.screen="theory";
    game.active.theory={what:"deleted",why:"trash",identifiedFile:"volcano-old-trash",supports:["volcano-final","miles-10pm"]}; game.save(); game.render();
    const stableOrders=JSON.stringify(game.active.optionOrders);
    game.render();
    check(JSON.stringify(game.active.optionOrders)===stableOrders,"re-rendering does not reshuffle final-theory options");
    check([...document.querySelectorAll('input[name="what"]')].map(input=>input.value).join("|")===game.active.optionOrders["theory.what"].join("|"),"final-theory display follows the saved ID order");
    check(JSON.stringify(JSON.parse(localStorage.getItem("fridayArcade.profile.v1")).gameStats["tech-detective"].activeCaseState.optionOrders)===stableOrders,"per-run option order is persisted in active case state");
    document.querySelector("#theory-form").requestSubmit();
    check(!game.active.completed&&game.active.flags.theoryFeedback.includes("still exists"),"unsupported theory is rejected with evidence feedback");
    game.active.theory={what:"unexpected",why:"duplicate",identifiedFile:"really-final",supports:["really-final","miles-downloaded-copy"]}; game.save(); game.render(); document.querySelector("#theory-form").requestSubmit();
    check(game.progress.case001Completed,"case completion persists");
    return {tutorial:game.progress.tutorialCompleted,case001:game.progress.case001Completed,rank:game.active.report.rank,deductions:game.active.report.deductions,errors:[]};
  })()`);
  await evaluate("location.reload()"); await delay(600);
  const persisted = await evaluate(`({tutorial:TechDetectiveTest.progress.tutorialCompleted,case001:TechDetectiveTest.progress.case001Completed,best:TechDetectiveTest.progress.bestCase001?.rank,hints:TechDetectiveTest.progress.activeCaseState?.unlockedHints?.length,hasContinue:Boolean(document.querySelector('[data-action="continue"]'))})`);
  if (!persisted.tutorial || !persisted.case001 || !persisted.best || persisted.hints!==2) throw new Error("reload persistence failed");
  const startOverResult = await evaluate(`(()=>{
    const game=TechDetectiveTest,check=(value,message)=>{if(!value)throw new Error(message);};
    const profile=FridayArcadeProfile.getProfile();
    profile.displayName="Reset Sentinel";
    profile.gameStats["repair-shop-rush"]={sentinel:"keep-me"};
    FridayArcadeProfile.saveProfile(profile);
    game.startCase("case001");
    Object.assign(game.active,{screen:"theory",currentPath:["downloads"],selectedId:"really-final",opened:["really-final"],inspected:["really-final"],evidence:["really-final"],interviewTopics:["last-night"],flags:{theoryFeedback:"old"},connections:[{a:"a",b:"b"}],deductions:["duplicate-copy"],leads:{"find-work":"resolved"},unlockedHints:[0,1],hintsUsed:2,theoryAttempts:3,elapsedSeconds:91,compareIds:["volcano-final","really-final"],boardA:"a",boardB:"b",optionOrders:{"theory.what":["unexpected","deleted","unsaved","moved"],"theory.why":["duplicate","malware","trash","sync"],"theory.support":["really-final","volcano-final","volcano-export","miles-10pm","miles-downloaded-copy","miles-pdf"]},reconstructionOrder:["opened","edited","saved","exported","checked"],reconstructionCompleted:true,reconstructionAttempts:2,theory:{what:"unexpected",why:"duplicate",identifiedFile:"really-final",supports:["really-final"]},redHerringsCleared:["trash"],meaningfulEvidence:["really-final"],finderMode:"identify",returnScreen:"theory"});
    game.save();
    document.querySelector('[data-action="case-files"]').click();
    check(!document.querySelector('[data-action="reset-tech-progress"]'),"developer reset is hidden in normal play");
    const startOver=document.querySelector('[data-action="start-over"][data-case-id="case001"]');
    check(startOver,"Case Files shows Start Over for saved Case 001 progress");
    startOver.click();
    const modal=document.querySelector('[aria-label="Restart Case"]');
    check(modal&&modal.textContent.includes("This will erase your current investigation progress for this case"),"full restart confirmation is shown");
    check([...modal.querySelectorAll("button")].map(node=>node.textContent.trim()).join("|")==="Cancel|Restart Case","confirmation actions are ordered Cancel then Restart Case");
    const originalRandom=Math.random; Math.random=()=>0;
    modal.querySelector('[data-action="restart-case"]').click();
    Math.random=originalRandom;
    const a=game.active,p=game.progress,stored=FridayArcadeProfile.getProfile();
    check(a.caseId==="case001"&&a.screen==="briefing"&&a.currentPath[0]==="desktop","restart returns to a clean Case 001 briefing");
    check(!a.selectedId&&!a.opened.length&&!a.inspected.length&&!a.evidence.length&&!a.interviewTopics.length&&!Object.keys(a.flags).length&&!a.connections.length&&!a.deductions.length&&!Object.keys(a.leads).length,"investigation collections reset");
    check(!a.unlockedHints.length&&a.hintsUsed===0&&a.theoryAttempts===0&&a.elapsedSeconds<1&&!a.compareIds.length&&!a.boardA&&!a.boardB,"hints, time, comparison, and board state reset");
    check(!a.reconstructionCompleted&&a.reconstructionAttempts===0&&!a.redHerringsCleared.length&&!a.meaningfulEvidence.length&&a.theory.what===""&&a.finderMode==="investigate","reconstruction, theory, red-herring, and temporary state reset");
    check(a.optionOrders["theory.what"].join("|")==="deleted|unsaved|moved|unexpected"&&a.optionOrders["theory.why"][0]!=="duplicate","restart creates randomized answer orders independent of the correct answer IDs");
    check(a.reconstructionOrder.join("|")==="edited|saved|exported|checked|opened","restart randomizes reconstruction choices and stores the resulting order");
    check(p.tutorialCompleted&&p.case001Completed&&p.bestCase001?.rank===stored.gameStats["tech-detective"].bestCase001?.rank,"training, completion, and best rank remain");
    check(stored.displayName==="Reset Sentinel"&&stored.gameStats["repair-shop-rush"].sentinel==="keep-me","shared profile and Repair Shop Rush data remain");
    return {screen:a.screen,tutorial:p.tutorialCompleted,completed:p.case001Completed,best:p.bestCase001.rank,repair:stored.gameStats["repair-shop-rush"].sentinel};
  })()`);
  await evaluate("location.reload()"); await delay(600);
  const restartPersisted = await evaluate(`({screen:TechDetectiveTest.active?.screen,evidence:TechDetectiveTest.active?.evidence?.length,elapsed:TechDetectiveTest.active?.elapsedSeconds,tutorial:TechDetectiveTest.progress.tutorialCompleted,completed:TechDetectiveTest.progress.case001Completed,best:TechDetectiveTest.progress.bestCase001?.rank,repair:FridayArcadeProfile.getProfile().gameStats["repair-shop-rush"]?.sentinel})`);
  if (restartPersisted.screen!=="briefing"||restartPersisted.evidence!==0||restartPersisted.elapsed>=2||!restartPersisted.tutorial||!restartPersisted.completed||!restartPersisted.best||restartPersisted.repair!=="keep-me") throw new Error("clean restart did not persist across reload: "+JSON.stringify(restartPersisted));
  await evaluate('TechDetectiveTest.startCase("case001")');
  await activate('[data-action="begin-case"]');
  await activate('[data-action="interview"]');
  await activate('[data-topic="assignment"]');
  await activate('[data-topic="last-night"]');
  await activate('[data-topic="usual-save"]');
  await activate('[data-action="hub"]');
  await activate('[data-action="finder"]');
  await activate('[data-location="documents"]');
  await press("ArrowDown"); await press("Enter");
  await press("ArrowDown"); await press("ArrowDown"); await press("ArrowDown"); await press("Enter");
  await press("ArrowDown"); await press("Enter");
  await press("ArrowDown"); await press("KeyI");
  await activate('[data-action="add-selected-evidence"]');
  await activate('[data-action="open-selected"]');
  await activate('[data-location="downloads"]');
  await press("ArrowDown"); await press("ArrowDown"); await press("ArrowDown"); await press("KeyI");
  await activate('[data-action="add-selected-evidence"]');
  await activate('[data-action="open-selected"]');
  await activate('[data-location="downloads"]');
  await press("ArrowDown"); await press("ArrowDown"); await press("ArrowDown"); await press("ArrowDown"); await press("ArrowDown"); await press("ArrowDown"); await press("KeyI");
  await activate('[data-action="add-selected-evidence"]');
  await activate('[data-action="open-selected"]');
  await activate('[data-action="finder-return"]');
  await activate('[data-action="interview"]');
  await activate('[data-topic="file-not-edited"]');
  await activate('[data-topic="really-final"]');
  await activate('[data-topic="why-downloads"]');
  await activate('[data-topic="timestamp-match"]');
  await activate('[data-topic="exported-pdf"]');
  await activate('[data-topic="how-here"]');
  await press("KeyB");
  for (const [a, b] of [
    ["miles-10pm", "really-final"],
    ["volcano-final", "miles-10pm"],
    ["really-final", "miles-downloaded-copy"],
    ["really-final", "volcano-export"]
  ]) {
    await activate(`[data-evidence="${a}"]`);
    await activate(`[data-evidence="${b}"]`);
    await activate("[data-modal-close]");
  }
  await activate('[data-action="reconstruction"]');
  for (const [targetIndex, eventId] of ["opened", "edited", "saved", "exported", "checked"].entries()) {
    let currentIndex = await evaluate(`TechDetectiveTest.active.reconstructionOrder.indexOf("${eventId}")`);
    while (currentIndex > targetIndex) {
      await focus(`[data-event-index="${currentIndex}"]`);
      await press("ArrowUp", 8);
      currentIndex -= 1;
    }
  }
  await activate('[data-action="check-reconstruction"]');
  await focus('input[name="what"][value="unexpected"]'); await press("Space");
  await focus('input[name="why"][value="duplicate"]'); await press("Space");
  await activate('[data-action="locate-file"]');
  await activate('[data-location="downloads"]');
  await press("ArrowDown"); await press("ArrowDown"); await press("ArrowDown");
  await activate('[data-action="identify-selected"]');
  await focus('input[name="support"][value="really-final"]'); await press("Space");
  await focus('input[name="support"][value="miles-downloaded-copy"]'); await press("Space");
  await activate('#theory-form button[type="submit"]');
  const keyboardCompleted = await evaluate('TechDetectiveTest.active.completed && TechDetectiveTest.active.screen==="report"');
  if (!keyboardCompleted) throw new Error("keyboard-only replay did not complete CASE 001");
  const mouseCompleted = await evaluate(`(()=>{
    const game=TechDetectiveTest;
    const click=selector=>{const node=document.querySelector(selector);if(!node)throw new Error("Mouse target not found: "+selector);node.click();};
    const openFolder=id=>{click('[data-file="'+id+'"]');click('[data-action="open-selected"]');};
    const collect=id=>{click('[data-file="'+id+'"]');click('[data-action="inspect-selected"]');click('[data-action="add-selected-evidence"]');click('[data-action="open-selected"]');};
    game.startCase("case001");
    click('[data-action="begin-case"]');
    click('[data-action="interview"]');
    click('[data-topic="assignment"]');click('[data-topic="last-night"]');click('[data-topic="usual-save"]');
    click('[data-action="hub"]');click('[data-action="finder"]');
    click('[data-location="documents"]');openFolder("school");openFolder("science");openFolder("volcano-project-folder");collect("volcano-final");
    click('[data-location="downloads"]');collect("really-final");
    click('[data-location="downloads"]');collect("volcano-export");
    click('[data-action="finder-return"]');click('[data-action="interview"]');
    click('[data-topic="file-not-edited"]');click('[data-topic="really-final"]');click('[data-topic="why-downloads"]');click('[data-topic="timestamp-match"]');click('[data-topic="exported-pdf"]');click('[data-topic="how-here"]');
    click('[data-action="board"]');
    [["miles-10pm","really-final"],["volcano-final","miles-10pm"],["really-final","miles-downloaded-copy"],["really-final","volcano-export"]].forEach(pair=>{
      click('[data-evidence="'+pair[0]+'"]');click('[data-evidence="'+pair[1]+'"]');click("[data-modal-close]");
    });
    click('[data-action="reconstruction"]');
    ["opened","edited","saved","exported","checked"].forEach((id,target)=>{
      let current=game.active.reconstructionOrder.indexOf(id);
      while(current>target){click('[data-move-event="'+current+'"][data-direction="-1"]');current-=1;}
    });
    click('[data-action="check-reconstruction"]');
    click('input[name="what"][value="unexpected"]');click('input[name="why"][value="duplicate"]');
    click('[data-action="locate-file"]');click('[data-location="downloads"]');click('[data-file="really-final"]');click('[data-action="identify-selected"]');
    click('input[name="support"][value="really-final"]');click('input[name="support"][value="miles-downloaded-copy"]');
    click('#theory-form button[type="submit"]');
    return game.active.completed&&game.active.screen==="report";
  })()`);
  if (!mouseCompleted) throw new Error("mouse-only replay did not complete CASE 001");
  await evaluate(`(()=>{history.replaceState({},"","?debug=1");location.reload();return true})()`); await delay(600);
  for (let i = 0; i < 40 && !(await evaluate("Boolean(window.TechDetectiveTest)")); i++) await delay(100);
  const debugReset = await evaluate(`(()=>{
    const check=(value,message)=>{if(!value)throw new Error(message);};
    document.querySelector('[data-action="case-files"]').click();
    const reset=document.querySelector('[data-action="reset-tech-progress"]');
    check(reset,"debug query exposes the Tech Detective reset control");
    const before=FridayArcadeProfile.getProfile();
    reset.click();
    check(document.querySelector('[aria-label="Reset Tech Detective Progress"]'),"developer reset requires confirmation");
    document.querySelector('[data-action="confirm-tech-reset"]').click();
    const after=FridayArcadeProfile.getProfile();
    check(!Object.hasOwn(after.gameStats,"tech-detective"),"developer reset deletes the Tech Detective save entry");
    check(after.displayName===before.displayName&&after.xp===before.xp&&after.arcadeTokens===before.arcadeTokens,"developer reset preserves shared Friday Arcade profile data");
    check(after.gameStats["repair-shop-rush"]?.sentinel==="keep-me","developer reset preserves Repair Shop Rush data");
    check(!TechDetectiveTest.progress.tutorialCompleted&&!TechDetectiveTest.progress.case001Completed&&!TechDetectiveTest.progress.bestCase001&&!TechDetectiveTest.active,"developer reset creates a new Tech Detective player state");
    return {techEntry:Object.hasOwn(after.gameStats,"tech-detective"),repair:after.gameStats["repair-shop-rush"].sentinel,displayName:after.displayName};
  })()`);
  if (browserErrors.length) throw new Error(`browser errors: ${browserErrors.join(" | ")}`);
  process.stdout.write(JSON.stringify({ result, persisted, startOverResult, restartPersisted, keyboardCompleted, mouseCompleted, debugReset, browserErrors }, null, 2));
} finally {
  if (ws) ws.close();
  browser.kill();
}
