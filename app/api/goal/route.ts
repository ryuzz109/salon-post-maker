import { NextResponse } from "next/server";

type GoalRequest = {
  goal?: string;
  deadline?: string;
  currentSituation?: string;
  dailyTime?: string;
};

type GoalBreakdown = {
  summary: string;
  overallSteps: string[];
  monthlyGoal: string;
  weeklyGoal: string;
  todayTasks: string[];
  notToDo: string[];
  tips: string[];
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

function parseJsonFromText(text: string): GoalBreakdown | null {
  try {
    return JSON.parse(text) as GoalBreakdown;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as GoalBreakdown;
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

  let body: GoalRequest;
  try {
    body = (await request.json()) as GoalRequest;
  } catch {
    return NextResponse.json({ error: "入力内容を読み取れませんでした。" }, { status: 400 });
  }

  const goal = sanitize(body.goal);
  const deadline = sanitize(body.deadline, 80);
  const currentSituation = sanitize(body.currentSituation);
  const dailyTime = sanitize(body.dailyTime, 80);

  if (!goal || !deadline || !currentSituation || !dailyTime) {
    return NextResponse.json(
      { error: "達成したい目標、期限、今の状況、1日に使える時間を入力してください。" },
      { status: 400 }
    );
  }

  const prompt = `
あなたは目標達成を現実的な行動に分解するコーチです。
副業、勉強、資格、ダイエット、貯金、生活改善、SNS運用など幅広い目標に使えるように、売り込み感を出さず、やさしく実用的に整理してください。
無理な断定、過度な成功保証、医療的な断定は避けてください。

達成したい目標: ${goal}
期限: ${deadline}
今の状況: ${currentSituation}
1日に使える時間: ${dailyTime}

返答は説明文やMarkdownを含めず、次のJSON形式だけにしてください。
{
  "summary": "目標の整理。現状と期限をふまえて、何を目指すかを短く整理する。",
  "overallSteps": ["期間全体のステップ1", "期間全体のステップ2", "期間全体のステップ3", "期間全体のステップ4"],
  "monthlyGoal": "今月の目標。測れる形で、現実的に書く。",
  "weeklyGoal": "今週の目標。今日から始められる粒度にする。",
  "todayTasks": ["今日やること1", "今日やること2", "今日やること3"],
  "notToDo": ["やらないこと1", "やらないこと2", "やらないこと3"],
  "tips": ["続けるコツ1", "続けるコツ2", "続けるコツ3"]
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
        max_output_tokens: 2200,
        temperature: 0.65
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: "目標の分解に失敗しました。APIキーやモデル名を確認してください。",
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

    const result: GoalBreakdown = {
      summary: sanitize(parsed.summary, 700),
      overallSteps: normalizeStringList(parsed.overallSteps, 6),
      monthlyGoal: sanitize(parsed.monthlyGoal, 500),
      weeklyGoal: sanitize(parsed.weeklyGoal, 500),
      todayTasks: normalizeStringList(parsed.todayTasks, 3),
      notToDo: normalizeStringList(parsed.notToDo, 3),
      tips: normalizeStringList(parsed.tips, 5)
    };

    if (
      !result.summary ||
      result.overallSteps.length === 0 ||
      !result.monthlyGoal ||
      !result.weeklyGoal ||
      result.todayTasks.length < 3 ||
      result.notToDo.length < 3 ||
      result.tips.length === 0
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
