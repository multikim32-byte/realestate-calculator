import type { MetadataRoute } from 'next';
import { posts } from './blog/data';
import { aptPosts } from './apt/data';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://realestate-calculator.vercel.app';
  const now = new Date();

  const aptUrls: MetadataRoute.Sitemap = aptPosts.map((post) => ({
    url: `${base}/apt/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const blogUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    { url: base,                  lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/sale`,        lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/apt`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/about`,       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`,     lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ...aptUrls,
    ...blogUrls,
  ];
}
