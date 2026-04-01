// netlify/functions/publish-post.js
// Astro 버전: src/content/blog/{slug}.md 파일을 GitHub에 생성/수정/삭제

const OWNER = 'conamx';
const REPO  = 'jnc';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

function makeMarkdown(post) {
  const tags = (post.tags || []).map(t => `"${t}"`).join(', ');
  const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
date: "${post.date}"
category: "${post.category}"
summary: "${(post.summary || '').replace(/"/g, '\\"')}"
tags: [${tags}]
readTime: "${post.readTime || ''}"
status: "${post.status}"
---

${post.content}`;
  return frontmatter;
}

async function getFile(path, token) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub 읽기 실패: ${res.status}`);
  return res.json();
}

async function writeFile(path, content, message, sha, token) {
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
  };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'GitHub 저장 실패');
  }
  return res.json();
}

async function deleteFile(path, message, sha, token) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sha }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'GitHub 삭제 실패');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'GITHUB_TOKEN 환경변수가 없습니다.' }) };

  try {
    // ── POST: 글 발행/수정 ──
    if (event.httpMethod === 'POST') {
      const post = JSON.parse(event.body);
      if (!post.slug || !post.title) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '슬러그와 제목은 필수입니다.' }) };
      }

      const filePath = `src/content/blog/${post.slug}.md`;
      const existing = await getFile(filePath, token);
      const sha = existing?.sha || null;
      const markdown = makeMarkdown(post);
      const action = sha ? '수정' : '발행';

      await writeFile(filePath, markdown, `글 ${action}: ${post.title}`, sha, token);

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ success: true, slug: post.slug, url: `/blog/${post.slug}/` }),
      };
    }

    // ── DELETE: 글 삭제 ──
    if (event.httpMethod === 'DELETE') {
      const { slug } = JSON.parse(event.body);
      const filePath = `src/content/blog/${slug}.md`;
      const existing = await getFile(filePath, token);
      if (!existing) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: '파일을 찾을 수 없습니다.' }) };
      await deleteFile(filePath, `글 삭제: ${slug}`, existing.sha, token);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers: cors, body: 'Method not allowed' };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
