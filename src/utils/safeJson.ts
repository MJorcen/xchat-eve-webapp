// 大整数安全 JSON 解析。
// 后端雪花 id(如 eve 通话记录 id / eveId,19 位,> Number.MAX_SAFE_INTEGER=2^53≈9e15)经原生
// JSON.parse 会被舍成最接近的 double,精度丢失(如 …152 → …150),导致后续按 id 调接口/上报埋点全错位。
// 这里在 parse 前，把「值位置」的 16 位及以上整数先加引号转成字符串:
//   - 只匹配紧跟 `:` `[` `,` 之后的数字(JSON 里的值位置),用前瞻保留结尾分隔符,连续数字也能各自命中;
//   - 13 位时间戳、普通小 id(< 16 位)不受影响;
//   - 字符串内容里的数字(如 "call_262…")因前面不是 `:[,` 而不会被误伤。
// 仅在明确会返回大 id 的接口按需启用,避免影响其它接口的数字字段类型。
export function parseJsonBigIntSafe(text: string): unknown {
  return JSON.parse(text.replace(/([:[,]\s*)(-?\d{16,})(?=\s*[,\]}])/g, '$1"$2"'));
}
