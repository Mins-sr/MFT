/**
 * MFT (My Favorite Things) - URL巡回スクリプト
 * 登録されたURLを巡回し、更新を検出して差分を記録する
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import * as Diff from 'diff';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// __dirname の代替（ESM用）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パス定義
const DATA_DIR = path.join(__dirname, '..', 'data');
const FEEDS_PATH = path.join(DATA_DIR, 'feeds.json');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

/**
 * URLからコンテンツを取得
 * @param {string} url - 取得するURL
 * @param {string} selector - 抽出するCSSセレクタ
 * @returns {Promise<{content: string, title: string}>}
 */
async function fetchContent(url, selector = 'body') {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MFT-Crawler/1.0 (GitHub Pages Feed Tracker)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // メタデータを取得
    const title = $('title').text().trim() || url;
    
    // 指定されたセレクタの内容を取得
    const content = $(selector).text().trim();
    
    return { content, title };
  } catch (error) {
    console.error(`[エラー] ${url} の取得に失敗: ${error.message}`);
    return null;
  }
}

/**
 * コンテンツのハッシュを生成
 * @param {string} content 
 * @returns {string}
 */
function generateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * スナップショットを保存
 * @param {string} feedId 
 * @param {string} content 
 */
async function saveSnapshot(feedId, content) {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${feedId}.txt`);
  await fs.writeFile(snapshotPath, content, 'utf-8');
}

/**
 * スナップショットを読み込み
 * @param {string} feedId 
 * @returns {Promise<string | null>}
 */
async function loadSnapshot(feedId) {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${feedId}.txt`);
  try {
    return await fs.readFile(snapshotPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 差分を計算
 * @param {string} oldContent 
 * @param {string} newContent 
 * @returns {Array}
 */
function calculateDiff(oldContent, newContent) {
  const changes = Diff.diffLines(oldContent, newContent);
  return changes.filter(part => part.added || part.removed);
}

/**
 * メイン巡回処理
 */
async function crawl() {
  console.log('🚀 MFT巡回開始:', new Date().toISOString());

  // データ読み込み
  const feedsData = JSON.parse(await fs.readFile(FEEDS_PATH, 'utf-8'));
  const historyData = JSON.parse(await fs.readFile(HISTORY_PATH, 'utf-8'));

  const now = new Date().toISOString();
  let updatedCount = 0;

  for (const feed of feedsData.feeds) {
    console.log(`📄 巡回中: ${feed.title} (${feed.url})`);

    // コンテンツ取得
    const result = await fetchContent(feed.url, feed.selector || 'body');
    
    if (!result) {
      console.log(`  ⚠️ スキップ: 取得失敗`);
      continue;
    }

    // 前回のスナップショットを読み込み
    const previousContent = await loadSnapshot(feed.id);
    const currentHash = generateHash(result.content);

    // フィードのメタデータ更新
    feed.lastChecked = now;
    if (result.title && result.title !== feed.url) {
      feed.title = result.title;
    }

    // 変更検出
    if (previousContent === null) {
      // 初回取得
      console.log(`  ✨ 初回スナップショット保存`);
      await saveSnapshot(feed.id, result.content);
    } else if (generateHash(previousContent) !== currentHash) {
      // 変更あり
      console.log(`  🔄 更新を検出!`);
      
      const diff = calculateDiff(previousContent, result.content);
      
      // 履歴に追加
      historyData.updates.unshift({
        id: `${feed.id}-${Date.now()}`,
        feedId: feed.id,
        feedTitle: feed.title,
        url: feed.url,
        tags: feed.tags,
        detectedAt: now,
        diff: diff.map(part => ({
          type: part.added ? 'added' : 'removed',
          content: part.value.substring(0, 500), // 長すぎる場合は切り詰め
        })),
        diffSummary: `+${diff.filter(p => p.added).length}件 / -${diff.filter(p => p.removed).length}件`,
      });

      // 新しいスナップショットを保存
      await saveSnapshot(feed.id, result.content);
      feed.lastUpdated = now;
      updatedCount++;
    } else {
      console.log(`  ✓ 変更なし`);
    }

    // APIレート制限対策
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 履歴は最新100件に制限
  historyData.updates = historyData.updates.slice(0, 100);

  // データ保存
  await fs.writeFile(FEEDS_PATH, JSON.stringify(feedsData, null, 2), 'utf-8');
  await fs.writeFile(HISTORY_PATH, JSON.stringify(historyData, null, 2), 'utf-8');

  console.log(`✅ 巡回完了: ${updatedCount}件の更新を検出`);
}

// 実行
crawl().catch(console.error);
