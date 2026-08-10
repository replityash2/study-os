export interface ActivityCounter {
  completed: number;
  uncompleted: number;
}

export interface ActivityRecord {
  date: string;
  exams: Record<string, Record<string, ActivityCounter>>;
}

export interface ActivityAdapter {
  list(): Promise<ActivityRecord[]>;
  save(record: ActivityRecord): Promise<void>;
}

const key = 'study-os-activity';

export const localActivityAdapter: ActivityAdapter = {
  async list() {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ActivityRecord[]) : [];
  },
  async save(record) {
    const records = await localActivityAdapter.list();
    const next = [...records.filter((item) => item.date !== record.date), record].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    localStorage.setItem(key, JSON.stringify(next));
  },
};

export function mergeActivityRecords(
  local: ActivityRecord[],
  remote: ActivityRecord[],
): ActivityRecord[] {
  const byDate = new Map(remote.map((record) => [record.date, record]));
  for (const localRecord of local) {
    const remoteRecord = byDate.get(localRecord.date);
    if (!remoteRecord) {
      byDate.set(localRecord.date, localRecord);
      continue;
    }
    const exams = { ...remoteRecord.exams };
    for (const [examId, subjects] of Object.entries(localRecord.exams)) {
      exams[examId] = { ...(exams[examId] ?? {}) };
      for (const [subjectId, localCounter] of Object.entries(subjects)) {
        const remoteCounter = exams[examId][subjectId];
        exams[examId][subjectId] = {
          completed: Math.max(localCounter.completed, remoteCounter?.completed ?? 0),
          uncompleted: Math.max(localCounter.uncompleted, remoteCounter?.uncompleted ?? 0),
        };
      }
    }
    byDate.set(localRecord.date, { ...remoteRecord, exams });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
