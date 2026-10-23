# AI Concierge Portal (自分専用AIコンシェルジュ付きニュース＆ブックマークポータル)

ユーザーが保存した「ブックマーク・メモ」の関心事をAIが学習し、外部RSSフィードから収集した最新記事の中から【なぜおすすめなのかの理由】と【3行要約】を添えてパーソナライズ推薦するフルスタックWebポータルです。

---

## 1. プロジェクト構成一覧 (Directory Structure)

```
.
├── .env.example                # 必要な環境変数のテンプレート定義
├── package.json                # アプリ依存関係および起動スクリプト
├── tsconfig.json               # TypeScript設定
├── vite.config.ts              # Vite設定 (Tailwind CSS v4 + React)
├── index.html                  # HTMLエントリーポイント
├── server.ts                   # Expressフルスタックサーバー & Viteミドルウェア
├── server/                     # バックエンド・サービスクラス
│   ├── storage.ts              # JSONファイルベースの永続化ストレージ (初期シード付き)
│   ├── rssService.ts           # rss-parserを用いたRSSフィード並列収集＆接続テスト
│   └── geminiService.ts        # @google/genai (gemini-3.8-flash) レコメンド＆要約生成
├── data/                       # 永続データ保存ディレクトリ
│   └── portal_data.json        # ブックマーク・購読フィード・AIキャッシュデータ
├── src/                        # フロントエンド (React SPA)
│   ├── main.tsx                # React DOMマウント
│   ├── App.tsx                 # メインアプリケーションコンポーネント (状態管理・API統合)
│   ├── index.css               # グローバルCSS (Tailwind CSS v4)
│   ├── types/
│   │   └── index.ts            # データモデル定義 (Bookmark, FeedItem, Recommendation, FeedSource)
│   └── components/
│       ├── Header.tsx          # ヘッダーナビゲーション & AI再分析トリガー
│       ├── ConciergeHome.tsx   # ホームポータル (AI挨拶・本日のおすすめ3〜5選・クイック保存)
│       ├── BookmarkView.tsx    # ブックマーク・メモ管理 (検索・タグ・新規追加・編集・削除)
│       ├── FeedsView.tsx       # RSSフィード購読管理 (有効化切替・カスタムフィード追加)
│       ├── RawStreamView.tsx   # 最新フィード生速報一覧
│       └── Toast.tsx           # フィードバック通知トースト
└── metadata.json               # AI Studio Appletメタデータ
```

---

## 2. 主な機能と特徴

1. **AIコンシェルジュ推薦 (Google Gemini `gemini-3.8-flash`)**:
   - ユーザーの過去ブックマーク（関心タグや考察メモ）と本日のRSS記事候補を分析。
   - 【なぜおすすめなのか（選定理由）】と【3行要約】を添えてトップにレコメンド。
   - 一定期間キャッシュしてAPI利用量を節約しつつ、手動の「AI再分析」ボタンで即時更新可能。
2. **ワンクリック・ブックマーク保存**:
   - 推薦記事や新着フィードからワンクリックでブックマーク保存。保存された記事は次のAI推薦の学習データになります。
3. **クイック入力バー**:
   - 気になったURLやメモをトップページから即座に登録可能。
4. **RSSフィードの自由な購読管理**:
   - 初期プリセット（Qiita, Zenn, はてなブックマークIT, GIGAZINE, TechCrunch）。
   - カスタムRSS/Atom URLの追加（URL接続テスト機能付き）とトグル切り替え。
5. **堅牢なデータ永続化**:
   - サーバーサイドのJSONストレージにより、リロードやサーバー再起動後もブックマークや購読設定が保持されます。

---

## 3. セットアップ・起動手順

### 依存関係のインストール
```bash
npm install
```

### 環境変数の設定
`.env.example` をコピーして `.env` を作成します：
```bash
cp .env.example .env
```
Google AI Studio から取得したAPIキーを設定：
```ini
GEMINI_API_KEY="AIzaSy..."
PORT=3000
NODE_ENV="development"
```

### 開発サーバーの起動
```bash
npm run dev
```
ブラウザで `http://localhost:3000` にアクセスしてください。

### プロダクションビルド & 実行
```bash
npm run build
npm start
```
