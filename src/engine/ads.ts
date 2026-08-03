// リワード広告（動画をみてコイン）の抽象化。
//
// いまは「テスト用スタブ」：実際の広告のかわりに少しまって“見た”ことにしてコインを配る。
// 公開して収益化するときは、無料のHTML5ゲームポータル
// （GameDistribution / CrazyGames / Poki など）に登録し、そのSDKを読み込んで
// 下の `setAdProvider(...)` で本物のプロバイダに差し替えるだけでOK。
// ※ネイティブアプリ（Play/AppStore）にしなくても、Webのまま無料でリワード広告を出せます。

export const REWARD_COINS = 50;

export interface RewardedAdProvider {
  /** すぐ広告を出せるか */
  isReady(): boolean;
  /** 広告を表示。最後まで見たら true（報酬あり）、スキップ/失敗なら false */
  show(): Promise<boolean>;
}

// テスト用スタブ：本物の広告のかわりに約1.2秒まって「見た」ことにする。
const STUB_MS = 1200;
const stubProvider: RewardedAdProvider = {
  isReady: () => true,
  show: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), STUB_MS)),
};

let provider: RewardedAdProvider = stubProvider;

/**
 * 本番の広告SDKに差し替える（配信ポータルが決まったらここに実装を渡す）。
 * 例）GameDistribution: window.gdsdk.showAd('rewarded') をラップした provider を渡す。
 */
export function setAdProvider(p: RewardedAdProvider): void {
  provider = p;
}

/** いま使っているのがテスト用スタブか（本番SDK未接続か）を判定 */
export function isStubAds(): boolean {
  return provider === stubProvider;
}

export function isRewardedReady(): boolean {
  try {
    return provider.isReady();
  } catch {
    return false;
  }
}

/** リワード広告を表示。最後まで見たら true（＝報酬を渡してよい）。 */
export async function showRewardedAd(): Promise<boolean> {
  try {
    return await provider.show();
  } catch {
    return false;
  }
}
