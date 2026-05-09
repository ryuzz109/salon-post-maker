import { NextResponse } from "next/server";

type CalendarRequest = {
  targetCustomer?: string;
  strength?: string;
  tone?: string;
};

type CalendarItem = {
  day: number;
  theme: string;
  instagram: string;
  threads: string;
  hashtags: string[];
};

type CalendarResponse = {
  calendar: CalendarItem[];
};

const fallbackModel = "gpt-4.1-mini";
const tones = ["やさしい", "専門的", "親しみやすい", "来店促進", "初心者向け"];

function sanitize(value: unknown, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeItem(item: CalendarItem, index: number): CalendarItem {
  return {
    day: Number.isFinite(item.day) ? item.day : index + 1,
    theme: sanitize(item.theme, 120),
    instagram: sanitize(item.instagram, 600),
    threads: sanitize(item.threads, 220),
    hashtags: Array.isArray(item.hashtags)
      ? item.hashtags
          .filter((tag) => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 5)
      : []
  };
}

function parseJsonFromText(text: string): CalendarResponse | null {
  try {
    const parsed = JSON.parse(text) as CalendarResponse;
    if (Array.isArray(parsed.calendar)) return parsed;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      const parsed = JSON.parse(match[0]) as CalendarResponse;
      if (Array.isArray(parsed.calendar)) return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OpenAI APIキーが未設定です。Vercelの環境変数に OPENAI_API_KEY を設定してください。"
      },
      { status: 500 }
    );
  }

  let body: CalendarRequest;
  try {
    body = (await request.json()) as CalendarRequest;
  } catch {
    return NextResponse.json({ error: "入力内容を読み取れませんでした。" }, { status: 400 });
  }

  const targetCustomer = sanitize(body.targetCustomer);
  const strength = sanitize(body.strength);
  const tone = sanitize(body.tone, 40);

  if (!targetCustomer || !strength || !tones.includes(tone)) {
    return NextResponse.json(
      { error: "ターゲットのお客様、施術・強み、投稿の雰囲気を入力してください。" },
      { status: 400 }
    );
  }

  const prompt = `
あなたは整体院・個人整体師向けのSNS投稿企画アシスタントです。
怪しい副業感、誇大表現、医療的な断定、治る・完治などの表現を避け、信頼できる実用的な投稿案を作ってください。

ターゲットのお客様: ${targetCustomer}
アピールしたい施術・強み: ${strength}
投稿の雰囲気: ${tone}

30日分のSNS投稿カレンダーを作成してください。
各日ごとに以下を必ず含めてください。
- day: 1から30の数字
- theme: 投稿テーマ
- instagram: Instagram投稿文。120から220文字程度。読みやすく改行を入れてもよい。
- threads: Threads向け短文。60から120文字程度。
- hashtags: ハッシュタグ5個。各要素は # から始める。

返答は説明文やMarkdownを含めず、次のJSON形式だけにしてください。
{
  "calendar": [
    {
      "day": 1,
      "theme": "投稿テーマ",
      "instagram": "Instagram投稿文",
      "threads": "Threads短文",
      "hashtags": ["#整体", "#肩こり", "#姿勢改善", "#首こり", "#セルフケア"]
    }
  ]
}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || fallbackModel,
        input: prompt,
        max_output_tokens: 8000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error:
            "30日分の投稿カレンダー生成に失敗しました。APIキーやモデル名を確認してください。",
          detail
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const outputText =
      typeof data.output_text === "string"
        ? data.output_text
        : data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? [])
            .map((content: { text?: string }) => content.text ?? "")
            .join("");

    const parsed = parseJsonFromText(outputText ?? "");
    const calendar = parsed?.calendar.map(normalizeItem).filter((item) => {
      return item.theme && item.instagram && item.threads && item.hashtags.length > 0;
    });

    if (!calendar || calendar.length < 30) {
      return NextResponse.json(
        { error: "生成結果の形式を読み取れませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    return NextResponse.json({ calendar: calendar.slice(0, 30) });
  } catch {
    return NextResponse.json(
      { error: "通信エラーが発生しました。時間をおいてもう一度お試しください。" },
      { status: 500 }
    );
  }
}
