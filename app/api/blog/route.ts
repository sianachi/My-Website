import { NextResponse } from "next/server";
import { getPost, getPublishedPosts } from "@/server/blog";

// Reads from MongoDB/S3 per request — never prerendered at build time.
export const dynamic = "force-dynamic";

import { errorResponse } from "@/server/lib/route-helpers";
import { BlogTagSchema } from "@/shared/data/blog";

const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(req: Request): Promise<Response> {
  try {
    const params = new URL(req.url).searchParams;
    const slugParam = params.get("slug");
    const tagParam = params.get("tag");

    if (slugParam) {
      const post = await getPost(slugParam);
      if (!post) {
        return NextResponse.json({ message: "Not Found" }, { status: 404 });
      }
      return NextResponse.json(post, {
        status: 200,
        headers: { "Cache-Control": CACHE_HEADER },
      });
    }

    if (tagParam) {
      const tag = BlogTagSchema.safeParse(tagParam);
      if (!tag.success) {
        return NextResponse.json({ error: "invalid_tag" }, { status: 400 });
      }
      const posts = await getPublishedPosts(tag.data);
      return NextResponse.json(
        { posts },
        { status: 200, headers: { "Cache-Control": CACHE_HEADER } },
      );
    }

    const posts = await getPublishedPosts();
    return NextResponse.json(
      { posts },
      { status: 200, headers: { "Cache-Control": CACHE_HEADER } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
