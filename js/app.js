(function () {
  "use strict";

  function renderProfile() {
    const api = window.FridayArcadeProfile;
    if (!api) return;
    const profile = api.getProfile();
    const values = {
      displayName: profile.displayName,
      level: profile.level,
      xp: profile.xp.toLocaleString(),
      arcadeTokens: profile.arcadeTokens.toLocaleString(),
      fridayWins: profile.fridayWins.toLocaleString(),
      badgeCount: profile.badges.length.toLocaleString()
    };

    Object.keys(values).forEach(key => {
      document.querySelectorAll(`[data-profile="${key}"]`).forEach(node => { node.textContent = values[key]; });
    });
    document.querySelectorAll("[data-profile-label]").forEach(node => { node.textContent = profile.displayName; });

    const progress = api.getLevelProgress(profile.xp);
    const percent = Math.min(100, Math.round((progress.current / progress.required) * 100));
    const bar = document.querySelector("[data-xp-bar]");
    const track = document.querySelector(".xp-track");
    const next = document.querySelector("[data-xp-next]");
    if (bar) requestAnimationFrame(() => { bar.style.width = `${percent}%`; });
    if (track) {
      track.setAttribute("aria-valuenow", progress.current);
      track.setAttribute("aria-valuemax", progress.required);
      track.setAttribute("aria-valuetext", `${progress.current} of ${progress.required} XP toward level ${progress.level + 1}`);
    }
    if (next) next.textContent = `${progress.required - progress.current} XP to Level ${progress.level + 1}`;
  }

  document.addEventListener("DOMContentLoaded", renderProfile);
}());
