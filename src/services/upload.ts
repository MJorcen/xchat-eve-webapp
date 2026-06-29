// 文件上传（对齐 panjoy FileRepository）：取预签名地址 → PUT 直传对象存储 → 用 downloadUrl。
// COS 已配 CORS（Allow-Origin *, Allow-Methods PUT），浏览器可直传。
import { http } from "./http";
import { useUserStore } from "@/stores";

interface UploadUrlResponse {
  uploadUrl: string; // COS 预签名 PUT 地址
  downloadUrl: string; // 最终公开访问地址（存入 icon/album）
}

function getUploadUrl(fileName: string, model: string): Promise<UploadUrlResponse> {
  const userId = useUserStore().user.id;
  return http.get<UploadUrlResponse>("/facade/file/upload-url", { fileName, model, userId });
}

/**
 * 上传单个文件，返回可访问的下载地址。
 * @param model 业务模块名（头像/相册用 "user"）。
 */
export async function uploadFile(file: File, model = "user"): Promise<string> {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot) : "";
  const fileName = `${Date.now()}_${Math.floor(Math.random() * 90000 + 10000)}${ext}`;
  const { uploadUrl, downloadUrl } = await getUploadUrl(fileName, model);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" }
  });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
  return downloadUrl;
}
