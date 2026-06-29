// 相册接口（真实后端 UserAlbumController：逐项 CRUD，非全量覆盖；add 带内容审核）。
import { http } from "./http";

export interface AlbumPhoto {
  id: number;
  url: string;
  weight?: number;
  status?: number;
  pending?: boolean; // 审核中
}

/** 我的相册列表。 */
export function getAlbumList(): Promise<AlbumPhoto[]> {
  return http.get<{ list?: AlbumPhoto[] }>("/user/album/list").then((r) => r?.list ?? []);
}

/** 新增一张相册照片（url 为已上传的下载地址）。后端会做内容审核，未过会抛错。 */
export function addAlbumPhoto(url: string): Promise<AlbumPhoto> {
  return http.post<AlbumPhoto>("/user/album/add", { url });
}

/** 删除一张相册照片。 */
export function deleteAlbumPhoto(id: number): Promise<void> {
  return http.del<void>(`/user/album/${id}`);
}
