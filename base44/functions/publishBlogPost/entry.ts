import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Publishing endpoint for the public blog.
 *
 * HeyCatch (or any trusted publisher) files an article by POSTing JSON here with
 * the shared key in `x-blog-key` (or `Authorization: Bearer <key>`). An
 * administrator signed into the app can call it without the key.
 *
 * Idempotent by design: the same article sent twice — matched on `external_id`,
 * or on `slug` when no external id is given — updates the existing post instead
 * of creating a duplicate. Publishing defaults to live; send `status: 'draft'`
 * to stage an article for review.
 *
 * Required: title, content. Everything else is optional.
 */

const ADMIN_ROLES = [
  'Platform Admin',
  'Super Administrator',
  'Admin Level 1',
  'Admin Level 2',
];

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function readingMinutes(markdown: string): number {
  const words = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 210));
}

function suppliedKey(req: Request): string {
  const header = req.headers.get('x-blog-key') || '';
  if (header) return header;
  const auth = req.headers.get('authorization') || '';
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
}

async function uniqueSlug(base44: any, base: string, ignoreId?: string): Promise<string> {
  let candidate = base || `article-${Date.now().toString(36)}`;
  for (let i = 2; i < 40; i += 1) {
    const page = await base44.asServiceRole.entities.BlogPost.filter(
      { slug: candidate },
      { limit: 5 }
    );
    const rows = Array.isArray(page) ? page : page?.items || [];
    if (!rows.some((row: any) => row.id !== ignoreId)) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed. POST an article.' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);

    if (!body || !body.title || !body.content) {
      return Response.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }

    // ── Who is filing this article ──────────────────────────────────────────
    const accepted = [process.env.BLOG_PUBLISH_KEY, process.env.INTERNAL_FUNCTION_SECRET]
      .filter(Boolean);
    let authorized = accepted.length > 0 && accepted.includes(suppliedKey(req));

    if (!authorized) {
      const user = await base44.auth.me().catch(() => null);
      const role = user?.app_role || user?.data?.app_role;
      authorized = !!user && (user.role === 'admin' || ADMIN_ROLES.includes(role));
    }

    if (!authorized) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Find the article this replaces, if any ──────────────────────────────
    let existing = null;
    if (body.external_id) {
      const page = await base44.asServiceRole.entities.BlogPost.filter(
        { external_id: String(body.external_id) },
        { limit: 1 }
      );
      existing = (Array.isArray(page) ? page : page?.items || [])[0] || null;
    }
    if (!existing) {
      const base = slugify(body.slug || body.title);
      const page = await base44.asServiceRole.entities.BlogPost.filter(
        { slug: base },
        { limit: 1 }
      );
      existing = (Array.isArray(page) ? page : page?.items || [])[0] || null;
    }

    const status = body.status === 'draft' || body.status === 'archived'
      ? body.status
      : 'published';

    const slug = await uniqueSlug(
      base44,
      existing?.slug || slugify(body.slug || body.title),
      existing?.id
    );

    const publishedDate =
      body.published_date ||
      existing?.published_date ||
      (status === 'published' ? new Date().toISOString() : null);

    const payload: Record<string, any> = {
      title: String(body.title).trim(),
      slug,
      content: body.content,
      excerpt: body.excerpt || existing?.excerpt || '',
      cover_image_url: body.cover_image_url || existing?.cover_image_url || '',
      category: body.category || existing?.category || 'Leadership',
      tags: Array.isArray(body.tags) ? body.tags : existing?.tags || [],
      author_name: body.author_name || existing?.author_name || 'Curiosity Led',
      author_role: body.author_role || existing?.author_role || '',
      author_avatar_url: body.author_avatar_url || existing?.author_avatar_url || '',
      status,
      published_date: publishedDate,
      reading_minutes: Number(body.reading_minutes) || readingMinutes(body.content),
      featured: typeof body.featured === 'boolean' ? body.featured : existing?.featured || false,
      meta_title: body.meta_title || existing?.meta_title || '',
      meta_description: body.meta_description || existing?.meta_description || '',
      source: body.source === 'manual' ? 'manual' : 'heycatch',
      external_id: body.external_id ? String(body.external_id) : existing?.external_id || '',
    };

    const saved = existing
      ? await base44.asServiceRole.entities.BlogPost.update(existing.id, payload)
      : await base44.asServiceRole.entities.BlogPost.create(payload);

    return Response.json({
      success: true,
      action: existing ? 'updated' : 'created',
      id: saved?.id || existing?.id,
      slug,
      status,
      url: `/blog/${slug}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}