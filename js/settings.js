// 設定畫面：音效開關/音量、重置進度

function initSettingsUI() {
  const settings = storageGetSettings();

  document.getElementById("settings-sound-toggle").checked = settings.soundOn;
  document.getElementById("settings-volume-slider").value = settings.volume;
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
