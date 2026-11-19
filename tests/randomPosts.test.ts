import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRandomComment, buildRandomPost, generateRandomId, isRandomId, randomIdFor, randomLabel, reactionChange,
} from '../src/lib/randomPosts';

test('random IDs are 8 lowercase letters/digits and different each time', () => {
  const ids = new Set(Array.from({ length: 2000 }, () => generateRandomId()));
  assert.equal(ids.size, 2000);
  for (const id of ids) assert.ok(isRandomId(id), id);
  assert.equal(randomLabel('xyd4954y'), 'Random xyd4954y');
});

test('posts from before Randoms are shown by their document id', () => {
  assert.equal(randomIdFor('xyd4954y', { randomId: 'xyd4954y' }), 'xyd4954y');
  assert.equal(randomIdFor('AbCdEfGh1234', { userId: 'u1' }), 'abcdefgh');
});

test('the stored records carry nothing about the person', () => {
  const now = 'NOW';
  assert.deepEqual(Object.keys(buildRandomPost('xyd4954y', ' Hi ', now)).sort(),
    ['commentCount', 'content', 'hates', 'likes', 'randomId', 'timestamp']);
  assert.equal(buildRandomPost('xyd4954y', ' Hi ', now).content, 'Hi');
  assert.deepEqual(Object.keys(buildRandomComment('Nice', now)).sort(), ['content', 'timestamp']);
  assert.equal(buildRandomPost('xyd4954y', 'x'.repeat(2000), now).content.length, 1000);
});

test('reactionChange: like, hate, switch and take back', () => {
  assert.deepEqual(reactionChange(null, 'like'), { next: 'like', likes: 1, hates: 0 });
  assert.deepEqual(reactionChange('like', 'like'), { next: null, likes: -1, hates: 0 });
  assert.deepEqual(reactionChange('like', 'hate'), { next: 'hate', likes: -1, hates: 1 });
  assert.deepEqual(reactionChange('hate', 'like'), { next: 'like', likes: 1, hates: -1 });
  assert.deepEqual(reactionChange(null, 'hate'), { next: 'hate', likes: 0, hates: 1 });
});
