# Blog Category URL Migration Plan

Date: 2026-05-16

## Current Status

Updated: 2026-05-16

Completed:

- Phase 1 category route and Header navigation work is implemented.
- Phase 2 Supabase migration is applied.
- Existing published post slugs are rewritten to timestamp-free slugs.
- Existing published post categories are backfilled.
- Exact old URL to new URL 301 redirects are active in `next.config.ts`.
- `/blog` redirects to `/blog/overview`.
- Sitemap now lists category pages and new canonical article URLs only.
- Article canonical and `og:url` point to the new category URL.
- Phase 3 admin writing/editing cleanup is implemented.
- New posts require a category and use readable slugs without timestamps.
- Duplicate generated slugs resolve to `-2`, `-3`, etc.
- Blog edit links now use `/admin/blog/[id]/edit`.
- `blog_posts.category_slug` is now `NOT NULL`.
- Existing React lint issues that blocked `npm run build` are fixed.

Local verification:

```txt
npx tsc --noEmit                                           pass
npm run build                                              pass
GET /blog                                                   301 -> /blog/overview
GET /blog/clipa-for-mac-screen-recording-and-editing-1778512517340
                                                            301 -> /blog/compare/clipa-for-mac-screen-recording-and-editing
GET /blog/clipa-for-mac-screen-recording-and-editing        308 -> /blog/compare/clipa-for-mac-screen-recording-and-editing
GET /blog/compare/clipa-for-mac-screen-recording-and-editing
                                                            200
GET /blog/edit                                              200
GET /blog/edit/how-to-trim-a-screen-recording-on-mac        200
GET /admin/blog/f9d301d4-e691-4632-8390-5afeaa1f521d/edit  200
sitemap.xml                                                 contains new category URLs
sitemap.xml                                                 contains no timestamp blog URLs
```

Remaining:

- Production deploy verification.
- Submit updated sitemap in Google Search Console after deploy.
- Use URL Inspection on `/blog/overview`, several new article URLs, and several old timestamp URLs.

Known caveat:

- The local dev server is running at `http://127.0.0.1:3001`.

## Goal

Move Clipa blog URLs from flat timestamp slugs to category-based, readable URLs without breaking already indexed Google Search Console URLs.

Current example:

```txt
/blog/how-to-trim-a-screen-recording-on-mac-1777959230762
```

Target example:

```txt
/blog/edit/how-to-trim-a-screen-recording-on-mac
```

## Final Public URL Structure

```txt
/blog                     -> 301 -> /blog/overview
/blog/overview
/blog/capture
/blog/edit
/blog/export
/blog/compare
/blog/use-cases
/blog/troubleshooting

/blog/[category]/[slug]
```

Header `Blog` should link to `/blog/overview`.

## Categories

```txt
overview
capture
edit
export
compare
use-cases
troubleshooting
```

User-facing labels:

```txt
Overview
Capture
Edit
Export
Compare
Use Cases
Troubleshooting
```

Reserved slugs that should not be allowed as categories:

```txt
new
manage
admin
api
```

## Existing Post Mapping Draft

| Current title | New category | New slug |
|---|---|---|
| Clipa Studio: Record, Edit, and Export Screen Videos in One Native Mac App | overview | clipa-studio-record-edit-export-screen-videos |
| How to Fix Screen Recording Audio Out of Sync on Mac | troubleshooting | fix-screen-recording-audio-out-of-sync-on-mac |
| Clipa for Mac Screen Recording and Editing | compare | clipa-for-mac-screen-recording-and-editing |
| Screen Studio Alternative Guide for Mac Creators | compare | screen-studio-alternative-guide-for-mac-creators |
| Product Demo Video on Mac: How to Make One | use-cases | product-demo-video-on-mac |
| How to Record Professional Looking Online Course Videos on Mac | capture or use-cases | record-online-course-videos-on-mac |
| How to Trim a Screen Recording on Mac | edit | how-to-trim-a-screen-recording-on-mac |
| How to Speed Up a Screen Recording on Mac | edit | how-to-speed-up-a-screen-recording-on-mac |
| Add Background Music to Screen Recording on Mac (No iMovie Needed) | edit | add-background-music-to-screen-recording-on-mac |
| How to Add Zoom Effects to Mac Screen Recordings (Without the Editing Hours) | edit | add-zoom-effects-to-mac-screen-recordings |
| The Complete Guide to AI Upscaling for Mac Screen Recording | export | ai-upscaling-mac-screen-recording |

