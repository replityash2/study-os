import { describe, expect, it } from 'vitest';
import {
  aggregateDailyActivity,
  calculateCurrentStreak,
  calculateLongestStreak,
  cumulativeSeries,
  recentActivity,
  subjectBreakdown,
} from './analytics';
import type { ActivityRecord } from '../services/activityAdapter';
import { mergeActivityRecords } from '../services/activityAdapter';
import { localDate } from './date';

const records: ActivityRecord[] = [
  { date: '2025-01-01', exams: { e: { s: { completed: 2, uncompleted: 0 } } } },
  { date: '2025-01-02', exams: { e: { s: { completed: 0, uncompleted: 1 } } } },
  { date: '2025-01-04', exams: { e: { s: { completed: 1, uncompleted: 0 } } } },
];

describe('analytics helpers', () => {
  it('buckets dates using local calendar components', () => {
    const date = new Date(2025, 0, 2, 23, 30);
    expect(localDate(date)).toBe('2025-01-02');
  });
  it('aggregates daily activity by exam', () => {
    expect(aggregateDailyActivity(records, 'e')[1]).toEqual({
      date: '2025-01-02',
      completed: 0,
      uncompleted: 1,
    });
  });
  it('filters recent activity to days with selected-exam activity', () => {
    expect(
      recentActivity([
        { date: '2025-01-01', completed: 0, uncompleted: 0 },
        { date: '2025-01-02', completed: 1, uncompleted: 0 },
      ]),
    ).toEqual([{ date: '2025-01-02', completed: 1, uncompleted: 0 }]);
  });
  it('calculates current and longest streaks with gaps', () => {
    const activity = aggregateDailyActivity(records, 'e');
    expect(calculateCurrentStreak(activity, '2025-01-04')).toBe(1);
    expect(calculateLongestStreak(activity)).toBe(1);
  });
  it('does not count an uncheck-only day as a streak day', () => {
    const activity = aggregateDailyActivity(records, 'e');
    expect(calculateCurrentStreak(activity, '2025-01-02')).toBe(0);
    expect(calculateLongestStreak(activity)).toBe(1);
  });
  it('supports a single-day streak', () => {
    expect(calculateLongestStreak([{ date: '2025-01-01', completed: 1, uncompleted: 0 }])).toBe(1);
  });
  it('calculates cumulative values backwards from current reality', () => {
    const activity = aggregateDailyActivity(records, 'e');
    expect(cumulativeSeries(activity, 4, ['2025-01-01', '2025-01-02', '2025-01-04'])).toEqual([
      4, 3, 4,
    ]);
  });
  it('rolls up leaf completion by subject', () => {
    const topics = [
      {
        id: 's',
        title_en: 'Subject',
        title_hi: '',
        completed: false,
        progress: 0,
        topics: [
          {
            id: 'a',
            title_en: 'A',
            title_hi: '',
            completed: false,
            progress: 0,
            children: [],
            revision: false,
            bookmarked: false,
            notes: '',
          },
          {
            id: 'parent',
            title_en: 'P',
            title_hi: '',
            completed: false,
            progress: 0,
            children: [
              {
                id: 'b',
                title_en: 'B',
                title_hi: '',
                completed: false,
                progress: 0,
                children: [],
                revision: false,
                bookmarked: false,
                notes: '',
              },
            ],
            revision: false,
            bookmarked: false,
            notes: '',
          },
        ],
      },
    ];
    expect(subjectBreakdown(topics, { a: 'completed' })[0]).toMatchObject({
      completed: 1,
      total: 2,
    });
  });
  it('merges activity by max counters and preserves one-sided records', () => {
    const local: ActivityRecord[] = [
      { date: '2025-01-01', exams: { e: { s: { completed: 4, uncompleted: 1 } } } },
      { date: '2025-01-02', exams: { e: { s: { completed: 2, uncompleted: 0 } } } },
    ];
    const remote: ActivityRecord[] = [
      { date: '2025-01-01', exams: { e: { s: { completed: 2, uncompleted: 3 } } } },
      { date: '2025-01-03', exams: { e: { s: { completed: 1, uncompleted: 1 } } } },
    ];
    expect(mergeActivityRecords(local, remote)).toEqual([
      { date: '2025-01-01', exams: { e: { s: { completed: 4, uncompleted: 3 } } } },
      { date: '2025-01-02', exams: { e: { s: { completed: 2, uncompleted: 0 } } } },
      { date: '2025-01-03', exams: { e: { s: { completed: 1, uncompleted: 1 } } } },
    ]);
  });
  it('makes activity migration idempotent', () => {
    const local: ActivityRecord[] = [
      { date: '2025-01-01', exams: { e: { s: { completed: 4, uncompleted: 1 } } } },
    ];
    const remote: ActivityRecord[] = [
      { date: '2025-01-01', exams: { e: { s: { completed: 2, uncompleted: 3 } } } },
    ];
    const merged = mergeActivityRecords(local, remote);
    expect(mergeActivityRecords(local, merged)).toEqual(merged);
  });
});
