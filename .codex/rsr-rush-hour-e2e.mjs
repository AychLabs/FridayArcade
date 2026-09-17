import { spawn } from "node:child_process";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const url = "file:///C:/Dev/FridayArcade/games/repair-shop-rush/index.html";
const port = 9344;
const profileDir = "C:\\Dev\\FridayArcade\\.codex-edge-rush-hour-test";
const browser = spawn(edge, ["--headless", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, url], { stdio: "ignore" });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;

try {
  let page;
  for (let i = 0; i < 50; i += 1) {
    await delay(200);
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === "page"); } catch {}
    if (page) break;
  }
  if (!page) throw new Error("Edge debugging page did not start");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const browserErrors = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") browserErrors.push(message.params.args.map(arg => arg.value || arg.description || "console.error").join(" "));
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  };
  const send = (method, params = {}) => new Promise(resolve => { const id = ++sequence; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  await send("Runtime.enable");
  const evaluate = async expression => {
    const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description || reply.result.exceptionDetails.text);
    return reply.result.result.value;
  };
  const waitForGame = async () => {
    for (let i = 0; i < 50; i += 1) {
      if (await evaluate("Boolean(window.RepairShopRushTest)")) return;
      await delay(100);
    }
    throw new Error("Repair Shop Rush test API did not load");
  };
  const key = code => evaluate(`(()=>{window.dispatchEvent(new KeyboardEvent("keydown",{code:"${code}",bubbles:true}));window.dispatchEvent(new KeyboardEvent("keyup",{code:"${code}",bubbles:true}));})()`);

  await waitForGame();
  await evaluate(`(()=>{
    const api=FridayArcadeProfile,profile=api.getProfile();
    profile.gameStats["repair-shop-rush"]={highestLevelUnlocked:4,repairShopRush:{shopBalance:700,upgrades:{},completedLevels:[1,2,3],highestLevelUnlocked:4,stats:{}}};
    api.saveProfile(profile);location.reload();
  })()`);
  await delay(700);
  await waitForGame();

  const lockedGate = await evaluate(`(()=>{
    const check=(condition,message)=>{if(!condition)throw new Error(message);};
    document.querySelector("#level-4-button").click();
    const purchase=document.querySelector("#upgrade-list button");
    check(!document.querySelector("#shop-upgrades").hidden,"Rush Hour gate is visible");
    check(document.querySelector("#upgrade-message").textContent.includes("$50 more"),"gate explains the Shop Balance shortfall");
    check(purchase.disabled,"unaffordable Bench 2 cannot be purchased");
    return {message:document.querySelector("#upgrade-message").textContent,balance:RepairShopRushTest.shopProgress().shopBalance};
  })()`);
  await key("Escape");
  const returned = await evaluate(`document.querySelector("#opening").hidden===false&&document.activeElement.id==="level-4-button"`);
  if (!returned) throw new Error("Escape did not return from the Rush Hour gate to level select");

  await evaluate("RepairShopRushTest.changeShopBalance(100);document.querySelector('#level-4-button').click()");
  await key("Enter");
  await delay(150);
  const purchased = await evaluate(`(()=>{
    const game=RepairShopRushTest,check=(condition,message)=>{if(!condition)throw new Error(message);},progress=game.shopProgress();
    check(game.state.level===4&&game.state.running,"keyboard purchase starts Level 4");
    check(progress.upgrades["second-repair-bench"]===true,"Bench 2 ownership persisted");
    check(progress.shopBalance===50,"Bench 2 deducted exactly once");
    const before=progress.shopBalance;game.purchaseUpgrade("second-repair-bench");
    check(game.shopProgress().shopBalance===before,"Bench 2 cannot be purchased twice");
    check(game.state.scenarios.length===8,"Rush Hour has eight jobs");
    check(new Set(game.state.scenarios.map(item=>item.id)).size===8,"Rush Hour scenario selection has no exact repeats");
    return {balance:progress.shopBalance,scenarios:game.state.scenarios.map(item=>item.id)};
  })()`);

  const concurrency = await evaluate(`(()=>{
    const game=RepairShopRushTest,check=(condition,message)=>{if(!condition)throw new Error(message);};
    game.acceptWaiting();game.spawnCustomer();game.acceptWaiting();game.spawnCustomer();
    check(game.state.activeJobs.length===2,"two repair jobs are active");
    check(game.state.waitingCustomer,"one additional customer is waiting");
    check(game.spawnCustomer()===false,"a fourth concurrent customer is rejected");
    check(game.state.activeJobs.map(job=>job.benchId).sort().join("")==="AB","jobs occupy Bench A and Bench B");
    const [a,b]=game.state.activeJobs,bBefore=b.evidence.slice();
    game.actionResult(a,"inspect");
    check(a.evidence.length>bBefore.length,"Bench A receives its evidence");
    check(b.evidence.length===bBefore.length&&b.evidence.every((note,index)=>note===bBefore[index]),"Bench B evidence stays isolated");
    game.selectJob(b);
    check(document.querySelector("#active-job-label").textContent.includes(b.customerName)&&document.querySelector("#active-job-label").textContent.includes("COMPUTER B"),"notebook identifies the selected job");
    return {active:game.state.activeJobs.map(job=>({bench:job.benchId,name:job.customerName,evidence:job.evidence.length})),waiting:game.state.waitingCustomer.scenario.customerName};
  })()`);

  for (let i = 0; i < 4; i += 1) await key("KeyE");
  await key("KeyH");
  await key("KeyE");
  const techVision = await evaluate(`(()=>{
    const game=RepairShopRushTest,[a,b]=game.state.activeJobs;
    if(b.techVisionUses!==1||a.techVisionUses!==0)throw new Error("Tech Vision did not stay on selected Bench B: "+JSON.stringify({selected:game.state.selectedJobId,a:a.techVisionUses,b:b.techVisionUses,menu:game.state.menuOpen,vision:game.state.techVision,balance:game.shopProgress().shopBalance}));
    if(game.shopProgress().shopBalance!==40)throw new Error("Tech Vision cost was not persisted");
    game.toggleTechVision(false);
    return {a:a.techVisionUses,b:b.techVisionUses,target:game.state.techVisionTarget,balance:game.shopProgress().shopBalance};
  })()`);

  const timerStarted = await evaluate(`(()=>{
    const game=RepairShopRushTest,[a,b]=game.state.activeJobs,before=a.evidence.length;
    game.startProcess(a,"diagnostic-scan","SCAN",180);game.actionResult(b,"check-power");
    return {before,charged:game.shopProgress().shopBalance,productive:a.process.productiveDowntime};
  })()`);
  await delay(350);
  const timerFinished = await evaluate(`(()=>{
    const game=RepairShopRushTest,a=game.state.activeJobs[0];
    if(a.process)throw new Error("timer did not continue while working another job");
    if(a.evidence.length<=${timerStarted.before})throw new Error("completed timer did not add job evidence");
    if(!a.productiveDowntime||game.state.processesWhileMultitasking<1)throw new Error("productive downtime was not tracked");
    return {evidence:a.evidence.length,multitasked:game.state.processesWhileMultitasking};
  })()`);

  await evaluate(`(()=>{const game=RepairShopRushTest,a=game.state.activeJobs[0];game.startProcess(a,"diagnostic-scan","SCAN",500);})()`);
  await key("Escape");
  const pausedBefore = await evaluate("RepairShopRushTest.state.activeJobs[0].process.elapsed");
  await delay(350);
  const pausedAfter = await evaluate("RepairShopRushTest.state.activeJobs[0].process.elapsed");
  if (Math.abs(pausedAfter - pausedBefore) > 2) throw new Error("process timer advanced while paused");
  await key("Escape");
  await delay(650);
  const resumed = await evaluate("RepairShopRushTest.state.paused===false&&!RepairShopRushTest.state.activeJobs[0].process");
  if (!resumed) throw new Error("process timer did not resume after pause");

  const patience = await evaluate(`(()=>{
    const game=RepairShopRushTest,b=game.state.activeJobs[1],before=b.patience;
    game.state.menuOpen=true;game.updateSystems(30,performance.now());const duringMenu=b.patience;
    game.state.menuOpen=false;game.updateSystems(10,performance.now());const afterPlay=b.patience;
    if(duringMenu!==before)throw new Error("patience drained during a menu");
    if(!(afterPlay<duringMenu))throw new Error("patience did not drain during active play");
    return {before,duringMenu,afterPlay};
  })()`);

  const queueTransition = await evaluate(`(()=>{
    const game=RepairShopRushTest,w=game.state.waitingCustomer;
    w.customer.state="waitingAtCounter";w.customer.path=[];game.updateWaitingQueue();
    if(!w.queued||w.customer.state!=="walkingToWaitingRoom")throw new Error("full shop customer did not walk to waiting seating");
    w.customer.state="waitingForRepair";w.customer.path=[];const jobs=game.state.activeJobs.slice();game.state.activeJobs=[jobs[0]];game.updateWaitingQueue();
    if(w.queued||w.customer.state!=="walkingToCounter")throw new Error("waiting customer did not walk back when a bench opened");
    game.state.activeJobs=jobs;return {queued:w.queued,state:w.customer.state};
  })()`);

  const duplicatePayout = await evaluate(`(()=>{
    const game=RepairShopRushTest,job=game.state.activeJobs[1],before=game.shopProgress().shopBalance;
    game.completeJob(job,true);const once=game.shopProgress().shopBalance;game.completeJob(job,true);const twice=game.shopProgress().shopBalance;
    if(!(once>before)||twice!==once)throw new Error("job payout was duplicated");
    return {before,once,twice};
  })()`);

  const restartEconomy = await evaluate(`(()=>{
    const game=RepairShopRushTest;game.resetShift(4);game.acceptWaiting();const job=game.state.activeJobs[0],before=game.shopProgress().shopBalance;
    game.startProcess(job,"diagnostic-scan","SCAN",5000);const spent=game.shopProgress().shopBalance;game.resetShift(4);const restarted=game.shopProgress().shopBalance;
    if(spent!==before-5||restarted!==spent)throw new Error("Restart Shift refunded persistent spending");
    return {before,spent,restarted};
  })()`);

  const completion = await evaluate(`(async()=>{
    const game=RepairShopRushTest,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),check=(condition,message)=>{if(!condition)throw new Error(message);};
    for(let index=0;index<8;index+=1){
      if(!game.state.waitingCustomer)game.spawnCustomer();
      game.acceptWaiting();const job=game.state.activeJobs[0];
      check(job,"missing job "+(index+1));job.fixed=true;job.patience=80;job.productiveDowntime=true;game.completeJob(job,true);
      job.customer.path=[];job.customer.state="pickup";await wait(90);
      check(!document.querySelector("#job-result").hidden,"result missing for job "+(index+1));
      document.querySelector("#next-job-button").click();await wait(30);
      game.state.departingCustomers.forEach(item=>{item.customer.path=[];item.customer.state="gone";});await wait(100);
      game.state.nextArrivalAt=0;if(index<7)game.spawnCustomer();
    }
    await wait(250);
    check(!document.querySelector("#completion").hidden,"Rush Hour completion screen did not appear");
    check(game.state.completed===8&&game.state.repaired===8,"Rush Hour did not complete all eight repairs");
    check(document.querySelector("#next-level-button").hidden,"Level 4 completion still points to a nonexistent next level");
    check(!document.querySelector("#coming-soon").hidden&&document.querySelector("#coming-soon").textContent.toUpperCase().includes("MIXED SIGNALS"),"Level 5 placeholder missing");
    check(!document.querySelector("#summary-earnings-wrap").hidden&&!document.querySelector("#summary-costs-wrap").hidden&&!document.querySelector("#summary-tech-wrap").hidden,"Rush Hour finance summary is incomplete");
    const balance=game.shopProgress().shopBalance,records=game.state.repairRecords.length,paid=game.state.repairRecords.reduce((sum,record)=>sum+record.servicePayout+record.tip+(record.efficiencyBonus||0),0);
    document.querySelector("#level-select-button").click();
    check(!document.querySelector("#level-5-card").hidden,"Level 5 placeholder is not visible on level select after completion");
    return {completed:game.state.completed,repaired:game.state.repaired,records,balance,paid,level5:document.querySelector("#level-5-card").textContent.trim()};
  })()`);

  const regression = await evaluate(`(()=>{
    const game=RepairShopRushTest,check=(condition,message)=>{if(!condition)throw new Error(message);};
    game.startTutorial();check(game.state.tutorial&&game.state.player&&game.state.seniorTech,"tutorial no longer starts");
    game.resetShift(1);check(game.state.level===1&&game.LEVELS[1].maxActive===1,"Level 1 regression");
    game.resetShift(2);check(game.state.level===2&&game.LEVELS[2].jobs===6,"Level 2 regression");
    game.resetShift(3);check(game.state.level===3&&game.LEVELS[3].jobs===6,"Level 3 regression");
    const progress=game.shopProgress();check(progress.completedLevels.includes(4)&&progress.upgrades["second-repair-bench"],"Level 4 persistence was corrupted");
    return {tutorial:true,levels:[game.LEVELS[1].jobs,game.LEVELS[2].jobs,game.LEVELS[3].jobs,game.LEVELS[4].jobs],balance:progress.shopBalance,completed:progress.completedLevels};
  })()`);

  await evaluate("location.reload()");
  await delay(700);
  await waitForGame();
  const reloadPersistence = await evaluate(`(()=>{
    const game=RepairShopRushTest,progress=game.shopProgress();
    if(progress.shopBalance!==${completion.balance})throw new Error("Shop Balance changed after reload");
    if(!progress.upgrades["second-repair-bench"]||!progress.completedLevels.includes(4))throw new Error("Rush Hour progression changed after reload");
    if(document.querySelector("#level-4-button").disabled||document.querySelector("#level-5-card").hidden)throw new Error("Level 4/5 menu state did not restore after reload");
    return {balance:progress.shopBalance,bench2:progress.upgrades["second-repair-bench"],completed:progress.completedLevels,level4Unlocked:!document.querySelector("#level-4-button").disabled,level5Visible:!document.querySelector("#level-5-card").hidden};
  })()`);

  if (browserErrors.length) throw new Error(`browser errors: ${browserErrors.join(" | ")}`);
  process.stdout.write(JSON.stringify({ lockedGate, purchased, concurrency, techVision, timerFinished, patience, queueTransition, duplicatePayout, restartEconomy, completion, regression, reloadPersistence, browserErrors }, null, 2));
} finally {
  if (ws) ws.close();
  browser.kill();
}
