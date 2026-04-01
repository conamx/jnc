import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.string(),
    summary: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    readTime: z.string().optional().default(''),
    status: z.enum(['published', 'draft']).default('published'),
  }),
});

export const collections = { blog };
