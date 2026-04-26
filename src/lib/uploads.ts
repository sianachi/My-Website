export type PresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

export type UploadOpts = {
  tokenUrl: string;
  file: Blob;
  pathname?: string;
  contentType?: string;
  onProgress?: (percent: number) => void;
};

export async function presignAndUpload(
  opts: UploadOpts,
): Promise<PresignResult> {
  const contentType =
    opts.contentType ?? opts.file.type ?? "application/octet-stream";

  const tokenRes = await fetch(opts.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pathname: opts.pathname,
      contentType,
      contentLength: opts.file.size,
    }),
  });
  if (!tokenRes.ok) {
    const errBody = (await tokenRes.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      errBody?.error || `upload-token failed: ${tokenRes.status}`,
    );
  }
  const presign = (await tokenRes.json()) as PresignResult;
  await putWithProgress(
    presign.uploadUrl,
    opts.file,
    contentType,
    opts.onProgress,
  );
  return presign;
}

function putWithProgress(
  url: string,
  file: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress((event.loaded / event.total) * 100);
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };
    xhr.onerror = () =>
      reject(new Error("upload network error — check CORS on the bucket"));
    xhr.send(file);
  });
}
