import { posts } from '../blog/data';
import { aptPosts } from '../apt/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = 'https://realestate-calculator.vercel.app';
  const now = new Date().toISOString();

  const staticPages = [
    { url: base, lastmod: now, changefreq: 'weekly', priority: '1.0' },
    { url: `${base}/sale`, lastmod: now, changefreq: 'daily', priority: '0.9' },
    { url: `${base}/apt`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { url: `${base}/about`, lastmod: now, changefreq: 'monthly', priority: '0.5' },
    { url: `${base}/privacy`, lastmod: now, changefreq: 'monthly', priority: '0.4' },
  ];

  const aptUrls = aptPosts.map((post) => ({
    url: `${base}/apt/${post.slug}`,
    lastmod: new Date(post.date).toISOString(),
    changefreq: 'monthly',
    priority: '0.7',
  }));

  const blogUrls = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastmod: new Date(post.date).toISOString(),
    changefreq: 'monthly',
    priority: '0.7',
  }));

  const allPages = [...staticPages, ...aptUrls, ...blogUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(({ url, lastmod, changefreq, priority }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
