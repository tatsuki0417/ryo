import { exec } from "node:child_process";
import { platform } from "node:os";

/**
 * OS ごとの電源操作コマンド定義。
 * それぞれ「そのOSでのコマンド」を持つ。未対応の組み合わせは null。
 */
const COMMANDS = {
  win32: {
    sleep: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0',
    shutdown: "shutdown /s /t 0",
    restart: "shutdown /r /t 0",
    lock: "rundll32.exe user32.dll,LockWorkStation",
    logoff: "shutdown /l",
  },
  darwin: {
    sleep: "pmset sleepnow",
    shutdown: 'osascript -e \'tell app "System Events" to shut down\'',
    restart: 'osascript -e \'tell app "System Events" to restart\'',
    lock: 'pmset displaysleepnow && osascript -e \'tell application "System Events" to keystroke "q" using {control down, command down}\'',
    logoff: 'osascript -e \'tell app "System Events" to log out\'',
  },
  linux: {
    // systemd 環境を想定。無い場合は環境に合わせて config で調整可能。
    sleep: "systemctl suspend",
    shutdown: "systemctl poweroff",
    restart: "systemctl reboot",
    lock: "loginctl lock-session",
    logoff: "loginctl terminate-user $USER",
  },
};

export const ACTION_LABELS = {
  sleep: { ja: "スリープ", icon: "🌙", dangerous: false },
  lock: { ja: "画面ロック", icon: "🔒", dangerous: false },
  logoff: { ja: "ログオフ", icon: "🚪", dangerous: true },
  restart: { ja: "再起動", icon: "🔄", dangerous: true },
  shutdown: { ja: "シャットダウン", icon: "⏻", dangerous: true },
};

export function getCurrentOS() {
  return platform();
}

/** 現在のOSで実行可能なアクション一覧を、config の許可リストと突き合わせて返す。 */
export function availableActions(allowedActions) {
  const os = getCurrentOS();
  const osCmds = COMMANDS[os] || {};
  return allowedActions
    .filter((a) => osCmds[a])
    .map((a) => ({
      id: a,
      label: ACTION_LABELS[a]?.ja || a,
      icon: ACTION_LABELS[a]?.icon || "•",
      dangerous: ACTION_LABELS[a]?.dangerous || false,
    }));
}

/**
 * アクションを実行する。config の許可リストに含まれていなければ拒否する。
 * @returns {Promise<{ok:boolean, message:string}>}
 */
export function runAction(action, allowedActions) {
  return new Promise((resolve) => {
    if (!allowedActions.includes(action)) {
      resolve({ ok: false, message: `アクション "${action}" は許可されていません` });
      return;
    }
    const os = getCurrentOS();
    const cmd = COMMANDS[os]?.[action];
    if (!cmd) {
      resolve({ ok: false, message: `このOS(${os})では "${action}" に対応していません` });
      return;
    }

    const label = ACTION_LABELS[action]?.ja || action;
    console.log(`[power] 実行: ${label} -> ${cmd}`);

    exec(cmd, { timeout: 10000 }, (err) => {
      if (err) {
        console.error(`[power] 失敗:`, err.message);
        resolve({ ok: false, message: `${label} の実行に失敗しました: ${err.message}` });
      } else {
        resolve({ ok: true, message: `${label} を実行しました` });
      }
    });
  });
}
