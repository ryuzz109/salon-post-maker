import { NextResponse } from "next/server";

type GenerateRequest = {
  businessType?: string;
  customerPain?: string;
  postType?: string;
};

type GeneratedIdeas = {
  instagram: string[];
  threads: string[];
  hashtags: string[];
};

const fallbackModel = "gpt-4.1-mini";

function sanitize(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

function parseJsonFromText(text: string): GeneratedIdeas | null {
  try {
    const parsed = JSON.parse(text) as GeneratedIdeas;
    if (
      Array.isArray(parsed.instagram) &&
      Array.isArray(parsed.threads) &&
      Array.isArray(parsed.hashtags)
    ) {
      return parsed;
    }
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]) as GeneratedIdeas;
      if (
        Array.isArray(parsed.instagram) &&
        Array.isArray(parsed.threads) &&
        Array.isArray(parsed.hashtags)
      ) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI APIキーが未設定です。.env.local に OPENAI_API_KEY を設定してください。" },
      { status: 500 }
    );
  }

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "入力内容を読み取れませんでした。" }, { status: 400 });
  }

  const businessType = sanitize(body.businessType);
  const customerPain = sanitize(body.customerPain);
  const postType = sanitize(body.postType);

  if (!businessType || !customerPain || !postType) {
    return NextResponse.json({ error: "業種、お客様の悩み、投稿タイプを入力してください。" }, { status: 400 });
  }

  const prompt = `
あなたは個人サロン、個人事業主向けのSNS投稿企画アシスタントです。
怪しい副業感、誇大表現、医療的な断定、過度な煽りを避け、やさしく信頼できる文体で短めに作成してください。

業種: ${businessType}
お客様の悩み: ${customerPain}
投稿タイプ: ${postType}

以下のJSONだけを返してください。説明文やMarkdownは不要です。
{
  "instagram": ["Instagram投稿案を5個。各80文字以内。"],
  "threads": ["Threads短文投稿案を5個。各60文字以内。"],
  "hashtags": ["ハッシュタグ案を10個。#から始める。"]
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
        max_output_tokens: 900,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "投稿案の生成に失敗しました。APIキーやモデル名を確認してください。", detail },
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

    const ideas = parseJsonFromText(outputText ?? "");

    if (!ideas) {
      return NextResponse.json(
        { error: "生成結果の形式を読み取れませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      instagram: ideas.instagram.slice(0, 5),
      threads: ideas.threads.slice(0, 5),
      hashtags: ideas.hashtags.slice(0, 10)
    });
  } catch {
    return NextResponse.json(
      { error: "通信エラーが発生しました。時間をおいてもう一度お試しください。" },
      { status: 500 }
    );
  }
}
