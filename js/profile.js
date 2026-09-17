(function (global) {
  "use strict";

  // Temporary local adapter. Its public API keeps games independent of storage,
  // so a shared Repair Academy / Friday Arcade account service can replace or
  // synchronize this implementation later without rewriting each game.
  const STORAGE_KEY = "fridayArcade.profile.v1";

  function defaults() {
    return {
      version: 1,
      playerId: null,
      displayName: "Guest",
      xp: 0,
      level: 1,
      arcadeTokens: 0,
      fridayWins: 0,
      badges: [],
      unlockedCosmetics: [],
      gameStats: {},
      // Future server-issued rewards and entitlements can retain their source,
      // transaction ID, and redemption state here. No synchronization exists yet.
      rewardLedger: []
    };
  }

  function levelFromXP(xp) {
    // Each level takes 50 XP more than the one before it: 100, 150, 200...
    let level = 1;
    let threshold = 100;
    let remaining = Math.max(0, Number(xp) || 0);
    while (remaining >= threshold) {
      remaining -= threshold;
      level += 1;
      threshold += 50;
    }
    return { level, current: remaining, required: threshold };
  }

  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    const profile = Object.assign(defaults(), source);
    profile.badges = Array.isArray(source.badges) ? source.badges : [];
    profile.unlockedCosmetics = Array.isArray(source.unlockedCosmetics) ? source.unlockedCosmetics : [];
    profile.rewardLedger = Array.isArray(source.rewardLedger) ? source.rewardLedger : [];
    profile.gameStats = source.gameStats && typeof source.gameStats === "object" ? source.gameStats : {};
    profile.xp = Math.max(0, Number(profile.xp) || 0);
    profile.arcadeTokens = Math.max(0, Number(profile.arcadeTokens) || 0);
    profile.level = levelFromXP(profile.xp).level;
    return profile;
  }

  function getProfile() {
    try {
      const stored = global.localStorage.getItem(STORAGE_KEY);
      const profile = normalize(stored ? JSON.parse(stored) : null);
      if (!stored) saveProfile(profile);
      return profile;
    } catch (error) {
      console.warn("Friday Arcade profile storage is unavailable; using a session profile.", error);
      return normalize(null);
    }
  }

  function saveProfile(profile) {
    const clean = normalize(profile);
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); }
    catch (error) { console.warn("Friday Arcade profile could not be saved.", error); }
    return clean;
  }

  function update(mutator) {
    const profile = getProfile();
    mutator(profile);
    return saveProfile(profile);
  }

  const api = {
    getProfile,
    saveProfile,
    resetProfile() {
      try { global.localStorage.removeItem(STORAGE_KEY); } catch (error) { /* use defaults */ }
      return saveProfile(defaults());
    },
    addXP(amount) { return update(p => { p.xp += Math.max(0, Number(amount) || 0); }); },
    addTokens(amount) { return update(p => { p.arcadeTokens += Math.max(0, Number(amount) || 0); }); },
    spendTokens(amount) {
      const cost = Math.max(0, Number(amount) || 0);
      const profile = getProfile();
      if (profile.arcadeTokens < cost) return false;
      profile.arcadeTokens -= cost;
      saveProfile(profile);
      return true;
    },
    unlockBadge(id) {
      if (!id) return getProfile();
      return update(p => { if (!p.badges.includes(id)) p.badges.push(id); });
    },
    getGameStats(gameId) { return Object.assign({}, getProfile().gameStats[gameId] || {}); },
    updateGameStats(gameId, data) {
      if (!gameId || !data || typeof data !== "object") return getProfile();
      return update(p => { p.gameStats[gameId] = Object.assign({}, p.gameStats[gameId] || {}, data); });
    },
    clearGameStats(gameId) {
      if (!gameId) return getProfile();
      return update(p => { delete p.gameStats[gameId]; });
    },
    getLevelProgress(xp) { return levelFromXP(xp); }
  };

  global.FridayArcadeProfile = Object.freeze(api);
}(window));
