import React, { useState, useEffect } from 'react';

interface FeedItem {
  title: string;
  link: string;
  source: string;
}

interface RecommendedArticle {
  title: string;
  link: string;
  reason: string;
  summary: string;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [interests, setInterests] = useState<string>(() => {
    return localStorage.getItem('user_interests') || '料理, レシピ, グルメ';
  });

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem('my_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  const [recommendations, setRecommendations] = useState<RecommendedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoUrl, setNewMemoUrl] = useState('');

  useEffect(() => {
    localStorage.setItem('my_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const handleSaveSettings = (key: string, userInterests: string) => {
    setApiKey(key);
    setInterests(userInterests);
    localStorage.setItem('gemini_api_key', key);
    localStorage.setItem('user_interests', userInterests);
    setShowSettings(false);
    alert('設定を保存しました！');
  };

  const handleAnalyze = async () => {
    if (!apiKey) {
      alert('Gemini APIキーが設定されていません。右上の「⚙️ 設定」から登録してください。');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setStatusMessage(`「${interests}」の最新ニュースを検索中...`);

    try {
      // 1. Googleニュースから「ユーザーの関心ワード」でリアルタイム検索
      let articles: FeedItem[] = [];
      const searchQuery = encodeURIComponent(interests.replace(/,/g, ' OR '));
      const googleNewsUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=ja&gl=JP&ceid=JP:ja`;
      
      try {
        const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(googleNewsUrl)}`);
        const proxyData = await proxyRes.json();
        
        // XMLをパースして記事を取り出す
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(proxyData.contents, "text/xml");
        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 15);

        articles = items.map(item => ({
          title: item.querySelector("title")?.textContent || "",
          link: item.querySelector("link")?.textContent || "",
          source: 'Googleニュース'
        }));
      } catch (e) {
        console.warn('Googleニュースの取得に失敗、代替ニュースを取得します');
      }

      // もしGoogleニュースが取れなかった場合のフォールバック（Qiita）
      if (articles.length === 0) {
        const res = await fetch('https://qiita.com/api/v2/items?page=1&per_page=15');
        const data = await res.json();
        articles = data.map((item: any) => ({
          title: item.title,
          link: item.url,
          source: '技術トレンド'
        }));
      }

      setStatusMessage('AIコンシェルジュが厳選中...');

      // 2. Gemini API を呼び出し
      const bookmarkSummaries = bookmarks.slice(0, 5).map(b => b.title).join(', ');
      const articlesText = articles.map((a, i) => `[${i + 1}] タイトル: ${a.title}\nURL: ${a.link}`).join('\n\n');

      const prompt = `
あなたは専属のAIニュースコンシェルジュです。
以下の【ユーザーの関心ワード】と【最近のブックマーク】を参考に、【最新ニュース一覧】の中からユーザーに最もおすすめな記事を「3件」厳選してください。

【ユーザーの関心ワード】
${interests}

【最近保存したブックマーク】
${bookmarkSummaries || '特になし'}

【最新ニュース一覧】
${articlesText}

必ず以下のJSON配列フォーマットのみを出力してください。Markdownのコードブロック（\`\`\`json等）も含めず、純粋なJSONテキストだけを返してください。
[
  {
    "title": "記事タイトル",
    "link": "記事のURL",
    "reason": "なぜあなたにおすすめなのかの理由（親しみやすい口調で1〜2文）",
    "summary": "記事の要約（ポイントをわかりやすく2〜3行で）"
  }
]
`;

      // ユーザーの環境で動いたモデル（3.8など）に合わせて調整可能です
      const modelName = 'gemini-2.5-flash'; 
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const aiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        throw new Error(`Geminiエラー (${aiRes.status}): ${errText}`);
      }

      const aiData = await aiRes.json();
      const outputText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!outputText) throw new Error('AIから応答が得られませんでした');

      const parsed: RecommendedArticle[] = JSON.parse(outputText.replace(/```json/g, '').replace(/```/g, '').trim());
      setRecommendations(parsed);
      setStatusMessage('');
    } catch (err: any) {
      alert(`エラー:\n${err.message || err}`);
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  const addBookmark = (title: string, url: string) => {
    const item: Bookmark = {
      id: Date.now().toString(),
      title,
      url,
      createdAt: new Date().toLocaleDateString('ja-JP')
    };
    setBookmarks([item, ...bookmarks]);
    alert('ブックマークに追加しました！');
  };

  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter(b => b.id !== id));
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* ヘッダー */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>📰 AIニュースコンシェルジュ</h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>設定ワード: {interests}</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px', cursor: 'pointer' }}
        >
          ⚙️ 設定
        </button>
      </header>

      {/* 設定パネル */}
      {showSettings && (
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '15px' }}>設定（端末に保存されます）</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Gemini API Key:</label>
            <input
              type="password"
              defaultValue={apiKey}
              id="apiKeyInput"
              placeholder="AIzaSy..."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>あなたの興味・関心ワード:</label>
            <input
              type="text"
              defaultValue={interests}
              id="interestsInput"
              placeholder="例: 料理, カフェ, サッカー, AI"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={() => {
              const k = (document.getElementById('apiKeyInput') as HTMLInputElement).value;
              const i = (document.getElementById('interestsInput') as HTMLInputElement).value;
              handleSaveSettings(k, i);
            }}
            style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            保存する
          </button>
        </div>
      )}

      {/* AIレコメンド実行ボタン */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? '#94a3b8' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🤖 ' + statusMessage : '✨ 今日の厳選ニュースを分析・おすすめ'}
        </button>
      </div>

      {/* おすすめ記事リスト */}
      {recommendations.length > 0 && (
        <section style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>
            🎯 「{interests}」のおすすめ（3選）
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recommendations.map((item, idx) => (
              <div key={idx} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px', fontWeight: 'bold', color: '#1d4ed8', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                  {item.title}
                </a>
                
                <div style={{ backgroundColor: '#eff6ff', padding: '8px 10px', borderRadius: '6px', fontSize: '13px', color: '#1e40af', marginBottom: '8px' }}>
                  💡 <strong>おすすめ理由:</strong> {item.reason}
                </div>

                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                  📝 {item.summary}
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, textAlign: 'center', padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '12px', color: '#334155', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    記事を読む ↗
                  </a>
                  <button
                    onClick={() => addBookmark(item.title, item.link)}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ⭐ ブックマーク
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ブックマーク・メモ一覧 */}
      <section>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>
          📑 保存したブックマーク ({bookmarks.length})
        </h2>

        {/* 手動追加フォーム */}
        <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
          <input
            type="text"
            placeholder="タイトルまたはメモ"
            value={newMemoTitle}
            onChange={(e) => setNewMemoTitle(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '6px', boxSizing: 'border-box' }}
          />
          <input
            type="text"
            placeholder="URL (任意)"
            value={newMemoUrl}
            onChange={(e) => setNewMemoUrl(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => {
              if (!newMemoTitle) return;
              addBookmark(newMemoTitle, newMemoUrl);
              setNewMemoTitle('');
              setNewMemoUrl('');
            }}
            style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
          >
            ＋ メモを追加
          </button>
        </div>

        {/* リスト表示 */}
        {bookmarks.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>まだ保存された記事はありません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bookmarks.map((bm) => (
              <div key={bm.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
                  {bm.url ? (
                    <a href={bm.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bm.title}
                    </a>
                  ) : (
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{bm.title}</div>
                  )}
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{bm.createdAt}</span>
                </div>
                <button
                  onClick={() => removeBookmark(bm.id)}
                  style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '4px' }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
