import { GoogleGenAI, Type } from '@google/genai';
import { Bookmark, ConciergeGreeting, FeedItem, Recommendation } from '../src/types/index.ts';

// Server-side GoogleGenAI initialization with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function generateConciergeRecommendations(
  bookmarks: Bookmark[],
  feedItems: FeedItem[]
): Promise<{ greeting: ConciergeGreeting; recommendations: Recommendation[] }> {
  // If no feed items available, return empty recommendations
  if (feedItems.length === 0) {
    return {
      greeting: {
        greeting: getGreetingByTime(),
        personalizedMessage: 'RSSフィードからの記事取得を確認中です。フィード設定から配信元を確認してください。',
        keyTopics: bookmarks.flatMap((b) => b.tags).slice(0, 5),
        generatedAt: new Date().toISOString(),
      },
      recommendations: [],
    };
  }

  // Check if Gemini API key exists
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

  if (hasKey) {
    try {
      return await callGeminiRecommendation(bookmarks, feedItems);
    } catch (err) {
      console.warn('[Gemini Service] First attempt failed, retrying in 1s...', (err as Error).message);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await callGeminiRecommendation(bookmarks, feedItems);
      } catch (retryErr) {
        console.error('[Gemini Service] Error generating recommendations via LLM, falling back to heuristic engine:', retryErr);
        return generateHeuristicRecommendations(bookmarks, feedItems);
      }
    }
  } else {
    console.log('[Gemini Service] GEMINI_API_KEY not found or placeholder, using smart heuristic matching');
    return generateHeuristicRecommendations(bookmarks, feedItems);
  }
}

async function callGeminiRecommendation(
  bookmarks: Bookmark[],
  feedItems: FeedItem[]
): Promise<{ greeting: ConciergeGreeting; recommendations: Recommendation[] }> {
  // Limit candidates to recent 25 articles to stay within optimal context
  const candidateArticles = feedItems.slice(0, 25).map((item, index) => ({
    index,
    title: item.title,
    source: item.sourceName,
    pubDate: item.pubDate,
    snippet: item.contentSnippet,
    link: item.link,
  }));

  const userBookmarksSummary = bookmarks.slice(0, 15).map((b) => ({
    title: b.title,
    note: b.note,
    tags: b.tags,
    date: b.createdAt.split('T')[0],
  }));

  const prompt = `あなたは「自分専用AIコンシェルジュ」です。
ユーザーがこれまでに保存したブックマーク・メモと、本日の外部RSS最新記事を比較分析し、
YouTubeのホーム画面やGoogle Discoverのように【ユーザーの好みに最も刺さるおすすめ記事 3〜5選】を選定してください。

## ユーザーの過去ブックマーク・関心事:
${JSON.stringify(userBookmarksSummary, null, 2)}

## 本日の新着記事リスト（25件）:
${JSON.stringify(candidateArticles, null, 2)}

## 出力要件:
1. greeting: 
   - greeting: 朝・昼・晩に応じた丁寧で親しみのある挨拶（「おはようございます！」「こんにちは！」「今宵もお疲れ様です！」など）
   - personalizedMessage: ユーザーが直近保存した具体的なキーワードや関心（例: 「最近あなたが保存したReact 19やGemini APIのメモを分析し、今日の最新トレンドから厳選しました」など）を織り交ぜた1〜2文のパーソナライズ挨拶。
   - keyTopics: ユーザーの関心キーワード（3〜6個の配列）
2. recommendations: 
   - 最も関心度が高い記事を3〜5件厳選
   - articleIndex: 上記新着記事リスト内の0始まりインデックス番号
   - reason: 【なぜおすすめなのか】を明確に記述（例: 「3日前に保存した『React 19』の関心と親和性が高く、新機能の具体的な移行手順が解説されているため」）
   - summary: 【3行要約】（必ず3つの文字列の配列。各行は30〜60文字程度でポイントを端的に説明）
   - relatedBookmarkTags: 関連するタグ名
   - relevanceScore: 80〜98の適合度スコア`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: 'あなたはユーザー専属の知的で洗練されたAIニュースコンシェルジュです。過度な誇張を避け、具体的で役立つ選定理由と分かりやすい3行要約を提供してください。',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          greeting: {
            type: Type.OBJECT,
            properties: {
              greeting: { type: Type.STRING },
              personalizedMessage: { type: Type.STRING },
              keyTopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['greeting', 'personalizedMessage', 'keyTopics'],
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                articleIndex: { type: Type.INTEGER },
                reason: { type: Type.STRING },
                summary: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                relatedBookmarkTags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                relevanceScore: { type: Type.INTEGER },
              },
              required: ['articleIndex', 'reason', 'summary', 'relatedBookmarkTags', 'relevanceScore'],
            },
          },
        },
        required: ['greeting', 'recommendations'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');

  const recommendations: Recommendation[] = [];
  if (Array.isArray(parsed.recommendations)) {
    for (const rec of parsed.recommendations) {
      const originalArticle = candidateArticles[rec.articleIndex];
      if (originalArticle) {
        recommendations.push({
          id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          articleTitle: originalArticle.title,
          articleUrl: originalArticle.link,
          sourceName: originalArticle.source,
          pubDate: originalArticle.pubDate,
          summary: Array.isArray(rec.summary) && rec.summary.length > 0 ? rec.summary.slice(0, 3) : [originalArticle.snippet || 'この記事の要点をチェック'],
          reason: rec.reason || '過去の保存した関心事と高い親和性があります',
          relatedBookmarkTags: rec.relatedBookmarkTags || [],
          relevanceScore: rec.relevanceScore || 85,
        });
      }
    }
  }

  const greeting: ConciergeGreeting = {
    greeting: parsed.greeting?.greeting || getGreetingByTime(),
    personalizedMessage: parsed.greeting?.personalizedMessage || '保存されたブックマークの傾向から、今日の注目ニュースをお届けします。',
    keyTopics: parsed.greeting?.keyTopics || bookmarks.flatMap((b) => b.tags).slice(0, 5),
    generatedAt: new Date().toISOString(),
  };

  return { greeting, recommendations };
}