Open decision: `How to Record Professional Looking Online Course Videos on Mac` can be `capture` if we want at least one initial Capture article, but the search intent also fits `use-cases`.

## Phase 2 Approval Mapping Draft

This is the current old path to new path mapping prepared during Phase 1. Phase 2 should not run until this table is approved.

| Status | Old path | New path |
|---|---|---|
| published | `/blog/how-to-fix-screen-recording-audio-out-of-sync-on-mac-1778588656058` | `/blog/troubleshooting/fix-screen-recording-audio-out-of-sync-on-mac` |
| published | `/blog/clipa-for-mac-screen-recording-and-editing-1778512517340` | `/blog/compare/clipa-for-mac-screen-recording-and-editing` |
| published | `/blog/product-demo-video-on-mac-how-to-make-one-1778418993926` | `/blog/use-cases/product-demo-video-on-mac` |
| published | `/blog/how-to-trim-a-screen-recording-on-mac-1777959230762` | `/blog/edit/how-to-trim-a-screen-recording-on-mac` |
| published | `/blog/how-to-record-professional-looking-online-course-videos-on-mac-1777713117010` | `/blog/capture/record-online-course-videos-on-mac` |
| published | `/blog/how-to-speed-up-a-screen-recording-on-mac-1777703123942` | `/blog/edit/how-to-speed-up-a-screen-recording-on-mac` |
| published | `/blog/add-background-music-to-screen-recording-on-mac-no-imovie-needed-1777296968787` | `/blog/edit/add-background-music-to-screen-recording-on-mac` |
| published | `/blog/how-ai-upscaling-turns-blurry-mac-screen-recordings-into-4k-1776694854042` | `/blog/export/ai-upscaling-mac-screen-recording` |
| published | `/blog/how-to-add-zoom-effects-to-mac-screen-recordings-without-the-editing-hours-1776489215323` | `/blog/edit/add-zoom-effects-to-mac-screen-recordings` |
| published | `/blog/clipa-studio-record-edit-and-export-screen-videos-in-one-native-mac-app-1776084463125` | `/blog/overview/clipa-studio-record-edit-export-screen-videos` |
| draft | `/blog/screen-studio-alternative-guide-for-mac-creators-1778422783464` | `/blog/compare/screen-studio-alternative-guide-for-mac-creators` |

## Database Changes

Add category to posts:

```sql
alter table public.blog_posts
add column category_slug text;
```

Recommended later hardening:

```sql
alter table public.blog_posts
alter column category_slug set not null;

alter table public.blog_posts
add constraint blog_posts_category_slug_check
check (
  category_slug in (
    'overview',
    'capture',
    'edit',
    'export',
    'compare',
    'use-cases',
    'troubleshooting'
  )
);
```

Add redirect mapping table:

```sql
create table public.blog_redirects (
  old_path text primary key,
  new_path text not null,
  created_at timestamptz default now()
);
```

Each existing indexed URL should be inserted as:

```txt
old_path -> new_path
```

Example:

```txt
/blog/how-to-trim-a-screen-recording-on-mac-1777959230762
-> /blog/edit/how-to-trim-a-screen-recording-on-mac
```

## Routing Plan

Current:

```txt
src/app/blog/page.tsx
src/app/blog/[slug]/page.tsx
src/app/blog/[slug]/edit/page.tsx
src/app/blog/new/page.tsx
```

Target:

```txt
src/app/blog/page.tsx                         redirect to /blog/overview
src/app/blog/[category]/page.tsx              category landing page
src/app/blog/[category]/[slug]/page.tsx       article detail
src/app/blog/new/page.tsx                     admin-only new post
src/app/admin/blog/[id]/edit/page.tsx         admin-only edit post
```

Reason for moving edit to `/admin/blog/[id]/edit`:

