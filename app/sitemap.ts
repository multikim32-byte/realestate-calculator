import type { MetadataRoute } from 'next';
import { posts } from './blog/data';
import { aptPosts } from './apt/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://realestate-calculator.vercel.app';

  const blogUrls = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const aptUrls = aptPosts.map((post) => ({
    url: `${base}/apt/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/sale`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/apt`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    ...aptUrls,
    ...blogUrls,
  ];
}
