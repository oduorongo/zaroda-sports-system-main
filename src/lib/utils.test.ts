import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('Utils - cn (className utility)', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-2', 'py-1');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
  });

  it('should handle undefined values', () => {
    const result = cn('px-2', undefined, 'py-1');
    expect(result).toBeDefined();
  });

  it('should resolve tailwind conflicts correctly', () => {
    // Tailwind merge should prefer the last class
    const result = cn('p-2', 'p-4');
    expect(result).toContain('p-4');
    expect(result).not.toContain('p-2');
  });

  it('should handle empty input', () => {
    const result = cn('');
    expect(result).toBeDefined();
  });

  it('should handle object classNames', () => {
    const result = cn({
      'px-2': true,
      'py-1': false,
    });
    expect(result).toContain('px-2');
  });

  it('should handle arrays of classNames', () => {
    const result = cn(['px-2', 'py-1']);
    expect(result).toBeDefined();
  });
});
