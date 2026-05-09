"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type GoalBreakdown = {
  summary: string;
  overallSteps: string[];
  monthlyGoal: string;
  weeklyGoal: string;
  todayTasks: string[];
  notToDo: string[];
  tips: string[];
};

const dailyLimit = 3;
const storageKey = "goal-breakdown-maker-usage";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUsage() {
  if (typeof window === "undefined") return 0;

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return 0;
    const parsed = JSON.parse(saved) as { date?: string; count?: number };
    return parsed.date === todayKey() ? parsed.count ?? 0 : 0;
  } catch {
    return 0;
  }
}

function saveUsage(count: number) {
  window.localStorage.setItem(storageKey, JSON.stringify({ date: todayKey(), count }));
}

function formatList(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function buildAllText(result: GoalBreakdown) {
  return `目標の整理
${result.summary}

期間全体のステップ
${formatList(result.overallSteps)}

今月の目標
${result.monthlyGoal}

今週の目標
${result.weeklyGoal}

今日やること3つ
${formatList(result.todayTasks)}

やらないこと3つ
${formatList(result.notToDo)}

続けるコツ
${formatList(result.tips)}`;
}

export default function GoalBreakdownPage() {
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [currentSituation, setCurrentSituation] = useState("");
  const [dailyTime, setDailyTime] = useState("");
  const [result, setResult] = useState<GoalBreakdown | null>(null);
  const [usage, setUsage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedText, setCopiedText] = useState("");

  const noteUrl =
    process.env.NEXT_PUBLIC_GOAL_NOTE_URL || process.env.NEXT_PUBLIC_NOTE_URL || "https://note.com/";
  const remaining = Math.max(dailyLimit - usage, 0);
  const isLimited = usage >= dailyLimit;

  const examples = useMemo(
    () => ["3ヶ月で5kg痩せたい", "副業で月1万円稼ぎたい", "資格試験に合格したい"],
    []
  );

  useEffect(() => {
    setUsage(getUsage());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCopiedText("");

    const currentUsage = getUsage();
    if (currentUsage >= dailyLimit) {
      setUsage(currentUsage);
      setError("本日の無料生成は3回までです。もっとテンプレートが欲しい方はnoteをご覧ください。");
      return;
    }

    if (!goal.trim() || !deadline.trim() || !currentSituation.trim() || !dailyTime.trim()) {
      setError("達成したい目標、期限、今の状況、1日に使える時間を入力してください。");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, deadline, currentSituation, dailyTime })
      });
      const data = await response.json();

      if (!response.ok) {
        const detail = typeof data.detail === "string" ? data.detail.slice(0, 1000) : "";
        const message = [data.error || "生成に失敗しました。", detail && `detail: ${detail}`]
          .filter(Boolean)
          .join("\n");
        throw new Error(message);
      }

      setResult(data);
      const nextUsage = currentUsage + 1;
      saveUsage(nextUsage);
      setUsage(nextUsage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedText(text);
    window.setTimeout(() => setCopiedText(""), 1400);
  }

  return (
    <main className="min-h-screen bg-linen">
      <section className="border-b border-ink/10 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_0.86fr] md:items-center md:py-14">
          <div>
            <p className="mb-3 text-sm font-semibold text-clay">ログイン不要・1日3回まで無料</p>
            <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-5xl">
              今日やることメーカー
              <span className="block text-moss">大きな目標を今日の行動へ</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-ink/75 sm:text-lg">
              副業、勉強、資格、ダイエット、貯金、生活改善、SNS運用まで。目標と今の状況を入れるだけで、今月・今週・今日やることに分解します。
            </p>
            <a
              href="#goal-maker"
              className="mt-7 inline-flex min-h-12 items-center rounded-md bg-ink px-6 text-sm font-bold text-white shadow-soft transition hover:bg-moss"
            >
              目標を今日の行動に分解する
            </a>
          </div>

          <div className="rounded-lg border border-ink/10 bg-linen p-5 shadow-soft">
            <div className="rounded-md bg-cream p-4">
              <p className="text-sm font-bold text-moss">こんな目標に使えます</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-ink/75">
                {examples.map((example) => (
                  <div key={example} className="rounded-md border border-ink/10 bg-white px-4 py-3">
                    {example}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="goal-maker"
        className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[0.86fr_1.14fr]"
      >
        <form onSubmit={handleSubmit} className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">目標を分解する</h2>
            <span className="rounded-full bg-petal/55 px-3 py-1 text-xs font-bold text-ink">
              残り{remaining}回
            </span>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-bold text-ink">達成したい目標</span>
            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="例：3ヶ月で5kg痩せたい、副業で月1万円稼ぎたい、資格試験に合格したい"
              className="mt-2 min-h-24 w-full resize-y rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={180}
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-ink">期限</span>
            <input
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              placeholder="例：30日、3ヶ月、半年"
              className="mt-2 min-h-12 w-full rounded-md border border-ink/15 bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={80}
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-ink">今の状況</span>
            <textarea
              value={currentSituation}
              onChange={(event) => setCurrentSituation(event.target.value)}
              placeholder="例：運動習慣なし、平日は1日30分なら使える"
              className="mt-2 min-h-24 w-full resize-y rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={220}
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-ink">1日に使える時間</span>
            <input
              value={dailyTime}
              onChange={(event) => setDailyTime(event.target.value)}
              placeholder="例：15分、30分、1時間"
              className="mt-2 min-h-12 w-full rounded-md border border-ink/15 bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={80}
            />
          </label>

          {error && (
            <div className="mt-5 whitespace-pre-wrap rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm leading-6 text-ink">
              {error}
            </div>
          )}

          {isLimited && (
            <a
              href={noteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-md border border-moss/25 bg-white px-4 py-3 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
            >
              もっとテンプレートが欲しい方はnoteを見る
            </a>
          )}

          <button
            type="submit"
            disabled={isLoading || isLimited}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-md bg-moss px-5 text-base font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/35"
          >
            {isLoading ? "分解中..." : "目標を今日の行動に分解する"}
          </button>
        </form>

        <div className="space-y-5">
          {!result ? (
            <div className="rounded-lg border border-ink/10 bg-cream p-6 shadow-soft">
              <h2 className="text-xl font-bold text-ink">生成される内容</h2>
              <div className="mt-5 grid gap-3 text-sm leading-6 text-ink/75 sm:grid-cols-2">
                <div className="rounded-md bg-white p-4">目標の整理</div>
                <div className="rounded-md bg-white p-4">期間全体・今月・今週のステップ</div>
                <div className="rounded-md bg-white p-4">今日やること3つ</div>
                <div className="rounded-md bg-white p-4">やらないことと続けるコツ</div>
              </div>
            </div>
          ) : (
            <section className="space-y-4">
              <div className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-ink">今日から動くための分解結果</h2>
                  <button
                    type="button"
                    onClick={() => copyText(buildAllText(result))}
                    className="min-h-10 rounded-md border border-moss/30 px-4 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
                  >
                    {copiedText === buildAllText(result) ? "コピーしました" : "全部コピー"}
                  </button>
                </div>
              </div>

              <ResultCard title="目標の整理" text={result.summary} copiedText={copiedText} onCopy={copyText} />
              <ResultCard
                title="期間全体のステップ"
                text={formatList(result.overallSteps)}
                copiedText={copiedText}
                onCopy={copyText}
              />
              <ResultCard title="今月の目標" text={result.monthlyGoal} copiedText={copiedText} onCopy={copyText} />
              <ResultCard title="今週の目標" text={result.weeklyGoal} copiedText={copiedText} onCopy={copyText} />
              <ResultCard
                title="今日やること3つ"
                text={formatList(result.todayTasks)}
                copiedText={copiedText}
                onCopy={copyText}
              />
              <ResultCard
                title="やらないこと3つ"
                text={formatList(result.notToDo)}
                copiedText={copiedText}
                onCopy={copyText}
              />
              <ResultCard title="続けるコツ" text={formatList(result.tips)} copiedText={copiedText} onCopy={copyText} />
            </section>
          )}

          <aside className="rounded-lg border border-moss/20 bg-ink p-5 text-white shadow-soft">
            <p className="text-sm font-bold text-petal">もっと整えて進めたい方へ</p>
            <h2 className="mt-2 text-xl font-bold">noteでテンプレートを見る</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              毎日の行動を迷わず進めるためのテンプレートや、SNS・副業・生活改善に使える考え方をまとめています。
            </p>
            <a
              href={noteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-11 items-center rounded-md bg-white px-5 text-sm font-bold text-ink transition hover:bg-petal"
            >
              noteを見る
            </a>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ResultCard({
  title,
  text,
  copiedText,
  onCopy
}: {
  title: string;
  text: string;
  copiedText: string;
  onCopy: (text: string) => void;
}) {
  return (
    <article className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => onCopy(`${title}\n${text}`)}
          className="min-h-10 rounded-md border border-moss/30 px-4 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
        >
          {copiedText === `${title}\n${text}` ? "コピーしました" : "コピー"}
        </button>
      </div>
      <p className="mt-4 whitespace-pre-wrap rounded-md bg-white p-4 text-sm leading-7 text-ink/80">{text}</p>
    </article>
  );
}
