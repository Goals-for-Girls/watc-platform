import { MAP_VIEWS, baseMapSvg, type MapViewKey } from "@/lib/mapGeometry";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return MAP_VIEWS.map((v) => ({ file: `${v.toLowerCase()}.svg` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const view = MAP_VIEWS.find((v) => `${v.toLowerCase()}.svg` === file) as MapViewKey;
  return new Response(baseMapSvg(view), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