// Fallback smart heuristic matcher when API key is pending or network is restricted
function generateHeuristicRecommendations(
  bookmarks: Bookmark[],
  feedItems: FeedItem[]
): { greeting: ConciergeGreeting; recommendations: Recommendation[] } {
  const allUserKeywords = new Set<string>();
  bookmarks.forEach((b) => {
    b.tags.forEach((t) => allUserKeywords.add(t.toLowerCase()));
    b.title.split(/[\s,./、。]+/g).forEach((word) => {
      if (word.length >= 2) allUserKeywords.add(word.toLowerCase());
    });
  });

  const scoredArticles = feedItems.map((item) => {
    let score = 65;
    const matchedTags: string[] = [];
    const textToCheck = `${item.title} ${item.contentSnippet}`.toLowerCase();

    allUserKeywords.forEach((kw) => {
      if (kw && textToCheck.includes(kw)) {
        score += 8;
        if (matchedTags.length < 3) {
          matchedTags.push(kw);
        }
      }
    });

    return { item, score: Math.min(score, 98), matchedTags };
  });

  scoredArticles.sort((a, b) => b.score - a.score);
  const topPicks = scoredArticles.slice(0, 4);

  const topTopics = Array.from(allUserKeywords).slice(0, 5);
  const primaryTopic = topTopics[0] || 'テクノロジー';

  const recommendations: Recommendation[] = topPicks.map((pick, i) => {
    const summary = pick.item.contentSnippet
      ? [
          `${pick.item.title}に関する最新の動向と要点。`,
          pick.item.contentSnippet.slice(0, 60) + '...',
          '実務や今後のプロジェクト開発に参考となる知見を提供。',
        ]
      : [
          '最新のアップデートと注目トピック。',
          'エンジニアリングコミュニティでの実践的議論。',
          '今後のトレンド予測と実装方針の参考情報。',
        ];

    const reason = pick.matchedTags.length > 0
      ? `保存済みブックマークの「${pick.matchedTags.join(', ')}」関連トピックと親和性が高いため。`
      : `直近の技術関心（${primaryTopic}）の最新トレンドとして注目度が高いため。`;

    return {
      id: 'rec_heur_' + i + '_' + Date.now(),
      articleTitle: pick.item.title,
      articleUrl: pick.item.link,
      sourceName: pick.item.sourceName,
      pubDate: pick.item.pubDate,
      summary,
      reason,
      relatedBookmarkTags: pick.matchedTags.length > 0 ? pick.matchedTags : [primaryTopic],
      relevanceScore: pick.score,
    };
  });

  const greeting: ConciergeGreeting = {
    greeting: getGreetingByTime(),
    personalizedMessage: `あなたの関心キーワード「${topTopics.slice(0, 3).join('・')}」を中心に、本日チェックすべき注目記事をピックアップしました。`,
    keyTopics: topTopics,
    generatedAt: new Date().toISOString(),
  };

  return { greeting, recommendations };
}

function getGreetingByTime(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'おはようございます！';
  if (hour >= 11 && hour < 17) return 'こんにちは！';
  return 'お疲れ様です！';
}