- Avoid confusing public URLs like `/blog/edit/article-slug/edit`.
- Keep edit links stable even if category or slug changes.
- Separate public SEO routes from admin routes.

## Redirect Strategy

Priority: existing Google-indexed URLs must never become 404.

Use exact 301 redirects for existing paths.

For the initial 10-11 posts, safest option:

- Put static redirect entries in `next.config.ts`.
- Use `statusCode: 301`, not `permanent: true`, if exact 301 is required.
- Next redirects run before filesystem routes.

Example:

```ts
{
  source: '/blog/how-to-trim-a-screen-recording-on-mac-1777959230762',
  destination: '/blog/edit/how-to-trim-a-screen-recording-on-mac',
  statusCode: 301,
}
```

Also redirect:

```txt
/blog -> /blog/overview
```

Longer-term option:

- Keep `blog_redirects` table as the source of truth.
- Use middleware or a route handler if redirects become too many for static config.

## SEO Updates

Article canonical should use only the new URL:

```txt
https://www.clipa.studio/blog/[category]/[slug]
```

Sitemap should include:

```txt
/blog/overview
/blog/capture
/blog/edit
/blog/export
/blog/compare
/blog/use-cases
/blog/troubleshooting
/blog/[category]/[slug]
```

Sitemap should not include old timestamp slug URLs.

Old URLs should:

- Return 301.
- Not render duplicate article content.
- Not have separate canonical pages.
- Not be submitted in sitemap.

Expected Search Console behavior:

- Old URLs may move to `Page with redirect`; this is normal.
- Do not use removal requests.
- Do not add `noindex` to old URLs.
- Submit the updated sitemap after deployment.

## Breadcrumbs

Add visible breadcrumb and JSON-LD on article pages.

Example:

```txt
Home > Blog > Edit > How to Trim a Screen Recording on Mac
```

JSON-LD should match visible hierarchy:

```txt
Home
Blog
Edit
Article title
```

## Header Navigation

Desktop:

- `Blog` links to `/blog/overview`.
- Hover/focus opens dropdown.
- Dropdown links to all category pages.

Mobile:

- Blog menu should expand on tap.
- Category links should be normal anchor links.

Dropdown links:

```txt
Overview        /blog/overview
Capture         /blog/capture
Edit            /blog/edit
Export          /blog/export
Compare         /blog/compare
Use Cases       /blog/use-cases
Troubleshooting /blog/troubleshooting
```

## Slug Generation

Current behavior appends `Date.now()`:

```txt
title-slug-1778512517340
```

Target behavior:

1. Generate readable slug from title.
2. Check for duplicate slug within posts.
3. If duplicate, append human-readable suffix:

```txt
article-slug
article-slug-2
article-slug-3
```

Do not append timestamps to new slugs.

## Verification Checklist

Before deploy:

```bash
npm run build
```

Check local redirects and pages:

```bash
curl -I http://localhost:3000/blog
curl -I http://localhost:3000/blog/how-to-trim-a-screen-recording-on-mac-1777959230762
curl -I http://localhost:3000/blog/edit/how-to-trim-a-screen-recording-on-mac
curl -I http://localhost:3000/blog/edit
```

Expected:

```txt
/blog                                      301 -> /blog/overview
/blog/[old-timestamp-slug]                301 -> /blog/[category]/[new-slug]
/blog/[category]/[new-slug]               200
/blog/[category]                          200
```

After deploy:

```bash
curl -I https://www.clipa.studio/blog
curl -I https://www.clipa.studio/blog/how-to-trim-a-screen-recording-on-mac-1777959230762
curl -I https://www.clipa.studio/blog/edit/how-to-trim-a-screen-recording-on-mac
```

Google Search Console:

- Submit updated sitemap.
- Inspect `/blog/overview`.
- Inspect several new article URLs.
- Inspect several old URLs and confirm Google sees redirects.
- Monitor coverage for `Page with redirect`.

## Recommended Implementation Order

