/**
 * MFT - My Favorite Things
 * フロントエンドアプリケーション
 */

// アプリ状態
const state = {
    currentView: 'updates',
    selectedTags: ['all'],
    feeds: [],
    history: [],
    tags: [],
};

// DOM要素のキャッシュ
const elements = {
    navBtns: document.querySelectorAll('.nav-btn'),
    views: document.querySelectorAll('.view'),
    tagFilters: document.querySelectorAll('.tag-filter'),
    updateCards: null, // あとで初期化
    addFeedBtn: document.getElementById('add-feed-btn'),
    addFeedModal: document.getElementById('add-feed-modal'),
    addFeedForm: document.getElementById('add-feed-form'),
};

/**
 * 初期化
 */
async function init() {
    console.log('🚀 MFT初期化中...');

    // データ読み込み
    await loadData();

    // イベントリスナー設定
    setupEventListeners();

    // 初期状態の反映
    updateView();

    console.log('✅ MFT初期化完了');
}

/**
 * データの読み込み
 */
async function loadData() {
    try {
        const [feedsRes, historyRes] = await Promise.all([
            fetch('feeds.json'),
            fetch('history.json'),
        ]);

        const feedsData = await feedsRes.json();
        const historyData = await historyRes.json();

        state.feeds = feedsData.feeds || [];
        state.tags = feedsData.tags || [];
        state.history = historyData.updates || [];
    } catch (error) {
        console.error('データ読み込みエラー:', error);
    }
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // ナビゲーション
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    // タグフィルター
    document.querySelectorAll('.tag-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            handleTagFilter(btn);
        });
    });

    // カード内のタグクリック
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag') && e.target.dataset.tag) {
            const tag = e.target.dataset.tag;
            selectSingleTag(tag);
        }
    });

    // フィード追加モーダル
    if (elements.addFeedBtn) {
        elements.addFeedBtn.addEventListener('click', openAddFeedModal);
    }

    // モーダル閉じる
    document.querySelectorAll('.modal-close, .modal-cancel, .modal-backdrop').forEach(el => {
        el.addEventListener('click', closeModals);
    });

    // フィード追加フォーム送信
    if (elements.addFeedForm) {
        elements.addFeedForm.addEventListener('submit', handleAddFeed);
    }

    // ESCキーでモーダル閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModals();
        }
    });
}

/**
 * ビューの切り替え
 * @param {string} viewName 
 */
function switchView(viewName) {
    state.currentView = viewName;

    // ナビゲーションのアクティブ状態
    elements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // ビューの表示/非表示
    elements.views.forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}-view`);
    });
}

/**
 * タグフィルター処理
 * @param {HTMLElement} btn 
 */
function handleTagFilter(btn) {
    const tag = btn.dataset.tag;
    const filters = document.querySelectorAll('.tag-filter');

    if (tag === 'all') {
        // 「すべて」を選択
        state.selectedTags = ['all'];
        filters.forEach(f => f.classList.toggle('active', f.dataset.tag === 'all'));
    } else {
        // 個別タグを選択
        const allBtn = document.querySelector('.tag-filter[data-tag="all"]');
        allBtn.classList.remove('active');
        state.selectedTags = state.selectedTags.filter(t => t !== 'all');

        if (btn.classList.contains('active')) {
            // 選択解除
            btn.classList.remove('active');
            state.selectedTags = state.selectedTags.filter(t => t !== tag);
        } else {
            // 選択
            btn.classList.add('active');
            state.selectedTags.push(tag);
        }

        // 何も選択されていなければ「すべて」に戻す
        if (state.selectedTags.length === 0) {
            state.selectedTags = ['all'];
            allBtn.classList.add('active');
        }
    }

    filterCards();
}

/**
 * 単一タグを選択
 * @param {string} tag 
 */
function selectSingleTag(tag) {
    state.selectedTags = [tag];

    document.querySelectorAll('.tag-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tag === tag);
    });

    filterCards();
}

/**
 * カードをフィルタリング
 */
function filterCards() {
    const cards = document.querySelectorAll('.update-card');

    cards.forEach(card => {
        if (state.selectedTags.includes('all')) {
            card.style.display = '';
            return;
        }

        const cardTags = card.dataset.tags.split(',');
        const visible = cardTags.some(t => state.selectedTags.includes(t));
        card.style.display = visible ? '' : 'none';
    });
}

/**
 * フィード追加モーダルを開く
 */
function openAddFeedModal() {
    elements.addFeedModal.classList.add('active');
    document.getElementById('feed-url').focus();
}

/**
 * すべてのモーダルを閉じる
 */
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

/**
 * フィード追加処理
 * @param {Event} e 
 */
async function handleAddFeed(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const url = formData.get('url');
    const title = formData.get('title') || url;
    const selector = formData.get('selector') || 'body';
    const tags = formData.getAll('tags');

    // 新しいフィードオブジェクト
    const newFeed = {
        id: `feed-${Date.now()}`,
        url,
        title,
        selector,
        tags,
        addedAt: new Date().toISOString(),
        lastChecked: null,
        lastUpdated: null,
    };

    // 実際のアプリではAPIを呼び出してサーバーに保存
    // GitHub Pagesでは静的なので、ローカルストレージに保存してユーザーに通知

    const savedFeeds = JSON.parse(localStorage.getItem('pendingFeeds') || '[]');
    savedFeeds.push(newFeed);
    localStorage.setItem('pendingFeeds', JSON.stringify(savedFeeds));

    // UIに反映
    addFeedToUI(newFeed);

    // モーダを閉じてフォームをリセット
    closeModals();
    e.target.reset();

    // 通知
    showNotification(`「${title}」を追加しました。次の巡回で反映されます。`);
}

/**
 * フィードをUIに追加
 * @param {Object} feed 
 */
function addFeedToUI(feed) {
    const feedsList = document.querySelector('.feeds-list');
    if (!feedsList) return;

    const feedHtml = `
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
        <span class="status-value">未取得</span>
      </div>
    </div>
  `;

    feedsList.insertAdjacentHTML('beforeend', feedHtml);
}

/**
 * 通知を表示
 * @param {string} message 
 */
function showNotification(message) {
    // シンプルなアラート（後でトースト通知に改善可能）
    alert(message);
}

/**
 * HTMLエスケープ
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * ビュー更新
 */
function updateView() {
    // 初期状態のフィルター適用
    filterCards();
}

// DOMContentLoadedで初期化
document.addEventListener('DOMContentLoaded', init);
