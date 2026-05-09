# 個人サロン向け SNS投稿ネタ生成ツール

Next.js、TypeScript、Tailwind CSS、OpenAI API を使った無料SNS投稿ネタ生成ツールです。

整体師、美容サロン、ネイル、エステ、パーソナルジム、占い師、個人講師など、SNS投稿に悩む個人事業主向けに、Instagram投稿案、Threads短文投稿案、ハッシュタグ案を生成します。

## 主な機能

- ログイン不要
- スマホ対応
- 業種、お客様の悩み、投稿タイプを入力
- Instagram投稿案を5個生成
- Threads短文投稿案を5個生成
- ハッシュタグ案を10個生成
- 各投稿のコピーボタン
- localStorage による 1ブラウザ1日3回までの簡易制限
- 制限到達時の note 導線表示
- Vercel 公開対応

## 環境変数

`.env.local` を作成して以下を設定します。

```bash
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_NOTE_URL=https://note.com/your-note-url
```

| 変数名 | 必須 | 説明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 必須 | OpenAI APIキーです。未設定の場合は分かりやすいエラーを返します。 |
| `OPENAI_MODEL` | 任意 | 使用モデルです。未設定時は `gpt-4.1-mini` を使います。 |
| `NEXT_PUBLIC_NOTE_URL` | 任意 | 下部CTAのnoteリンクです。 |

## ローカル起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

APIは「無料で投稿ネタを作る」ボタンを押した時だけ呼ばれます。ページ表示だけではOpenAI APIは呼ばれません。

## Vercel公開手順

1. このプロジェクトをGitHubにpushします。
2. Vercelで「Add New Project」から対象リポジトリを選択します。
3. Framework Preset が `Next.js` になっていることを確認します。
4. Environment Variables に以下を設定します。
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `NEXT_PUBLIC_NOTE_URL`
5. Deploy を実行します。

## API費用対策

- OpenAI APIは生成ボタン押下時のみ呼び出します。
- 出力は短めになるようAPI側のプロンプトと `max_output_tokens` を制限しています。
- localStorageで1ブラウザあたり1日3回までに制限しています。

## 注意

localStorageによる制限は簡易的なものです。厳密な不正利用対策が必要になった場合は、サーバー側のレート制限、認証、DB保存などを追加してください。
