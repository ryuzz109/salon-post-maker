"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type BudgetResult = {
  diagnosis: string;
  priorities: string[];
  fixedCostCheck: string[];
  reduceCandidates: string[];
  todayTasks: string[];
  tips: string[];
  cautions: string[];
};

const dailyLimit = 3;
const storageKey = "budget-checker-maker-usage";

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

function buildAllText(result: BudgetResult) {
  return `家計のざっくり診断
${result.diagnosis}

見直し優先順位
${formatList(result.priorities)}

固定費チェック
${formatList(result.fixedCostCheck)}

今月やめる・減らす候補
${formatList(result.reduceCandidates)}

今日やること3つ
${formatList(result.todayTasks)}

無理なく続けるコツ
${formatList(result.tips)}

注意点
${formatList(result.cautions)}`;
}

export default function BudgetCheckerPage() {
  const [income, setIncome] = useState("");
  const [housing, setHousing] = useState("");
  const [communication, setCommunication] = useState("");
  const [subscriptions, setSubscriptions] = useState("");
  const [food, setFood] = useState("");
  const [insurance, setInsurance] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [concern, setConcern] = useState("");
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [usage, setUsage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedText, setCopiedText] = useState("");

  const noteUrl =
    process.env.NEXT_PUBLIC_BUDGET_NOTE_URL || process.env.NEXT_PUBLIC_NOTE_URL || "https://note.com/";
  const remaining = Math.max(dailyLimit - usage, 0);
  const isLimited = usage >= dailyLimit;

  const examples = useMemo(
    () => ["固定費が高い気がする", "気づいたらお金が残らない", "毎月3万円を貯めたい"],
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
      setError("本日の無料生成は3回までです。もっと家計を整えたい方はnoteをご覧ください。");
      return;
    }

    if (
      !income.trim() ||
      !housing.trim() ||
      !communication.trim() ||
      !subscriptions.trim() ||
      !food.trim() ||
      !insurance.trim() ||
      !savingsGoal.trim() ||
      !concern.trim()
    ) {
      setError("月の手取り収入、各支出、毎月の貯金目標、今困っていることを入力してください。");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income,
          housing,
          communication,
          subscriptions,
          food,
          insurance,
          savingsGoal,
          concern
        })
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
              家計見直しメーカー
              <span className="block text-moss">お金の不安を今日の行動へ</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-ink/75 sm:text-lg">
              月収や固定費、食費、サブスク代などを入力すると、今月の見直し候補と今日できる行動をやさしく整理します。
            </p>
            <a
              href="#budget-maker"
              className="mt-7 inline-flex min-h-12 items-center rounded-md bg-ink px-6 text-sm font-bold text-white shadow-soft transition hover:bg-moss"
            >
              家計の見直しポイントを作る
            </a>
          </div>

          <div className="rounded-lg border border-ink/10 bg-linen p-5 shadow-soft">
            <div className="rounded-md bg-cream p-4">
              <p className="text-sm font-bold text-moss">こんな悩みに使えます</p>
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
        id="budget-maker"
        className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[0.86fr_1.14fr]"
      >
        <form onSubmit={handleSubmit} className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">家計を整理する</h2>
            <span className="rounded-full bg-petal/55 px-3 py-1 text-xs font-bold text-ink">
              残り{remaining}回
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <TextInput label="月の手取り収入" value={income} onChange={setIncome} placeholder="例：25万円" />
            <TextInput label="家賃・住宅費" value={housing} onChange={setHousing} placeholder="例：8万円" />
            <TextInput
              label="スマホ代・通信費"
              value={communication}
              onChange={setCommunication}
              placeholder="例：1万円"
            />
            <TextInput label="サブスク代" value={subscriptions} onChange={setSubscriptions} placeholder="例：5000円" />
            <TextInput label="食費" value={food} onChange={setFood} placeholder="例：6万円" />
            <TextInput label="保険料" value={insurance} onChange={setInsurance} placeholder="例：1万5000円" />
            <TextInput
              label="毎月の貯金目標"
              value={savingsGoal}
              onChange={setSavingsGoal}
              placeholder="例：3万円"
            />
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-ink">今困っていること</span>
            <textarea
              value={concern}
              onChange={(event) => setConcern(event.target.value)}
              placeholder="例：気づいたらお金が残らない、固定費が高い気がする"
              className="mt-2 min-h-28 w-full resize-y rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={220}
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
              もっと家計を整えたい方へ
            </a>
          )}

          <button
            type="submit"
            disabled={isLoading || isLimited}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-md bg-moss px-5 text-base font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/35"
          >
            {isLoading ? "整理中..." : "家計の見直しポイントを作る"}
          </button>
        </form>

        <div className="space-y-5">
          {!result ? (
            <div className="rounded-lg border border-ink/10 bg-cream p-6 shadow-soft">
              <h2 className="text-xl font-bold text-ink">生成される内容</h2>
              <div className="mt-5 grid gap-3 text-sm leading-6 text-ink/75 sm:grid-cols-2">
                <div className="rounded-md bg-white p-4">家計のざっくり診断</div>
                <div className="rounded-md bg-white p-4">見直し優先順位と固定費チェック</div>
                <div className="rounded-md bg-white p-4">今月やめる・減らす候補</div>
                <div className="rounded-md bg-white p-4">今日やることと注意点</div>
              </div>
            </div>
          ) : (
            <section className="space-y-4">
              <div className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-ink">今月の見直しポイント</h2>
                  <button
                    type="button"
                    onClick={() => copyText(buildAllText(result))}
                    className="min-h-10 rounded-md border border-moss/30 px-4 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
                  >
                    {copiedText === buildAllText(result) ? "コピーしました" : "全部コピー"}
                  </button>
                </div>
              </div>

              <ResultCard title="家計のざっくり診断" text={result.diagnosis} copiedText={copiedText} onCopy={copyText} />
              <ResultCard
                title="見直し優先順位"
                text={formatList(result.priorities)}
                copiedText={copiedText}
                onCopy={copyText}
              />
              <ResultCard
                title="固定費チェック"
                text={formatList(result.fixedCostCheck)}
                copiedText={copiedText}
                onCopy={copyText}
              />
              <ResultCard
                title="今月やめる・減らす候補"
                text={formatList(result.reduceCandidates)}
                copiedText={copiedText}
                onCopy={copyText}
              />
              <ResultCard
                title="今日やること3つ"
                text={formatList(result.todayTasks)}
                copiedText={copiedText}
                onCopy={copyText}
              />
              <ResultCard
                title="無理なく続けるコツ"
                text={formatList(result.tips)}
                copiedText={copiedText}
                onCopy={copyText}
              />
              <ResultCard title="注意点" text={formatList(result.cautions)} copiedText={copiedText} onCopy={copyText} />
            </section>
          )}

          <aside className="rounded-lg border border-moss/20 bg-ink p-5 text-white shadow-soft">
            <p className="text-sm font-bold text-petal">もっと家計を整えたい方へ</p>
            <h2 className="mt-2 text-xl font-bold">家計の見直しを続けるためのヒント</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              固定費の確認、支出の棚卸し、無理なく続けるための考え方をまとめています。
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

function TextInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-md border border-ink/15 bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
        maxLength={80}
      />
    </label>
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
