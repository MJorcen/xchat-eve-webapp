// 礼物列表（真实后端 item/gift/page）。真实礼物 icon 为图片 URL（非 emoji）。
import { http } from "./http";
import type { Gift } from "@/types/eve";

interface RawGift {
  id: number;
  itemPriceCoin?: number;
  requiredVipLevel?: number;
  item?: { itemId?: number; itemName?: string; itemIcon?: string };
}

/** 礼物面板列表。name 为后端 i18n key（如 item.name.i18n.220）时隐去，只展示图标+价格。 */
export function getGifts(): Promise<Gift[]> {
  return http.get<{ list?: RawGift[] }>("/item/gift/page", { offset: 0, limit: 50 }).then((r) =>
    (r?.list ?? []).map((g) => {
      const name = g.item?.itemName ?? "";
      return {
        id: g.item?.itemId ?? g.id,
        name: /^item\./.test(name) ? "" : name,
        icon: g.item?.itemIcon ?? "",
        price: g.itemPriceCoin ?? 0
      } as Gift;
    })
  );
}

interface RawAchieveGift {
  id: number;
  itemCount?: number;
  item?: { itemId?: number; itemName?: string; itemIcon?: string };
}

/** 礼物墙单项（用户累计收到的某礼物）。 */
export interface ReceivedGift {
  id: number;
  name: string;
  icon: string;
  count: number;
}

/** 某用户已收礼物墙（item/userAchieve/giftPage，按礼物聚合，itemCount 为累计数量；传 userId 查他人）。 */
export function getReceivedGifts(userId: number, limit = 20): Promise<ReceivedGift[]> {
  return http
    .get<{ list?: RawAchieveGift[] }>("/item/userAchieve/giftPage", { userId, offset: 0, limit })
    .then((r) =>
      (r?.list ?? []).map((g) => {
        const name = g.item?.itemName ?? "";
        return {
          id: g.item?.itemId ?? g.id,
          name: /^item\./.test(name) ? "" : name,
          icon: g.item?.itemIcon ?? "",
          count: g.itemCount ?? 0
        };
      })
    );
}
