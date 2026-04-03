import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog');

  const data = {
    posts: posts
      .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
      .map(post => ({
        id: post.slug,
        slug: post.slug,
        title: post.data.title,
        summary: post.data.summary || '',
        tags: post.data.tags || [],
        category: post.data.category || '생활정보',
        date: post.data.date,
        status: post.data.status || 'published',
        readTime: '',
        updatedAt: post.data.date,
      }))
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
