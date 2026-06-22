# ToDo Journal

ネイビー × ゴールドをテーマにした、上質なデザインのシンプルなToDoリストアプリです。

## 機能

- タスクの追加（テキスト入力 → Enterキー または「追加」ボタン）
- 完了 / 未完了の切り替え（チェックボックス）
- タスクの削除（ゴミ箱アイコン）
- 削除後のアンドゥ（トースト通知 → 「元に戻す」ボタン、5秒間）
- localStorage によるデータ永続化（リロード・再起動後もタスクが保持される）

## 技術スタック

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 16（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| フォント | Playfair Display / Inter（Google Fonts） |
| データ保存 | localStorage |
| ホスティング | Vercel |

## ローカルでの起動方法

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## ビルド

```bash
npm run build
npm run start
```
