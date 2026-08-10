import { BarChart3, CheckCircle2, Flame, History, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityChart, CumulativeChart } from '../components/analytics/AnalyticsCharts';
import { Badge, Button, Card, EmptyState, ProgressBar, SegmentedToggle } from '../components/ui';
import {
  aggregateDailyActivity,
  calculateCurrentStreak,
  calculateLongestStreak,
  cumulativeSeries,
  recentActivity,
  statusDistribution,
  subjectBreakdown,
} from '../lib/analytics';
import { localDate } from '../lib/date';
import { useActivityStore } from '../store/activityStore';
import { useProgressStore } from '../store/progressStore';
import { syllabi, useSyllabusStore } from '../store/syllabusStore';

function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-50 p-2 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-xl font-extrabold text-slate-800">{value}</p>
          <p className="text-[10px] text-slate-400">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const activeExamId = useProgressStore((state) => state.activeExamId);
  const statusMap = useProgressStore((state) => state.statusMap);
  const records = useActivityStore((state) => state.records);
  const selectedExam = useSyllabusStore((state) => state.selectedExam);
  const setExam = useSyllabusStore((state) => state.setExam);
  const examIndex = Math.max(
    0,
    syllabi.findIndex((item) => item.exam === activeExamId),
  );
  const index = selectedExam >= 0 && selectedExam < syllabi.length ? selectedExam : examIndex;
  const syllabus = syllabi[index] ?? syllabi[0];
  const activity = useMemo(
    () => aggregateDailyActivity(records, syllabus.exam),
    [records, syllabus.exam],
  );
  const leaves = useMemo(() => syllabus.subjects.flatMap((subject) => subject.topics), [syllabus]);
  const breakdown = useMemo(
    () => subjectBreakdown(syllabus.subjects, statusMap),
    [statusMap, syllabus.subjects],
  );
  const distribution = useMemo(() => statusDistribution(leaves, statusMap), [leaves, statusMap]);
  const completed = breakdown.reduce((sum, item) => sum + item.completed, 0);
  const total = breakdown.reduce((sum, item) => sum + item.total, 0);
  const dates = useMemo(() => {
    const result: string[] = [];
    const date = new Date();
    for (let offset = 29; offset >= 0; offset -= 1) {
      const item = new Date(date);
      item.setDate(date.getDate() - offset);
      result.push(localDate(item));
    }
    return result;
  }, []);
  const daily = dates.map(
    (date) => activity.find((item) => item.date === date) ?? { date, completed: 0, uncompleted: 0 },
  );
  const hasHistory = activity.some((item) => item.completed || item.uncompleted);
  const recent = recentActivity(activity);
  const cumulative = cumulativeSeries(activity, completed, dates);
  const last7 = daily.slice(-7).reduce((sum, item) => sum + item.completed, 0);

  return (
    <div className="min-h-screen bg-canvas pb-24 pl-[114px] pr-8 pt-5 max-md:px-4">
      <main className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-primary">Your progress at a glance</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-800">Analytics</h1>
          </div>
          <Button
            className="bg-white !text-primary shadow-soft hover:bg-violet-50"
            onClick={() => navigate('/workspace')}
          >
            Back to workspace
          </Button>
        </div>
        <SegmentedToggle
          options={syllabi.map((item) => item.exam)}
          value={index}
          onChange={setExam}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat
            icon={<TrendingUp size={17} />}
            label="Completion"
            value={`${total ? Math.round((completed / total) * 100) : 0}%`}
            detail={`${completed} of ${total} leaves`}
          />
          <Stat
            icon={<CheckCircle2 size={17} />}
            label="Completed"
            value={`${completed}`}
            detail={`${total} total leaves`}
          />
          <Stat
            icon={<Flame size={17} />}
            label="Current streak"
            value={`${calculateCurrentStreak(activity, localDate())} days`}
            detail="Study days"
          />
          <Stat
            icon={<History size={17} />}
            label="Longest streak"
            value={`${calculateLongestStreak(activity)} days`}
            detail="Best run so far"
          />
          <Stat
            icon={<BarChart3 size={17} />}
            label="Last 7 days"
            value={`${last7}`}
            detail="Topics completed"
          />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card className="min-w-0 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800">Daily activity</h2>
                <p className="text-xs text-slate-400">Last 30 days</p>
              </div>
              <div className="flex gap-2">
                <Badge tone="green">Completed</Badge>
                <Badge tone="amber">Uncompleted</Badge>
              </div>
            </div>
            {hasHistory ? (
              <ActivityChart activity={daily} />
            ) : (
              <EmptyState
                icon={<History size={22} />}
                title="History starts now"
                description="Complete a topic to begin your activity timeline."
              />
            )}
          </Card>
          <Card className="min-w-0 p-5">
            <div className="mb-4">
              <h2 className="font-bold text-slate-800">Cumulative completion</h2>
              <p className="text-xs text-slate-400">Current reality, reconstructed over time</p>
            </div>
            {hasHistory ? (
              <CumulativeChart values={cumulative} />
            ) : (
              <EmptyState
                icon={<TrendingUp size={22} />}
                title="History starts now"
                description="Your completion line will appear after your first update."
              />
            )}
          </Card>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Card className="p-5">
            <h2 className="font-bold text-slate-800">Subject breakdown</h2>
            <p className="mb-4 text-xs text-slate-400">Based on your current syllabus</p>
            <div className="space-y-4">
              {breakdown.map((item) => (
                <div key={item.subjectId}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-slate-600">{item.title}</span>
                    <span className="text-slate-400">
                      {item.completed}/{item.total}
                    </span>
                  </div>
                  <ProgressBar value={item.percentage} />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-slate-800">Status distribution</h2>
            <p className="mb-4 text-xs text-slate-400">Leaf topics only</p>
            <div className="space-y-3">
              {Object.entries(distribution).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-slate-500">{status.replace('_', ' ')}</span>
                  <Badge
                    tone={
                      status === 'completed' || status === 'mastered'
                        ? 'green'
                        : status === 'learning'
                          ? 'amber'
                          : 'neutral'
                    }
                  >
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card className="mt-5 p-5">
          <h2 className="font-bold text-slate-800">Recent activity</h2>
          {recent.length ? (
            <div className="mt-3 divide-y divide-slate-100">
              {recent.map((item) => (
                <div key={item.date} className="flex justify-between py-3 text-xs">
                  <span className="font-semibold text-slate-600">{item.date}</span>
                  <span className="text-primary">+{item.completed} completed</span>
                  {item.uncompleted > 0 && (
                    <span className="text-amber-500">−{item.uncompleted} uncompleted</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<History size={22} />}
              title="No activity yet"
              description="Your recent updates will appear here."
            />
          )}
        </Card>
      </main>
    </div>
  );
}
