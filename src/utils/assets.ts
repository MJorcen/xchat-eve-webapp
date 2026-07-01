// 国旗：直接用 emoji(ISO 3166-1 alpha-2 两位字母 → 区域指示符),不再依赖 /countries/*.webp。
// iOS/Android 原生渲染;Windows 桌面浏览器不显示国旗 emoji(会退化成两位字母),H5 移动端可接受。
// 非两位字母(空/区域码/国家名)返回空串,由 <CountryFlag> 决定不渲染。
export function countryFlag(region?: string): string {
  if (!region) return "";
  const code = region.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
