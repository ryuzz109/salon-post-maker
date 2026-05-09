import { NextResponse } from "next/server";

type BudgetRequest = {
  income?: string;
  housing?: string;
  communication?: string;
  subscriptions?: string;
  food?: string;
  insurance?: string;
  savingsGoal?: string;
  concern?: string;
};

type BudgetResult = {
  diagnosis: string;
  priorities: string[];
  fixedCostCheck: string[];
  reduceCandidates: string[];
  todayTasks: string[];
  tips: string[];
  cautions: string[];
};

const fallbackModel = "gpt-4.1-mini";

function sanitize(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeStringList(value: unknown, maxItems: number) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, maxItems)
    : [];
}

function parseJsonFromText(text: string): BudgetResult | null {
  try {
    return JSON.parse(text) as BudgetResult;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as BudgetResult;
    } catch {
      return null;
    }
  }
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

  let body: BudgetRequest;
  try {
    body = (await request.json()) as BudgetRequest;
  } catch {
    return NextResponse.json({ error: "入力内容を読み取れませんでした。" }, { status: 400 });
  }

  const income = sanitize(body.income, 80);
  const housing = sanitize(body.housing, 80);
  const communication = sanitize(body.communication, 80);
  const subscriptions = sanitize(body.subscriptions, 80);
  const food = sanitize(body.food, 80);
  const insurance = sanitize(body.insurance, 80);
  const savingsGoal = sanitize(body.savingsGoal, 80);
  const concern = sanitize(body.concern);

  if (
    !income ||
    !housing ||
    !communication ||
    !subscriptions ||
    !food ||
    !insurance ||
    !savingsGoal ||
    !concern
  ) {
    return NextResponse.json(
      {
        error:
          "月の手取り収入、各支出、毎月の貯金目標、今困っていることを入力してください。"
      },
      { status: 400 }
    );
  }

  const prompt = `
あなたは家計をやさしく整理するアシスタントです。
金融アドバイスとして断定せず、投資商品、保険の解約、特定サービスへの乗り換えを強く勧めないでください。
「見直し候補」「確認ポイント」「比較するとよい項目」「今日できる行動」として、節約を煽りすぎず実用的に整理してください。

月の手取り収入: ${income}
家賃・住宅費: ${housing}
スマホ代・通信費: ${communication}
サブスク代: ${subscriptions}
食費: ${food}
保険料: ${insurance}
毎月の貯金目標: ${savingsGoal}
今困っていること: ${concern}

返答は説明文やMarkdownを含めず、次のJSON形式だけにしてください。
{
  "diagnosis": "家計のざっくり診断。断定ではなく、確認するとよさそうな傾向として書く。",
  "priorities": ["見直し優先順位1", "見直し優先順位2", "見直し優先順位3"],
  "fixedCostCheck": ["固定費チェック1", "固定費チェック2", "固定費チェック3"],
  "reduceCandidates": ["今月やめる・減らす候補1", "今月やめる・減らす候補2", "今月やめる・減らす候補3"],
  "todayTasks": ["今日やること1", "今日やること2", "今日やること3"],
  "tips": ["無理なく続けるコツ1", "無理なく続けるコツ2", "無理なく続けるコツ3"],
  "cautions": ["注意点1", "注意点2", "注意点3"]
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
        max_output_tokens: 2400,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: "家計の見直しポイント生成に失敗しました。APIキーやモデル名を確認してください。",
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
    if (!parsed) {
      return NextResponse.json(
        { error: "生成結果の形式を読み取れませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }

    const result: BudgetResult = {
      diagnosis: sanitize(parsed.diagnosis, 800),
      priorities: normalizeStringList(parsed.priorities, 5),
      fixedCostCheck: normalizeStringList(parsed.fixedCostCheck, 5),
      reduceCandidates: normalizeStringList(parsed.reduceCandidates, 5),
      todayTasks: normalizeStringList(parsed.todayTasks, 3),
      tips: normalizeStringList(parsed.tips, 5),
      cautions: normalizeStringList(parsed.cautions, 5)
    };

    if (
      !result.diagnosis ||
      result.priorities.length === 0 ||
      result.fixedCostCheck.length === 0 ||
      result.reduceCandidates.length === 0 ||
      result.todayTasks.length < 3 ||
      result.tips.length === 0 ||
      result.cautions.length === 0
    ) {
      return NextResponse.json(
        { error: "生成結果に不足があります。もう一度お試しください。" },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "通信エラーが発生しました。時間をおいてもう一度お試しください。" },
      { status: 500 }
    );
  }
}
