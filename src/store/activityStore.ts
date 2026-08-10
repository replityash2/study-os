import { create } from 'zustand';
import type { Topic, TopicStatus } from '../types';
import { localDate } from '../lib/date';
import { getLeaves, statusForTopic } from '../lib/progress';
import {
  localActivityAdapter,
  type ActivityAdapter,
  type ActivityRecord,
} from '../services/activityAdapter';

interface ActivityState {
  records: ActivityRecord[];
  hydrated: boolean;
  adapter: ActivityAdapter;
  setAdapter: (adapter: ActivityAdapter) => void;
  hydrate: () => Promise<void>;
  replace: (records: ActivityRecord[]) => void;
  recordCompletion: (
    examId: string,
    subjects: { id: string; topics: Topic[] }[],
    before: Record<string, TopicStatus>,
    after: Record<string, TopicStatus>,
    affectedIds: string[],
  ) => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  records: [],
  hydrated: false,
  adapter: localActivityAdapter,
  setAdapter: (adapter) => set({ adapter }),
  hydrate: async () => {
    set({ records: await get().adapter.list(), hydrated: true });
  },
  replace: (records) => set({ records }),
  recordCompletion: (examId, subjects, before, after, affectedIds) =>
    set((state) => {
      const changes = new Map<string, { subjectId: string; completed: boolean }>();
      const affected = new Set(affectedIds);
      for (const subject of subjects) {
        const leaves = getLeaves(subject.topics);
        for (const leaf of leaves) {
          if (!affected.has(leaf.id)) continue;
          const wasStatus = before[leaf.id] ?? statusForTopic(leaf, before);
          const wasComplete = wasStatus === 'completed' || wasStatus === 'mastered';
          const isComplete = after[leaf.id] === 'completed' || after[leaf.id] === 'mastered';
          if (wasComplete !== isComplete)
            changes.set(leaf.id, { subjectId: subject.id, completed: isComplete });
        }
      }
      if (!changes.size) return state;
      const dateKey = localDate();
      const existing = state.records.find((record) => record.date === dateKey);
      const record: ActivityRecord = existing
        ? structuredClone(existing)
        : { date: dateKey, exams: {} };
      const exam = (record.exams[examId] ??= {});
      for (const { subjectId, completed } of changes.values()) {
        const counter = (exam[subjectId] ??= { completed: 0, uncompleted: 0 });
        counter[completed ? 'completed' : 'uncompleted'] += 1;
      }
      const records = [...state.records.filter((item) => item.date !== dateKey), record].sort(
        (a, b) => a.date.localeCompare(b.date),
      );
      const adapter = get().adapter;
      void Promise.all([
        adapter === localActivityAdapter ? Promise.resolve() : localActivityAdapter.save(record),
        adapter.save(record),
      ]);
      return { records };
    }),
}));
