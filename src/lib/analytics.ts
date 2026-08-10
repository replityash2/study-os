import type { Subject, Topic, TopicStatus } from '../types';
import type { ActivityRecord } from '../services/activityAdapter';
import { localDate } from './date';
import { getLeaves, statusForTopic } from './progress';

export interface DailyActivity {
  date: string;
  completed: number;
  uncompleted: number;
}

export function aggregateDailyActivity(records: ActivityRecord[], examId: string): DailyActivity[] {
  return records
    .map((record) => {
      const subjects = Object.values(record.exams[examId] ?? {});
      return {
        date: record.date,
        completed: subjects.reduce((sum, item) => sum + item.completed, 0),
        uncompleted: subjects.reduce((sum, item) => sum + item.uncompleted, 0),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function activityDates(activity: DailyActivity[]): string[] {
  return activity.filter((item) => item.completed > 0).map((item) => item.date);
}

export function calculateCurrentStreak(activity: DailyActivity[], today: string): number {
  const dates = new Set(activityDates(activity));
  const cursor = new Date(`${today}T12:00:00`);
  let streak = 0;
  while (dates.has(localDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calculateLongestStreak(activity: DailyActivity[]): number {
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;
  for (const date of activityDates(activity)) {
    const value = new Date(`${date}T12:00:00`);
    if (previous && (value.getTime() - previous.getTime()) / 86400000 === 1) current += 1;
    else current = 1;
    longest = Math.max(longest, current);
    previous = value;
  }
  return longest;
}

export function cumulativeSeries(
  activity: DailyActivity[],
  currentCompleted: number,
  dates: string[],
): number[] {
  return dates.map((date) => {
    const netAfter = activity
      .filter((item) => item.date > date)
      .reduce((sum, item) => sum + item.completed - item.uncompleted, 0);
    return Math.max(0, currentCompleted - netAfter);
  });
}

export function subjectBreakdown(
  topics: Subject[],
  statusMap: Record<string, TopicStatus>,
): { subjectId: string; title: string; completed: number; total: number; percentage: number }[] {
  return topics
    .map((subject) => {
      const leaves = getLeaves(subject.topics);
      const completed = leaves.filter((leaf) => {
        const status = statusForTopic(leaf, statusMap);
        return status === 'completed' || status === 'mastered';
      }).length;
      return {
        subjectId: subject.id,
        title: subject.title_en,
        completed,
        total: leaves.length,
        percentage: leaves.length ? Math.round((completed / leaves.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage || b.completed - a.completed);
}

export function statusDistribution(
  topics: Topic[],
  statusMap: Record<string, TopicStatus>,
): Record<TopicStatus, number> {
  const result: Record<TopicStatus, number> = {
    not_started: 0,
    learning: 0,
    completed: 0,
    revision_due: 0,
    mastered: 0,
  };
  for (const leaf of getLeaves(topics)) result[statusForTopic(leaf, statusMap)] += 1;
  return result;
}
