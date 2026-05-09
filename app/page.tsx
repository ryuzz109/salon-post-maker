"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type GeneratedIdeas = {
  instagram: string[];
  threads: string[];
  hashtags: string[];
};

const dailyLimit = 3;
const storageKey = "salon-post-maker-usage";

const postTypes = ["集客", "教育", "共感", "ビフォーアフター", "よくある質問", "予約促進"];

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

export default function Home() {
  const [businessType, setBusinessType] = useState("");
  const [customerPain, setCustomerPain] = useState("");
  const [postType, setPostType] = useState(postTypes[0]);
  const [ideas, setIdeas] = useState<GeneratedIdeas | null>(null);
  const [usage, setUsage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedText, setCopiedText] = useState("");

  const noteUrl = process.env.NEXT_PUBLIC_NOTE_URL || "https://note.com/";
  const remaining = Math.max(dailyLimit - usage, 0);
  const isLimited = usage >= dailyLimit;

  const examples = useMemo(
    () => ["整体師 × 肩こり", "ネイルサロン × デザインに迷う", "パーソナルジム × 続かない"],
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
      setError("今日は3回までです。もっと投稿ネタが欲しい方はnoteをご覧ください。");
      return;
    }

    if (!businessType.trim() || !customerPain.trim()) {
      setError("業種とお客様の悩みを入力してください。");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType, customerPain, postType })
      });
      const data = await response.json();

      if (!response.ok) {
        const detail = typeof data.detail === "string" ? data.detail.slice(0, 1000) : "";
        const message = [data.error || "生成に失敗しました。", detail && `detail: ${detail}`]
          .filter(Boolean)
          .join("\n");
        throw new Error(message);
      }

      setIdeas(data);
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
      <section className="relative overflow-hidden border-b border-ink/10 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_0.86fr] md:items-center md:py-14">
          <div>
            <p className="mb-3 text-sm font-semibold text-clay">ログイン不要・1日3回まで無料</p>
            <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-5xl">
              個人サロン向け
              <span className="block text-moss">SNS投稿ネタ生成ツール</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-ink/75 sm:text-lg">
              業種とお客様の悩みを入れるだけで、Instagram投稿案、Threads短文、ハッシュタグをまとめて作れます。
            </p>
            <a
              href="#maker"
              className="mt-7 inline-flex min-h-12 items-center rounded-md bg-ink px-6 text-sm font-bold text-white shadow-soft transition hover:bg-moss"
            >
              無料で投稿ネタを作る
            </a>
          </div>

          <div className="rounded-lg border border-ink/10 bg-linen p-5 shadow-soft">
            <div className="rounded-md bg-cream p-4">
              <p className="text-sm font-bold text-moss">今日の投稿メモ</p>
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

      <section id="maker" className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[0.86fr_1.14fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">投稿ネタを作る</h2>
            <span className="rounded-full bg-petal/55 px-3 py-1 text-xs font-bold text-ink">
              残り{remaining}回
            </span>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-bold text-ink">業種</span>
            <input
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value)}
              placeholder="例：整体師、美容サロン、占い師"
              className="mt-2 min-h-12 w-full rounded-md border border-ink/15 bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={80}
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-ink">お客様の悩み</span>
            <textarea
              value={customerPain}
              onChange={(event) => setCustomerPain(event.target.value)}
              placeholder="例：肩こりがつらい、予約する勇気が出ない"
              className="mt-2 min-h-28 w-full resize-y rounded-md border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
              maxLength={160}
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-ink">投稿タイプ</span>
            <select
              value={postType}
              onChange={(event) => setPostType(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-md border border-ink/15 bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/15"
            >
              {postTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <div className="mt-5 whitespace-pre-wrap rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm leading-6 text-ink">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isLimited}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-md bg-moss px-5 text-base font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/35"
          >
            {isLoading ? "生成中..." : "無料で投稿ネタを作る"}
          </button>
        </form>

        <div className="space-y-5">
          {!ideas ? (
            <div className="rounded-lg border border-ink/10 bg-cream p-6 shadow-soft">
              <h2 className="text-xl font-bold text-ink">生成される内容</h2>
              <div className="mt-5 grid gap-3 text-sm leading-6 text-ink/75 sm:grid-cols-3">
                <div className="rounded-md bg-white p-4">Instagram投稿案 5個</div>
                <div className="rounded-md bg-white p-4">Threads短文 5個</div>
                <div className="rounded-md bg-white p-4">ハッシュタグ 10個</div>
              </div>
            </div>
          ) : (
            <>
              <ResultSection title="Instagram投稿案" items={ideas.instagram} copiedText={copiedText} onCopy={copyText} />
              <ResultSection title="Threads短文投稿案" items={ideas.threads} copiedText={copiedText} onCopy={copyText} />
              <ResultSection title="ハッシュタグ案" items={ideas.hashtags} copiedText={copiedText} onCopy={copyText} />
            </>
          )}

          <aside className="rounded-lg border border-moss/20 bg-ink p-5 text-white shadow-soft">
            <p className="text-sm font-bold text-petal">もっと欲しい方へ</p>
            <h2 className="mt-2 text-xl font-bold">個人サロン向けSNS投稿テンプレ100選</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              すぐ使える投稿パターンをまとめたnoteへ案内します。無料生成で足りない日に使える導線です。
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

function ResultSection({
  title,
  items,
  copiedText,
  onCopy
}: {
  title: string;
  items: string[];
  copiedText: string;
  onCopy: (text: string) => void;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-cream p-5 shadow-soft">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-md border border-ink/10 bg-white p-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-ink/80">{item}</p>
            <button
              type="button"
              onClick={() => onCopy(item)}
              className="mt-3 min-h-10 rounded-md border border-moss/30 px-4 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
            >
              {copiedText === item ? "コピーしました" : "コピー"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