1. Export current published URL inventory.
2. Confirm category and slug mapping.
3. Add DB columns/table and backfill data.
4. Add exact 301 redirects for old URLs.
5. Add new category and article routes.
6. Update blog list/category/detail links.
7. Move edit flow to admin route or keep `/blog/new` only for now.
8. Update slug generation.
9. Update sitemap and canonical URLs.
10. Add breadcrumbs and structured data.
11. Update Header dropdown.
12. Run build and redirect checks.
13. Deploy and submit updated sitemap in GSC.

## Execution Phases

Use this phased plan so locally verifiable work can move quickly, while SEO-sensitive data changes still get explicit approval.

### Phase 1: Prepare New Structure Without Data Migration

Owner: Codex

Goal: Build the new category route structure and navigation so it can be reviewed locally without changing existing indexed URLs or Supabase blog data.

Work:

- Add category constants and labels.
- Add `/blog/[category]` category landing route.
- Add `/blog/[category]/[slug]` article detail route.
- Add `/blog -> /blog/overview` redirect behavior in code.
- Add Header Blog dropdown.
- Prepare sitemap/canonical/breadcrumb code paths for the new URL shape.
- Prepare slug generation changes, but do not rewrite existing post slugs yet.
- Keep existing `/blog/[slug]` article URLs working during this phase.
- Do not run DB migration.
- Do not change existing Supabase post data.
- Do not activate old article URL redirects yet.

Codex verification:

- `npm run build`
- `/blog/overview` renders.
- `/blog/edit` renders.
- Existing `/blog/[old-slug]` still works.
- Header dropdown works on desktop and mobile.

User review:

- Category page layout.
- Header dropdown UX.
- Overall URL/category model.

### Phase 2: Data Migration And Redirect Activation

Owner: Codex, after user approval of final old/new URL mapping

Goal: Switch live article URLs to category-based URLs while preserving every existing indexed URL with exact 301 redirects.

Work:

- Add `blog_posts.category_slug`.
- Add `blog_redirects`.
- Backfill category for existing posts.
- Rewrite existing post slugs to timestamp-free slugs.
- Insert old path to new path mappings.
- Add exact old URL redirects in `next.config.ts`.
- Add `/blog -> /blog/overview` as an exact redirect.
- Change blog list/detail links to `/blog/[category]/[slug]`.
- Update sitemap to include only new canonical URLs.
- Update article canonical metadata to only new URLs.

Codex verification:

- `npm run build`
- Supabase rows have expected `category_slug` and `slug`.
- Old URL returns `301`.
- Old URL `Location` header points to the expected new URL.
- New article URL returns `200`.
- Category URL returns `200`.
- `/blog` returns `301 -> /blog/overview`.
- Sitemap contains new URLs and does not contain old timestamp URLs.

User review before this phase:

- Final old URL to new URL mapping.

User review after this phase:

- Production behavior after deploy.
- Google Search Console sitemap submission and URL Inspection.

### Phase 3: Admin Writing And Editing Cleanup

Owner: Codex

Goal: Make future writing and editing safe under the new URL structure.

Work:

- Add category selection to new post form.
- Remove timestamp suffix from generated slugs.
- Add duplicate slug handling with `-2`, `-3`, etc.
- Move edit route to `/admin/blog/[id]/edit`, or keep current edit route only if we decide the route ambiguity is acceptable.
- Update article `Edit` buttons.
- Validate reserved category slugs cannot be used accidentally.

Codex verification:

- `npm run build`
- New post form requires/selects category.
- New post URL uses `/blog/[category]/[readable-slug]`.
- Duplicate title gets a readable suffix instead of a timestamp.
- Existing posts can still be edited.

User review:

- Admin writing/editing UX.

## Approval Gates

Codex can proceed without user interruption when the work is fully locally verifiable and does not mutate production Supabase data or indexed URL behavior.

Explicit user approval is required before:

- Running Supabase migrations.
- Rewriting existing post slugs.
- Activating old URL to new URL redirects.
- Submitting or asking the user to submit the updated sitemap in Google Search Console.

The main approval artifact before Phase 2 is the final mapping table:

```txt
old_path -> new_path
```

No old indexed URL should be removed, deleted, or `noindex`ed. Old indexed URLs should only become permanent redirects.
