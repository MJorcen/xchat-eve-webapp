// 充值产品列表（真实后端 /trade/product/promo/list → ProductVo）。
// 支付（选渠道→下单→网关）在 H5/dev 不可闭环(仅原生 IAP 渠道解析、第三方渠道 dev 未配),暂未接;
// 此服务只负责把真实产品目录映射成 eve 的 WalletPackage 供 RechargePage 展示。
import { http } from "./http";
import type { WalletPackage } from "@/types/eve";

interface RawPrice {
  symbol?: string;
  convertedAmount?: number;
  currency?: string;
}
interface RawProduct {
  product?: { id?: number; coin?: number; amount?: number; name?: string };
  productGiveCoin?: number;
  promo?: { promoKind?: string; promoValue?: number };
  methodOptions?: Array<{ options?: Array<{ price?: RawPrice }> }>;
}

// ProductVo → WalletPackage。bonus 取 promo(BONUS_RATE 按比例 / BONUS_FIXED 固定);
// price 优先用渠道返回的本币展示价(symbol+convertedAmount),回退到 product.amount(美分→美元)。
function toPackage(r: RawProduct): WalletPackage {
  const coin = r.product?.coin ?? 0;
  let bonus = 0;
  const kind = r.promo?.promoKind;
  const val = r.promo?.promoValue ?? 0;
  if (kind === "BONUS_RATE") bonus = Math.floor((coin * val) / 100);
  else if (kind === "BONUS_FIXED") bonus = val;

  const p = r.methodOptions?.[0]?.options?.[0]?.price;
  const price =
    p?.symbol != null && p?.convertedAmount != null
      ? `${p.symbol}${p.convertedAmount.toFixed(2)}`
      : `$${((r.product?.amount ?? 0) / 100).toFixed(2)}`;

  return { id: r.product?.id ?? 0, coins: coin, bonus, price };
}

/** 充值产品列表(真实)。后端按国家解析币种/促销:dev 注入 CF-IPCountry,prod 由 Cloudflare 提供真实国家头。 */
export function getRechargeProducts(): Promise<WalletPackage[]> {
  const opts = import.meta.env.DEV ? { headers: { "CF-IPCountry": "US" } } : undefined;
  return http
    .get<RawProduct[] | { list?: RawProduct[] }>("/trade/product/promo/list", undefined, opts)
    .then((r) => {
      const list = Array.isArray(r) ? r : (r?.list ?? []);
      return list.filter((x) => x.product?.id != null).map(toPackage);
    });
}
