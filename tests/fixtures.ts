import sharp from "sharp";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Builds a `size x size` RGB image split into a left/right half of two flat colours. */
async function splitImageBuffer(size: number, leftColor: [number, number, number], rightColor: [number, number, number]) {
  const channels = 3;
  const raw = Buffer.alloc(size * size * channels);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = x < size / 2 ? leftColor : rightColor;
      const offset = (y * size + x) * channels;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
    }
  }
  return sharp(raw, { raw: { width: size, height: size, channels } });
}

export async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "phash-dedupe-test-"));
}

/** A black-left/white-right image, saved as PNG. Distinct hash from {@link writeMirrorImage}. */
export async function writeSplitImage(dir: string, name: string, quality?: number): Promise<string> {
  const path = join(dir, name);
  const image = (await splitImageBuffer(64, [0, 0, 0], [255, 255, 255])).png();
  const buffer = quality ? await image.jpeg({ quality }).toBuffer() : await image.toBuffer();
  await writeFile(path, buffer);
  return path;
}

/** The horizontal mirror of {@link writeSplitImage} — white-left/black-right. */
export async function writeMirrorImage(dir: string, name: string): Promise<string> {
  const path = join(dir, name);
  const buffer = await (await splitImageBuffer(64, [255, 255, 255], [0, 0, 0])).png().toBuffer();
  await writeFile(path, buffer);
  return path;
}

/** A flat single-colour image — a degenerate case where dHash always yields 0n. */
export async function writeFlatImage(dir: string, name: string, color: [number, number, number]): Promise<string> {
  const path = join(dir, name);
  const buffer = await (await splitImageBuffer(64, color, color)).png().toBuffer();
  await writeFile(path, buffer);
  return path;
}
