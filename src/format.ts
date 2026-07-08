/** 秒を mm:ss.d 表記に整形する。 */
export function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const d = Math.floor((sec * 10) % 10);
  return `${m}:${s.toString().padStart(2, "0")}.${d}`;
}
