export function countryFlag(region: string) {
  return `/countries/ic_contry_${region.toLowerCase()}.webp`;
}

export const eveAsset = (path: string) => `/assets/eve/${path}`;
