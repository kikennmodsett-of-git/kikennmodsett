document.addEventListener('DOMContentLoaded', () => {
    const solveBtn = document.getElementById('solve-btn');
    const troubleInput = document.getElementById('trouble-input');
    const approachInput = document.getElementById('approach-input');
    const resultsArea = document.getElementById('results-area');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const solutionsContainer = document.getElementById('solutions-container');

    // 解決策のプロンプトデータベース（拡充版）
    const solutionDatabase = {
        'default': [
            { title: '課題の言語化と具体化', summary: 'まず「何が」「どう」困っているかを140文字以内で書き出してください。', detail: '曖昧な不安を具体的な課題に変換することが第一歩です。紙に書き出すことで脳のワーキングメモリが解放され、冷静な判断が可能になります。' },
            { title: 'ポモドーロ・テクニックの導入', summary: '25分間の集中と5分間の休憩を1セットとして、タイマーをセットしてください。', detail: '「全部やる」のではなく「次の25分だけやる」と決めることで、着手ハードルが劇的に下がります。休憩中はスマホを見ず、深呼吸やストレッチを。' },
            { title: '「あえて放置する」戦略', summary: '一度その問題から離れ、15分程度の散歩や仮眠をとってください。', detail: '脳の「デフォルトモードネットワーク」が活性化し、無意識のうちに情報が整理され、新しいアイデアや解決策がひらめきやすくなります。' },
            { title: 'スモールステップの分解', summary: '現在の目標を「5分で終わる作業」まで分解し、その1つ目だけを完了させてください。', detail: '大きな岩を動かすのは大変ですが、小さな石なら投げられます。着手することで、脳内のドーパミンが放出され、自然と次のステップへ進めます。' }
        ],
        'バグ': [
            { title: 'デバッガーによる一行実行', summary: 'console.logではなく、ブレークポイントを設定して変数の値を1行ずつ追ってください。', detail: 'コードが「自分の思い通り」ではなく「実際にどう動いているか」を直視しましょう。特にループの境界値や、非同期処理の順序に注目です。' },
            { title: '最小再現コード（REPL）の作成', summary: '問題の箇所だけを切り出し、独立した小さなファイルで再現するか確認してください。', detail: '他のライブラリや複雑なロジックを排除することで、真の原因が浮き彫りになります。そのままGitHubのIssueや質問サイトに投稿する際にも役立ちます。' },
            { title: '公式ドキュメントの「Breaking Changes」確認', summary: '使用しているライブラリのバージョンを上げ、変更履歴（Changelog）を確認してください。', detail: '昨日まで動いていたものが動かなくなった場合、破壊的変更や非推奨化が原因かもしれません。特にメジャーアップデート時は要チェックです。' },
            { title: 'テストコードの記述', summary: 'バグが修正されたことを証明するためのユニットテストを1つ書いてください。', detail: 'テストが通るまで修正を続けることで、デグレ（修正による新たなバグ）を防ぎ、コードの品質と自身の自信を向上させます。' }
        ],
        'プログラミング': [
            { title: 'デザインパターンの適用検討', summary: 'そのコードに「Factory」や「Observer」などのパターンが適用できないか考えてください。', detail: '車輪の再発明を避け、先人の知恵を借りることで、拡張性が高く保守しやすいコードに生まれ変わります。ただし、オーバーエンジニアリングには注意。' },
            { title: 'コードレビューのセルフ実施', summary: '1時間後に自分のコードを「他人のコード」として、GitHubのPR形式で見直してください。', detail: '書いた直後は気づかない誤字や、冗長なロジック、マジックナンバーの放置などが客観的に見えるようになります。' },
            { title: 'ペアプログラミング / AIメンター', summary: 'AIに対して「このコードの改善提案をして」とプロンプトを入力してください。', detail: '自分一人では思いつかないモダンな書き方や、より効率的なアルゴリズムの提案を受けることができ、学習速度が飛躍的に向上します。' },
            { title: '技術負債の返済タイム設定', summary: '週に1時間、機能追加を一切せず「コードを綺麗にするだけ」の時間を設けてください。', detail: '目先の開発速度を優先しがちですが、定期的なリファクタリングこそが長期的な生産性を最大化する唯一の道です。' }
        ],
        '人間関係': [
            { title: 'アイ・メッセージ（I Message）', summary: '相手を主語にするのではなく「自分は〜と感じている」と伝えてください。', detail: '「あなたは〇〇だ」という決めつけは反発を招きます。「私は〇〇されると悲しい」と主観を伝えることで、攻撃性を抑えた対話が可能になります。' },
            { title: '期待値の調整', summary: '相手に期待していることを明確に言語化し、必要であればすり合わせを行ってください。', detail: '多くのトラブルは「言わなくてもわかるだろう」という期待のズレから生じます。具体的な期限やクオリティを数字で提示しましょう。' },
            { title: '境界線の設定（バウンダリー）', summary: '自分が「ここまではするが、ここからはしない」という線引きを明確にしてください。', detail: '他人の問題を自分の問題として抱え込みすぎると共倒れになります。Noと言える勇気が、結果として健全な関係を維持することに繋がります。' },
            { title: '「今ここでない」感情の切り離し', summary: '今の怒りが過去の誰かへの感情と混ざっていないか、1分間内省してください。', detail: '目の前の相手に、昔の嫌いな人を投影していることがあります。事実と感情を分けることで、冷静な対処がしやすくなります。' }
        ]
    };

    solveBtn.addEventListener('click', async () => {
        const trouble = troubleInput.value.trim();
        const approach = approachInput.value.trim();
        const depth = document.querySelector('input[name="explanation-depth"]:checked').value;

        if (!trouble) {
            alert('困っていることを入力してください！');
            return;
        }

        // UI更新：読み込み開始
        resultsArea.classList.remove('hidden');
        loadingSpinner.classList.remove('hidden');
        solutionsContainer.innerHTML = '';
        solveBtn.disabled = true;

        // AIの思考をシミュレート（1.5秒の遅延）
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 解決策の選定
        let solutions = [...solutionDatabase.default];

        // キーワードマッチングの強化
        if (trouble.includes('バグ')) {
            solutions = [...solutionDatabase['バグ']];
        } else if (trouble.includes('プログラミング') || trouble.includes('コード') || trouble.includes('実装')) {
            solutions = [...solutionDatabase['プログラミング']];
        } else if (trouble.includes('人') || trouble.includes('関係') || trouble.includes('相談') || trouble.includes('悩み')) {
            solutions = [...solutionDatabase['人間関係']];
        }

        // 対処方針に応じた味付け（擬似AI）
        if (approach) {
            solutions = solutions.map(s => {
                let suffix = '';
                if (approach.includes('早く') || approach.includes('簡単')) {
                    suffix = '（※即効性を重視したアドバイスです）';
                } else if (approach.includes('丁寧') || approach.includes('根本')) {
                    suffix = '（※長期的な視点でのアドバイスです）';
                }
                return {
                    ...s,
                    summary: `${approach}という方針に沿った、${s.summary} ${suffix}`
                };
            });
        }

        // UI更新：読み込み完了
        loadingSpinner.classList.add('hidden');
        solveBtn.disabled = false;

        // 結果の表示
        solutions.forEach((sol, index) => {
            const card = document.createElement('div');
            card.className = 'solution-card';
            card.style.animationDelay = `${index * 0.15}s`;

            let innerHTML = `
                <h3><i class="fas fa-check-circle"></i> ${sol.title}</h3>
                <p><strong>【具体的アクション】</strong><br>${sol.summary}</p>
            `;

            if (depth === 'rich') {
                innerHTML += `<div class="detail-text"><strong>【解説】</strong><br>${sol.detail}</div>`;
            }

            card.innerHTML = innerHTML;
            solutionsContainer.appendChild(card);
        });
    });
});
