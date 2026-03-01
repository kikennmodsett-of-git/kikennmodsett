document.addEventListener('DOMContentLoaded', () => {
    const solveBtn = document.getElementById('solve-btn');
    const troubleInput = document.getElementById('trouble-input');
    const approachInput = document.getElementById('approach-input');
    const resultsArea = document.getElementById('results-area');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const solutionsContainer = document.getElementById('solutions-container');

    // 解決策のプロンプトデータベース（簡易版）
    const solutionDatabase = {
        'default': [
            { title: '多角的な分析', summary: '問題を細分化して、どこにボトルネックがあるか特定しましょう。', detail: '複雑に見える問題も、最小単位に分解すれば対処しやすくなります。まずは現状を書き出し、事実に焦点を当てて整理してください。' },
            { title: '専門リソースの活用', summary: '関連するドキュメントや専門家の意見を参考にしましょう。', detail: '独りで悩まず、公式ガイドや過去の事例、あるいはAIツールを活用して、自分になかった視点を取り入れることが重要です。' },
            { title: '環境の調整', summary: '集中力を削ぐ要因を排除し、最適な環境を整えましょう。', detail: '外部環境や自身の体調、メンタルが原因であることも多いです。まずは一度深呼吸し、作業場所を変えるなどの物理的な変化を試してください。' },
            { title: '小さな一歩から始める', summary: '完了までを考えず、次の5分間でできることだけに集中してください。', detail: '心理的なハードルを下げるために、極限までハードルを下げた目標を設定しましょう。一度動き出せば、慣性の法則で作業は捗ります。' }
        ],
        'バグ': [
            { title: 'ログの徹底確認', summary: 'エラーメッセージを正確に読み解き、変数の推移を追ってください。', detail: 'デバッガーやconsole.logを駆使して、想定外の値が入っている箇所を特定します。推測ではなく、事実に基づいて調査しましょう。' },
            { title: 'バイセクション検索', summary: 'コードを半分ずつコメントアウトして原因箇所を絞り込みます。', detail: '正常に動いていた時のコードと比較したり、疑わしいモジュールを一つずつ切り離して動作を確認することで、原因を特定できます。' },
            { title: 'ドキュメント・コミュニティ', summary: '公式リファレンスやStack Overflowで同様の事例を探します。', detail: 'そのエラーは世界の誰かが既に解決している可能性が高いです。エラー文をそのまま検索し、最新の解決策を取り入れましょう。' },
            { title: 'ラバーダック・デバッグ', summary: '誰かに説明するように、一行ずつコードの挙動を声に出してみます。', detail: '自分の思考を言語化する過程で、論理的な矛盾や見落としていたミスに気づくことができます。人形に向かって話すだけでも効果的です。' }
        ],
        'プログラミング': [
            { title: '基本の立ち返り', summary: '使用している言語やフレームワークの基礎知識を再確認します。', detail: '応用的な問題も、実は基礎的な設定ミスや仕様の勘違いが原因であることが多いです。リファレンスを改めて読み直しましょう。' },
            { title: 'リファクタリングの検討', summary: 'コードが複雑になりすぎている場合、シンプルに書き直します。', detail: '可読性の低いコードはバグの温床です。目的を一つに絞った関数に分割し、ロジックを整理することで解決の糸口が見えます。' },
            { title: 'ツールの導入', summary: '自動テストや静的解析ツール、最新のIDE機能を活用しましょう。', detail: '人間が見落とすミスも、ツールなら即座に指摘してくれます。Lintツールの警告を無視せず、推奨されるコーディングスタイルに従いましょう。' },
            { title: 'GitHub / ライブラリの調査', summary: '似たような機能を実装しているオープンソースプロジェクトを探します。', detail: '優れた設計パターンを学ぶことで、自力で思いつかなかったスマートな解決策が見つかることがあります。' }
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

        // 簡易的なキーワードマッチング
        if (trouble.includes('バグ')) {
            solutions = [...solutionDatabase['バグ']];
        } else if (trouble.includes('プログラミング') || trouble.includes('コード')) {
            solutions = [...solutionDatabase['プログラミング']];
        }

        // 対処方針に応じた味付け（擬似AI）
        if (approach) {
            solutions = solutions.map(s => ({
                ...s,
                summary: `${approach}という方針に沿った、${s.summary}`
            }));
        }

        // UI更新：読み込み完了
        loadingSpinner.classList.add('hidden');
        solveBtn.disabled = false;

        // 結果の表示
        solutions.forEach((sol, index) => {
            const card = document.createElement('div');
            card.className = 'solution-card';
            card.style.animationDelay = `${index * 0.1}s`;

            let innerHTML = `
                <h3><i class="fas fa-lightbulb"></i> ${sol.title}</h3>
                <p>${sol.summary}</p>
            `;

            if (depth === 'rich') {
                innerHTML += `<div class="detail-text">${sol.detail}</div>`;
            }

            card.innerHTML = innerHTML;
            solutionsContainer.appendChild(card);
        });
    });
});
