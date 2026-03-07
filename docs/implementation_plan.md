# 3Dオンライン格闘ゲーム「3D-Brawl」実装計画

Three.jsを使用した3Dグラフィックスと、PeerJSを使用したP2P通信により、ブラウザで動作する3~5人対戦の格闘ゲームを開発します。

## 概要
- **エンジン**: Three.js
- **通信**: PeerJS (P2P)
- **ターゲット**: PCブラウザ

## Proposed Changes

### 1. ゲーム本体 [NEW]
- **`3d_brawl/index.html`**: ゲームの起動とルームUI、HUD。
- **`3d_brawl/style.css`**: ゲーム画面のスタイリング。
- **`3d_brawl/script.js`**: 
    - **Engine**: Three.jsの初期化、ステージ描画（障害物含む）。
    - **Physics**: シンプルな衝突判定、重力処理。
    - **Networking**: ルーム作成/参加（パスワードハッシュによるPeer ID管理）。
    - **Combat**: 1キーでパンチ、2キーでキック。ヒット時のノックバックとダメージ処理。
    - **NPC**: ステートマシンによる索敵・追跡・攻撃ロジック。

### 2. ポートフォリオ統合 [MODIFY]
- **`index.html`**: 「Selected Works」セクションの5つ目のスロットに「3D-Brawl」を追加。

## Verification Plan

### Automated Tests
- コンソールログによるPeer接続状態の確認。
- 当たり判定（HitBox）のデバッグ表示。

### Manual Verification
- **NPC戦**: ソロプレイでNPCが正しく追いかけて攻撃してくるか、HPが減るかを確認。
- **対戦機能**: 2つのブラウザタブ（またはシークレットウィンドウ）を開き、同じルーム・パスワードで対戦ができるかを確認。
- **同期確認**: 位置、回転、攻撃アニメーションが他方の画面で正しく再現されるか。

## Proposed Changes (Modification Phase)

### 3D-Brawl [MODIFY]
- **障害物判定の追加**:
    - `init()`内で生成される障害物（BoxMesh）を`obstacles`配列に保持するよう変更。
    - 移動処理（`handleInput`）の前に衝突判定を行い、障害物がある場合は移動をキャンセルするように修正。
- **攻撃モーションの強化**:
    - 単純な腕の回転だけでなく、胴体のひねりや反対の腕の引き、踏み込みなどを考慮した多段階のアニメーションを`update()`内で実装。
    - パンチ、キックそれぞれの動作時間を調整し、より重みのある表現に変更。

## Proposed Changes (Networking & HUD Phase)

### 3D-Brawl [MODIFY]
- **PeerJS Room Logic**:
    - パスワードに基づいたハッシュ値を生成し、それを基点としたLobby Peer IDを作成。
    - 最初に接続したプレイヤーがLobbyとなり、後続のプレイヤーはLobbyに接続してメッシュネットワークを形成。
- **Connection Log**:
    - HUDエリアに `message-log` コンテナを追加。
    - 新しいプレイヤーが接続した際、または切断した際にログを表示（例: "XXXが参戦しました！"）。
- **HUD Optimization**:
    - 左上固定の `player-list` HUDを整理。
    - 自分のステータスは一番上に、他のプレイヤーは順次その下に表示されるようレイアウトを調整。
    - 名前とHPバーをセットで表示。
