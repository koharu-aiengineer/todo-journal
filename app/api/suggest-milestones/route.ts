import OpenAI from "openai";

type Milestone = {
  title: string;
  dueDate: string;
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  let body: { projectDescription?: string; deadline?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { projectDescription, deadline } = body;
  if (!projectDescription || !deadline) {
    return Response.json(
      { error: "projectDescription と deadline は必須です" },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let rawContent: string;
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたはプロジェクト管理の専門家です。必ずJSON形式のみで回答してください。説明文やコードブロック記号は含めないでください。",
        },
        {
          role: "user",
          content: `以下の案件内容と締め切り日から、締め切りまでに完了すべき中間タスク（マイルストーン）を3〜5個、それぞれの目安の期限日（YYYY-MM-DD形式）とタスク名をJSON形式で提案してください。

本日は${today}です。締め切りは${deadline}です。
本日から締め切りまでの間で、現実的な日付でマイルストーンを提案してください。

案件内容: ${projectDescription}

回答は必ず次の形式のJSONのみを返してください:
{"milestones":[{"title":"タスク名","dueDate":"YYYY-MM-DD"}]}`,
        },
      ],
      temperature: 0.7,
    });

    rawContent = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI API呼び出しに失敗しました";
    return Response.json({ error: message }, { status: 502 });
  }

  // コードブロック（```json ... ```）が含まれる場合は取り除く
  const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: { milestones: Milestone[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json(
      { error: "OpenAIのレスポンスをJSONとして解析できませんでした", raw: rawContent },
      { status: 502 }
    );
  }

  if (!Array.isArray(parsed.milestones)) {
    return Response.json(
      { error: "レスポンスに milestones 配列がありません", raw: rawContent },
      { status: 502 }
    );
  }

  return Response.json({ milestones: parsed.milestones });
}
