import { strFromU8, unzipSync } from 'fflate';
import { signedManifestSchema } from './contracts';
import { sha256Hex, stableJson } from './response-file';

export async function verifyArchiveLocally(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const archive = unzipSync(bytes);
  if (!archive['manifest.json']) throw new Error('manifest.json is missing from this ZIP.');
  const manifest = signedManifestSchema.parse(JSON.parse(strFromU8(archive['manifest.json'])));
  const { manifestHash, signature, ...unsigned } = manifest;
  const calculatedHash = await sha256Hex(stableJson(unsigned)); const failedFiles: string[] = [];
  for (const entry of manifest.files) {
    const file = archive[entry.path];
    if (!file || file.length !== entry.size || await sha256Hex(file) !== entry.sha256) failedFiles.push(entry.path);
  }
  const expectedPaths = new Set([...manifest.files.map((entry) => entry.path), 'manifest.json']);
  for (const path of Object.keys(archive)) if (!expectedPaths.has(path) && !path.endsWith('/')) failedFiles.push(path);
  return { manifest, calculatedHash, failedFiles: [...new Set(failedFiles)], intact: calculatedHash === manifestHash && failedFiles.length === 0, signature };
}
