/**
 * MFT (My Favorite Things) - ビルドスクリプト
 * データファイルからGitHub Pages用の静的HTMLを生成
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const FEEDS_PATH = path.join(DATA_DIR, 'feeds.json');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');

/**
 * 日付をフォーマット
 * @param {string} isoString 
 * @returns {string}
 */
function formatDate(isoString) {
    if (!isoString) return '未取得';
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * 相対時間を計算
 * @param {string} isoString 
 * @returns {string}
 */
function timeAgo(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    return `${diffDays}日前`;
}

/**
 * HTMLエスケープ
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 更新カードのHTMLを生成
 * @param {Object} update 
 * @returns {string}
 */
function renderUpdateCard(update) {
    const tagsHtml = update.tags
        .map(tag => `<span class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`)
        .join('');

    const diffHtml = update.diff
        .slice(0, 5) // 最大5件の変更を表示
        .map(d => `
      <div class="diff-item diff-${d.type}">
        <span class="diff-marker">${d.type === 'added' ? '+' : '-'}</span>
        <span class="diff-content">${escapeHtml(d.content.substring(0, 200))}</span>
      </div>
    `)
        .join('');

    return `
    <article class="update-card" data-tags="${update.tags.join(',')}" data-feed="${update.feedId}">
      <header class="card-header">
        <div class="card-meta">
          <span class="time-ago">${timeAgo(update.detectedAt)}</span>
          <time datetime="${update.detectedAt}">${formatDate(update.detectedAt)}</time>
        </div>
        <h3 class="card-title">
          <a href="${escapeHtml(update.url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(update.feedTitle)}
            <svg class="external-icon" viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
            </svg>
          </a>
        </h3>
      </header>
      <div class="card-tags">${tagsHtml}</div>
      <div class="diff-summary">
        <span class="diff-badge">${update.diffSummary}</span>
      </div>
      <div class="diff-preview">${diffHtml}</div>
    </article>
  `;
}

/**
 * フィード管理セクションのHTMLを生成
 * @param {Array} feeds 
 * @returns {string}
 */
function renderFeedsList(feeds) {
    return feeds.map(feed => `
    <div class="feed-item" data-id="${feed.id}">
      <div class="feed-info">
        <h4 class="feed-title">${escapeHtml(feed.title)}</h4>
        <a class="feed-url" href="${escapeHtml(feed.url)}" target="_blank">${escapeHtml(feed.url)}</a>
        <div class="feed-tags">
          ${feed.tags.map(t => `<span class="tag small">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="feed-status">
        <span class="status-label">最終確認:</span>
        <span class="status-value">${formatDate(feed.lastChecked)}</span>
      </div>
    </div>
  `).join('');
}

/**
 * メインHTMLを生成
 */
async function build() {
    console.log('🔨 ビルド開始...');

    // ディレクトリ作成
    await fs.mkdir(DOCS_DIR, { recursive: true });

    // データ読み込み
    const feedsData = JSON.parse(await fs.readFile(FEEDS_PATH, 'utf-8'));
    const historyData = JSON.parse(await fs.readFile(HISTORY_PATH, 'utf-8'));

    // 全タグを収集
    const allTags = [...new Set(feedsData.tags)];

    // 更新カードを生成
    const updatesHtml = historyData.updates.length > 0
        ? historyData.updates.map(renderUpdateCard).join('')
        : '<div class="empty-state"><p>まだ更新はありません</p><p>URLを追加して巡回を待ちましょう</p></div>';

    // フィードリストを生成
    const feedsListHtml = renderFeedsList(feedsData.feeds);

    // タグフィルターを生成
    const tagFiltersHtml = allTags.map(tag =>
        `<button class="tag-filter" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MFT - My Favorite Things</title>
  <meta name="description" content="お気に入りサイトの更新を追跡するRSSライクなフィードリーダー">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app-container">
    <!-- ヘッダー -->
    <header class="main-header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-icon">⚡</span>
          <h1>MFT</h1>
          <span class="logo-tagline">My Favorite Things</span>
        </div>
        <nav class="header-nav">
          <button class="nav-btn active" data-view="updates">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
            更新
          </button>
          <button class="nav-btn" data-view="feeds">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6.18,15.64A2.18,2.18 0 0,1 8.36,17.82C8.36,19 7.38,20 6.18,20C5,20 4,19 4,17.82A2.18,2.18 0 0,1 6.18,15.64M4,4.44A15.56,15.56 0 0,1 19.56,20H16.73A12.73,12.73 0 0,0 4,7.27V4.44M4,10.1A9.9,9.9 0 0,1 13.9,20H11.07A7.07,7.07 0 0,0 4,12.93V10.1Z"/></svg>
            フィード
          </button>
          <button class="nav-btn" data-view="settings">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>
            設定
          </button>
        </nav>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="main-content">
      <!-- 更新ビュー -->
      <section id="updates-view" class="view active">
        <div class="view-header">
          <h2>最新の更新</h2>
          <div class="tag-filters">
            <button class="tag-filter active" data-tag="all">すべて</button>
            ${tagFiltersHtml}
          </div>
        </div>
        <div class="updates-grid">
          ${updatesHtml}
        </div>
      </section>

      <!-- フィード管理ビュー -->
      <section id="feeds-view" class="view">
        <div class="view-header">
          <h2>登録フィード</h2>
          <button class="btn-primary" id="add-feed-btn">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
            フィード追加
          </button>
        </div>
        <div class="feeds-list">
          ${feedsListHtml}
        </div>
      </section>

      <!-- 設定ビュー -->
      <section id="settings-view" class="view">
        <div class="view-header">
          <h2>設定</h2>
        </div>
        <div class="settings-content">
          <div class="setting-group">
            <h3>タグ管理</h3>
            <div class="tag-manager">
              <div class="current-tags">
                ${allTags.map(tag => `
                  <span class="tag editable" data-tag="${escapeHtml(tag)}">
                    ${escapeHtml(tag)}
                    <button class="tag-remove" aria-label="削除">×</button>
                  </span>
                `).join('')}
              </div>
              <div class="add-tag-form">
                <input type="text" id="new-tag-input" placeholder="新しいタグ名">
                <button class="btn-secondary" id="add-tag-btn">追加</button>
              </div>
            </div>
          </div>
          <div class="setting-group">
            <h3>情報</h3>
            <p class="info-text">
              MFTは1時間ごとにGitHub Actionsで自動巡回します。<br>
              更新があった場合、差分が記録されトップページに表示されます。
            </p>
          </div>
        </div>
      </section>
    </main>

    <!-- フィード追加モーダル -->
    <div class="modal" id="add-feed-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <header class="modal-header">
          <h3>フィードを追加</h3>
          <button class="modal-close" aria-label="閉じる">×</button>
        </header>
        <form id="add-feed-form" class="modal-body">
          <div class="form-group">
            <label for="feed-url">URL <span class="required">*</span></label>
            <input type="url" id="feed-url" name="url" required placeholder="https://example.com">
          </div>
          <div class="form-group">
            <label for="feed-title">タイトル</label>
            <input type="text" id="feed-title" name="title" placeholder="サイト名（空欄で自動取得）">
          </div>
          <div class="form-group">
            <label for="feed-selector">CSSセレクタ</label>
            <input type="text" id="feed-selector" name="selector" placeholder="body（監視対象の要素）" value="body">
          </div>
          <div class="form-group">
            <label>タグ</label>
            <div class="tag-select">
              ${allTags.map(tag => `
                <label class="tag-checkbox">
                  <input type="checkbox" name="tags" value="${escapeHtml(tag)}">
                  <span>${escapeHtml(tag)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </form>
        <footer class="modal-footer">
          <button type="button" class="btn-secondary modal-cancel">キャンセル</button>
          <button type="submit" form="add-feed-form" class="btn-primary">追加</button>
        </footer>
      </div>
    </div>

    <!-- フッター -->
    <footer class="main-footer">
      <p>最終更新: <time id="last-update">${formatDate(new Date().toISOString())}</time></p>
      <p class="footer-meta">Powered by GitHub Actions · 1時間ごとに自動巡回</p>
    </footer>
  </div>

  <script src="app.js"></script>
</body>
</html>`;

    // ファイル書き込み
    await fs.writeFile(path.join(DOCS_DIR, 'index.html'), html, 'utf-8');

    // データJSONをdocsにコピー（フロントエンドからのAPI用）
    await fs.writeFile(
        path.join(DOCS_DIR, 'feeds.json'),
        JSON.stringify(feedsData, null, 2),
        'utf-8'
    );
    await fs.writeFile(
        path.join(DOCS_DIR, 'history.json'),
        JSON.stringify(historyData, null, 2),
        'utf-8'
    );

    console.log('✅ ビルド完了: docs/index.html');
}

build().catch(console.error);
