import { parseCategoryPath, buildCategoryPath } from '../utils/bookmark.js';

// Basic unit tests for category path helpers

describe('Category path helpers', () => {
  test('parseCategoryPath splits and normalizes path', () => {
    expect(parseCategoryPath('tech/ai/llms')).toEqual(['Tech', 'Ai', 'Llms']);
    expect(parseCategoryPath('Tech/AI')).toEqual(['Tech', 'AI']);
    expect(parseCategoryPath('')).toEqual([]);
  });

  test('buildCategoryPath joins and normalizes parts', () => {
    expect(buildCategoryPath(['tech', 'ai', 'llms'])).toBe('Tech/Ai/Llms');
    expect(buildCategoryPath(['Tech', 'AI'])).toBe('Tech/AI');
    expect(buildCategoryPath([])).toBe('');
  });

  test('parseCategoryPath and buildCategoryPath are inverse operations', () => {
    const originalPath = 'Tech/AI/LLMs';
    const parts = parseCategoryPath(originalPath);
    expect(buildCategoryPath(parts)).toBe('Tech/AI/LLMs');
  });
}); 