import type { APIRoute, GetStaticPaths } from 'astro';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { biensDiffuses } from '../../../../lib/flux';

/**
 * Photos des flux en JPEG de 1600 px, tirées au build des WebP du site :
 * certains portails refusent le WebP. Rien n'est versionné.
 */
export const getStaticPaths: GetStaticPaths = async () =>
  (await biensDiffuses()).flatMap((b) =>
    b.data.photos
      .map((p) => p.src.match(/\/(\d\d)\.webp$/)?.[1])
      .filter((n): n is string => Boolean(n))
      .map((n) => ({ params: { bien: b.id, n } }))
  );

export const GET: APIRoute = async ({ params }) => {
  const source = await readFile(`public/images/biens/${params.bien}/${params.n}.webp`);
  const jpeg = await sharp(source).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg' } });
};
