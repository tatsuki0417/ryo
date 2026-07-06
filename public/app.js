// ryo remote — フロントエンド（依存なしの素の JS）
const $ = (id) => document.getElementById(id);
const TOKEN_KEY = "ryo_token";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  cameraOn: false,
  cameraCfg: null,
};

// ---------- API ----------
async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ---------- 画面切り替え ----------
function showLogin() {
  $("login").hidden = false;
  $("main").hidden = true;
  $("pin").value = "";
  $("pin").focus();
}

async function showMain() {
  $("login").hidden = true;
  $("main").hidden = false;
  await loadConfig();
}

// ---------- ログイン ----------
async function login() {
  const pin = $("pin").value.trim();
  const err = $("loginError");
  err.hidden = true;
  if (!pin) return;
  $("loginBtn").disabled = true;
  try {
    const { status, data } = await api("/api/login", { method: "POST", body: { pin } });
    if (status === 200 && data.token) {
      state.token = data.token;
      localStorage.setItem(TOKEN_KEY, data.token);
      await showMain();
    } else {
      err.textContent = data.message || "ログインに失敗しました";
      err.hidden = false;
    }
  } catch {
    err.textContent = "サーバーに接続できません";
    err.hidden = false;
  } finally {
    $("loginBtn").disabled = false;
  }
}

function logout() {
  stopCamera();
  state.token = null;
  localStorage.removeItem(TOKEN_KEY);
  showLogin();
}

// ---------- 設定読み込み & UI 構築 ----------
async function loadConfig() {
  const { status, data } = await api("/api/config");
  if (status === 401) return logout();
  if (!data.ok) return;

  state.cameraCfg = data.camera;
  $("osBadge").textContent = data.os;

  // カメラ有無
  const camBlock = $("cameraBox").closest(".block");
  camBlock.hidden = !data.camera.enabled;

  // 電源操作ボタン生成
  const grid = $("actions");
  grid.innerHTML = "";
  for (const a of data.actions) {
    const el = document.createElement("div");
    el.className = "action" + (a.dangerous ? " dangerous" : "");
    el.innerHTML = `<div class="ico">${a.icon}</div><div class="name">${a.label}</div>`;
    el.addEventListener("click", () =>
      confirmAction(a, data.confirmDangerousActions && a.dangerous)
    );
    grid.appendChild(el);
  }
  if (data.actions.length === 0) {
    grid.innerHTML = `<p class="hint">このOSで利用できる操作がありません</p>`;
  }
}

// ---------- 電源操作 ----------
function confirmAction(action, needConfirm) {
  if (!needConfirm) return doAction(action);
  $("confirmIcon").textContent = action.icon;
  $("confirmText").textContent = `${action.label} を実行しますか？`;
  $("confirm").hidden = false;
  $("confirmOk").onclick = () => {
    $("confirm").hidden = true;
    doAction(action);
  };
  $("confirmCancel").onclick = () => ($("confirm").hidden = true);
}

async function doAction(action) {
  toast(`${action.label} を送信中…`);
  try {
    const { status, data } = await api("/api/action", {
      method: "POST",
      body: { action: action.id },
    });
    if (status === 401) return logout();
    toast(data.message || (data.ok ? "実行しました" : "失敗しました"), data.ok ? "ok" : "err");
  } catch {
    // スリープ/シャットダウンでは応答前に接続が切れることがある（正常）
    toast(`${action.label} を送信しました`, "ok");
  }
}

// ---------- カメラ ----------
function startCamera() {
  const img = $("cameraImg");
  const ph = $("cameraPlaceholder");
  // トークンはヘッダを付けられないのでクエリで渡す
  img.src = `${state.cameraCfg.streamPath}?token=${encodeURIComponent(state.token)}&t=${Date.now()}`;
  img.hidden = false;
  ph.hidden = true;
  state.cameraOn = true;
  $("cameraToggle").textContent = "⏸ 停止";
  $("cameraMsg").textContent = "";

  img.onerror = () => {
    $("cameraMsg").textContent =
      "映像を取得できませんでした。PCに ffmpeg が入っているか、カメラ設定(config.json)を確認してください。";
    stopCamera();
  };
}

function stopCamera() {
  const img = $("cameraImg");
  img.src = "";
  img.hidden = true;
  $("cameraPlaceholder").hidden = false;
  state.cameraOn = false;
  $("cameraToggle").textContent = "▶ 映像を表示";
}

function toggleCamera() {
  state.cameraOn ? stopCamera() : startCamera();
}

async function snapshot() {
  toast("撮影中…");
  try {
    const res = await fetch(
      `${state.cameraCfg.snapshotPath}?token=${encodeURIComponent(state.token)}&t=${Date.now()}`
    );
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.message || "スナップショットに失敗しました", "err");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const img = $("cameraImg");
    stopCamera();
    img.src = url;
    img.hidden = true; // 一旦
    // ダウンロードリンクを開く
    const a = document.createElement("a");
    a.href = url;
    a.download = `snapshot-${Date.now()}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast("スナップショットを保存しました", "ok");
  } catch {
    toast("スナップショットに失敗しました", "err");
  }
}

// ---------- トースト ----------
let toastTimer;
function toast(msg, kind = "") {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast " + kind;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3000);
}

// ---------- イベント ----------
$("loginBtn").addEventListener("click", login);
$("pin").addEventListener("keydown", (e) => e.key === "Enter" && login());
$("logoutBtn").addEventListener("click", logout);
$("cameraToggle").addEventListener("click", toggleCamera);
$("snapshotBtn").addEventListener("click", snapshot);

// ---------- 初期化 ----------
(async function init() {
  if (state.token) {
    const { status } = await api("/api/config");
    if (status === 200) return showMain();
  }
  showLogin();
})();
