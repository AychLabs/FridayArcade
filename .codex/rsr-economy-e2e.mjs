import { spawn } from "node:child_process";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const url = "file:///C:/Dev/FridayArcade/games/repair-shop-rush/index.html";
const port = 9338;
const browser = spawn(edge, ["--headless", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, "--user-data-dir=C:\\Dev\\FridayArcade\\.codex-edge-economy-test", url], { stdio: "ignore" });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
try {
  let page;
  for (let i = 0; i < 40; i++) {
    await delay(250);
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === "page"); } catch {}
    if (page) break;
  }
  if (!page) throw new Error("Edge debugging page did not start");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  const browserErrors = [];
  ws.onmessage = event => { const msg = JSON.parse(event.data); if (msg.method === "Runtime.exceptionThrown") browserErrors.push(msg.params.exceptionDetails.text); if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") browserErrors.push("console.error"); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
  const send = (method, params = {}) => new Promise(resolve => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  await send("Runtime.enable");
  const evaluate = async expression => {
    const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.text);
    return reply.result.result.value;
  };
  for (let i = 0; i < 40 && !(await evaluate("Boolean(window.RepairShopRushTest)")); i++) await delay(100);
  const result = await evaluate(`(async()=>{
    const key="fridayArcade.profile.v1", api=window.FridayArcadeProfile, game=window.RepairShopRushTest;
    const check=(condition,message)=>{if(!condition)throw new Error(message);};
    localStorage.removeItem(key); location.reload();
    return "reload";
  })()`);
  await delay(700);
  const results = await evaluate(`(()=>{
    const key="fridayArcade.profile.v1", api=window.FridayArcadeProfile, game=window.RepairShopRushTest;
    const check=(condition,message)=>{if(!condition)throw new Error(message);};
    check(game.shopProgress().shopBalance===300,"fresh balance");
    const tokens=api.getProfile().arcadeTokens, xp=api.getProfile().xp;
    check(game.changeShopBalance(405),"earn transaction");
    check(game.shopProgress().shopBalance===705,"earned balance persisted");
    game.resetShift(1); check(game.state.cash===705,"shift starts from profile balance");
    check(game.changeShopBalance(-5),"paid transaction"); check(game.shopProgress().shopBalance===700,"paid balance persisted");
    game.resetShift(2); check(game.state.cash===700,"next shift carries exact balance");
    game.changeShopBalance(100); check(game.shopProgress().shopBalance===800,"balance exceeds upgrade price");
    game.purchaseUpgrade("second-repair-bench");
    check(game.shopProgress().shopBalance===50,"upgrade deducted once");
    check(game.shopProgress().upgrades["second-repair-bench"]===true,"upgrade persisted");
    game.purchaseUpgrade("second-repair-bench"); check(game.shopProgress().shopBalance===50,"upgrade cannot be repurchased");
    game.resetShift(3); check(game.state.cash===50&&game.state.benchBInstalled,"upgrade survives level transition");
    game.resetShift(3); check(game.state.cash===50,"restart does not restore balance");
    game.startTutorial(); game.changeShopBalance(999); check(game.shopProgress().shopBalance===50,"tutorial cannot alter balance");
    check(api.getProfile().arcadeTokens===tokens&&api.getProfile().xp===xp,"tokens and XP unaffected");
    const saved=JSON.parse(localStorage.getItem(key)).gameStats["repair-shop-rush"].repairShopRush;
    check(saved.shopBalance===50&&saved.upgrades["second-repair-bench"],"profile shape persisted");
    return {balance:saved.shopBalance,upgrade:saved.upgrades["second-repair-bench"],tokens,xp};
  })()`);
  await evaluate("location.reload()"); await delay(700);
  const reload = await evaluate(`({balance:RepairShopRushTest.shopProgress().shopBalance,installed:RepairShopRushTest.shopProgress().upgrades["second-repair-bench"],scenarios:RepairScenarios.all.length})`);
  if (reload.balance !== 50 || !reload.installed) throw new Error("reload persistence failed");
  if (reload.scenarios !== 10) throw new Error("scenario count changed");
  await evaluate(`(()=>{const profile=FridayArcadeProfile.getProfile();profile.gameStats["repair-shop-rush"]={highestLevelUnlocked:3,repairShop:{shopFunds:405,ownedUpgrades:["second-repair-bench"]}};FridayArcadeProfile.saveProfile(profile);location.reload();})()`);
  await delay(700);
  const migration = await evaluate(`({balance:RepairShopRushTest.shopProgress().shopBalance,installed:RepairShopRushTest.shopProgress().upgrades["second-repair-bench"],saved:FridayArcadeProfile.getGameStats("repair-shop-rush").repairShopRush})`);
  if (migration.balance !== 705 || !migration.installed || migration.saved.shopBalance !== 705) throw new Error("legacy migration failed");
  if (browserErrors.length) throw new Error(`browser errors: ${browserErrors.join(", ")}`);
  process.stdout.write(JSON.stringify({ results, reload, migration, browserErrors }, null, 2));
} finally {
  if (ws) ws.close();
  browser.kill();
}
