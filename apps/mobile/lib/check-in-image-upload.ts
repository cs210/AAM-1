import type * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Id } from '@packages/backend/convex/_generated/dataModel';
import { CHECK_IN_MAX_UPLOAD_DIMENSION } from '@/lib/check-in-shared';

export async function resizeCheckInPickerAsset(
  asset: ImagePicker.ImagePickerAsset,
  maxDimension = CHECK_IN_MAX_UPLOAD_DIMENSION
): Promise<{ uri: string; mimeType: string }> {
  const originalWidth = asset.width;
  const originalHeight = asset.height;

  if (!originalWidth || !originalHeight) {
    return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
  }

  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
  }

  const scale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight);
  const targetWidth = Math.max(1, Math.round(originalWidth * scale));
  const targetHeight = Math.max(1, Math.round(originalHeight * scale));

  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: targetWidth, height: targetHeight });

  const renderedImage = await context.renderAsync();
  const resizedImage = await renderedImage.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });

  return { uri: resizedImage.uri, mimeType: 'image/jpeg' };
}

export async function uploadCheckInPickerAssets(
  assets: ImagePicker.ImagePickerAsset[],
  generateUploadUrl: () => Promise<string>
): Promise<Id<'_storage'>[]> {
  const storageIds: Id<'_storage'>[] = [];

  for (const asset of assets) {
    const processed = await resizeCheckInPickerAsset(asset);
    const uploadUrl = await generateUploadUrl();
    const fileBlob = await fetch(processed.uri).then((r) => r.blob());

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': processed.mimeType },
      body: fileBlob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload one of the selected images.');
    }

    const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
    storageIds.push(storageId);
  }

  return storageIds;
}
