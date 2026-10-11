// 設定畫面：語言切換、音效開關/音量、重置進度

function initSettingsUI() {
  const settings = storageGetSettings();

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.lang === settings.lang);
  });

  document.getElementById("settings-sound-toggle").checked = settings.soundOn;
  document.getElementById("settings-volume-slider").value = settings.volume;
}

function handleLangChange(lang) {
  storageUpdateSettings({ lang });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.lang === lang);
  });
  applyStaticTranslations();
  refreshDynamicScreenText();
}

function handleSoundToggleChange(e) {
  storageUpdateSettings({ soundOn: e.target.checked });
  updateBgmVolume();
  if (e.target.checked) sfxClick();
}

function handleVolumeChange(e) {
  storageUpdateSettings({ volume: Number(e.target.value) });
  updateBgmVolume();
}

function handleResetProgress() {
  if (!window.confirm(t("settings.resetConfirm"))) return;
  storageResetProgress();
  gameState.failCount = storageGetFailCount();
  window.alert(t("settings.resetDone"));
}
