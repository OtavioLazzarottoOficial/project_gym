import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrasiliaStudentRegistrationClock } from './brasilia-student-registration-clock.ts';

describe('Brasilia student registration clock', () => {
  afterEach(() => vi.useRealTimers());
  it('uses the calendar date in Brasilia around midnight UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T02:00:00Z'));
    expect(new BrasiliaStudentRegistrationClock().today()).toBe('2026-11-05');
    vi.setSystemTime(new Date('2026-11-06T03:00:00Z'));
    expect(new BrasiliaStudentRegistrationClock().today()).toBe('2026-11-06');
  });
});
