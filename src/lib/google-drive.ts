import { google } from "googleapis";

const VOUCHERS_FOLDER_NAME = "InterFAX CRM - Vouchers";

function getDrive(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

export async function getOrCreateVouchersFolder(accessToken: string): Promise<string> {
  const drive = getDrive(accessToken);
  const res = await drive.files.list({
    q: `name='${VOUCHERS_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });
  if (res.data.files && res.data.files.length > 0) return res.data.files[0].id!;
  const folder = await drive.files.create({
    requestBody: { name: VOUCHERS_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return folder.data.id!;
}

async function getOrCreateClientFolder(accessToken: string, parentId: string, clientName: string): Promise<string> {
  const drive = getDrive(accessToken);
  const safe = clientName.replace(/[/\\?%*:|"<>]/g, "-").trim();
  const res = await drive.files.list({
    q: `name='${safe}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id)",
  });
  if (res.data.files && res.data.files.length > 0) return res.data.files[0].id!;
  const folder = await drive.files.create({
    requestBody: { name: safe, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  return folder.data.id!;
}

export async function uploadVoucher(
  accessToken: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  contactName: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDrive(accessToken);
  const rootId = await getOrCreateVouchersFolder(accessToken);
  const folderId = await getOrCreateClientFolder(accessToken, rootId, contactName);

  const { Readable } = await import("stream");
  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id, webViewLink",
  });

  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: { role: "reader", type: "anyone" },
  });

  return { fileId: file.data.id!, webViewLink: file.data.webViewLink! };
}

export async function deleteVoucher(accessToken: string, fileId: string): Promise<void> {
  const drive = getDrive(accessToken);
  await drive.files.delete({ fileId });
}
