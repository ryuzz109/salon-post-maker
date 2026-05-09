"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type CalendarItem = {
  day: number;
  theme: string;
  instagram: string;
  threads: string;
  hashtags: string[];
};

const dailyLimit = 2;
const storageKey = "seitai-calendar-maker-usage";
const tones = ["やさしい", "専門的", "親しみやすい", "来店促進", "初心者向け"];

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

function formatPost(item: CalendarItem) {
  return `Day ${item.day}
投稿テーマ: ${item.theme}

Instagram投稿文:
${item.instagram}

Threads短文:
${item.threads}

ハッシュタグ:
${item.hashtags.join(" ")}`;
}

export default function SeitaiCalendarPage() {
  const [targetCustomer, setTargetCustomer] = useState("");
  const [strength, setStrength] = useState("");
  const [tone, setTone] = useState(tones[0]);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [usage, setUsage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedText, setCopiedText] = useState("");

  const noteUrl = process.env.NEXT_PUBLIC_NOTE_URL || "https://note.com/";
  const remaining = Math.max(dailyLimit - usage, 0);
  const isLimited = usage >= dailyLimit;

  const previewTopics = useMemo(
    () => ["肩こりの原因をやさしく解説", "姿勢改善の小さな習慣", "来店前の不安を減らす投稿"],
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
      setError("本日の無料生成は2回までです。もっと投稿ネタが欲しい方はnoteをご覧ください。");
      return;
    }

    if (!targetCustomer.trim() || !strength.trim()) {
      setError("ターゲットのお客様と、アピールしたい施術・強みを入力してください。");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCustomer, strength, tone })
      });
      const data = await response.json();

      if (!response.ok) {
        const detail = typeof data.detail === "string" ? data.detail.slice(0, 1000) : "";
        const message = [data.error || "生成に失敗しました。", detail && `detail: ${detail}`]
          .filter(Boolean)
          .join("\n");
        throw new Error(message);
      }

      setCalendar(Array.isArray(data.calendar) ? data.calendar : []);
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
            <p className="mb-3 text-sm font-semibold text-clay">ログイン不要・1日2回まで無料</p>
            <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-5xl">
              整体師向け30日分
              <span className="block text-moss">SNS投稿カレンダーメーカー</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-ink/75 sm:text-lg">
              ターゲットのお客様と施術の強みを入力するだけで、InstagramとThreadsに使える30日分の投稿ネタをまとめて作れます。
            </p>
            <a
              href="#calendar-maker"
              className="mt-7 inline-flex min-h-12 items-center rounded-md bg-ink px-6 text-sm font-bold text-white shadow-soft transition hover:bg-moss"
            >
              30日分の投稿カレンダーを作る
            </a>
          </div>

          <div className="rounded-lg border border-ink/10 bg-linen p-5 shadow-soft">
            <div className="rounded-md bg-cream p-4">
              <p className="text-sm font-bold text-moss">作れる投稿テーマの例</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-ink/75">
                {previewTopics.map((topic) => (
                  <div key={topic} className="rounded-md border border-ink/10 bg-white px-4 py-3">
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="calendar-maker"
        className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[0.86fr_1.14fr]"
      >
        <form onSubmit={handleSubmit} className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">投稿カレンダーを作る</h2>
            <span className="rounded-full bg-petal/55 px-3 py-1 text-xs font-bold text-ink">
              残り{remaining}回
            </span>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-bold text-ink">ターゲットのお客様</span>
            <input
              value={targetCustomer}
              onChange={(event) => setTargetCustomer(event.target.value)}
              placeholder="例：肩こりに悩む30代女性"
              className="mt-2 min-h-12 w-full rounded-md border border-ink/15 bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={100}
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-ink">アピールしたい施術・強み</span>
            <textarea
              value={strength}
              onChange={(event) => setStrength(event.target.value)}
              placeholder="例：首肩こり専門、姿勢改善、やさしい整体"
              className="mt-2 min-h-28 w-full resize-y rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={180}
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-ink">投稿の雰囲気</span>
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-md border border-ink/15 bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
            >
              {tones.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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
              もっと投稿ネタが欲しい方へ：個人サロン向けSNS投稿テンプレ100選
            </a>
          )}

          <button
            type="submit"
            disabled={isLoading || isLimited}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-md bg-moss px-5 text-base font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/35"
          >
            {isLoading ? "生成中..." : "30日分の投稿カレンダーを作る"}
          </button>
        </form>

        <div className="space-y-5">
          {calendar.length === 0 ? (
            <div className="rounded-lg border border-ink/10 bg-cream p-6 shadow-soft">
              <h2 className="text-xl font-bold text-ink">生成される内容</h2>
              <div className="mt-5 grid gap-3 text-sm leading-6 text-ink/75 sm:grid-cols-2">
                <div className="rounded-md bg-white p-4">Day 1からDay 30までの投稿テーマ</div>
                <div className="rounded-md bg-white p-4">Instagram投稿文とThreads短文</div>
                <div className="rounded-md bg-white p-4">各日5個のハッシュタグ</div>
                <div className="rounded-md bg-white p-4">そのまま使えるコピーボタン</div>
              </div>
            </div>
          ) : (
            <section className="space-y-4">
              <div className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft">
                <h2 className="text-xl font-bold text-ink">30日分の投稿カレンダー</h2>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  気になる日だけコピーして、表現を少し整えてから投稿に使ってください。
                </p>
              </div>
              {calendar.map((item) => (
                <article key={item.day} className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="rounded-full bg-petal/55 px-3 py-1 text-xs font-bold text-ink">
                      Day {item.day}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyText(formatPost(item))}
                      className="min-h-10 rounded-md border border-moss/30 px-4 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
                    >
                      {copiedText === formatPost(item) ? "コピーしました" : "この投稿をコピー"}
                    </button>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink">{item.theme}</h3>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-ink/80">
                    <div className="rounded-md bg-white p-4">
                      <p className="mb-2 font-bold text-moss">Instagram投稿文</p>
                      <p className="whitespace-pre-wrap">{item.instagram}</p>
                    </div>
                    <div className="rounded-md bg-white p-4">
                      <p className="mb-2 font-bold text-moss">Threads短文</p>
                      <p className="whitespace-pre-wrap">{item.threads}</p>
                    </div>
                    <div className="rounded-md bg-white p-4">
                      <p className="mb-2 font-bold text-moss">ハッシュタグ</p>
                      <p className="break-words">{item.hashtags.join(" ")}</p>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          <aside className="rounded-lg border border-moss/20 bg-ink p-5 text-white shadow-soft">
            <p className="text-sm font-bold text-petal">もっと投稿ネタが欲しい方へ</p>
            <h2 className="mt-2 text-xl font-bold">個人サロン向けSNS投稿テンプレ100選</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              整体・美容・リラクゼーションなど、個人サロンの発信に使いやすい投稿テンプレをまとめています。
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
