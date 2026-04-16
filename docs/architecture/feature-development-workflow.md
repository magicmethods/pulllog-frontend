# フロントエンド機能開発ワークフロー

## 1. 目的

この文書は、PullLog フロントエンドにおける**機能開発の標準ワークフロー**を定義するためのひな形です。  
Issue、要件書、要求仕様から着手し、設計、UI/UX、実装、レビューまでを**5役の専用エージェント**で段階的に進める前提で運用します。

本ワークフローの目的は以下です。

- 各段階の責務を明確にする
- handoff 条件と差し戻し条件を固定する
- API 契約、バックエンド依存、UI 設計、実装、レビューの抜け漏れを防ぐ
- 最小差分かつ現行アーキテクチャ整合な feature delivery を行う

---

## 2. 適用範囲

このワークフローは、以下のようなフロントエンド変更に適用します。

- 新規画面、既存画面改善、導線変更
- フロントエンド状態管理や API 利用の追加・変更
- バックエンド依存を伴う UI 実装
- i18n、アクセシビリティ、レスポンシブ対応を含む機能改善

以下は原則として本ワークフローの対象外です。

- 小さな文言修正のみの変更
- 明らかな typo 修正のみの変更
- CI、E2E 基盤、ビルド設定のみの変更

対象外であっても、変更が API や画面挙動に影響する場合は本ワークフローを適用してよいです。

---

## 3. 前提方針

- フロントエンド実装は既存の Nuxt / Nitro / Pinia / Tailwind / PrimeVue 構成を前提とする
- API 契約の正本は `../contract/api-schema.yaml` とする
- REST エンドポイントは `api/endpoints.ts` に集約する
- API 通信は `fetch` を使い、`useFetch` は使用しない
- 既存コンポーネント、composable、store を優先し、不必要な新規抽象化は避ける
- 実装は最小差分を原則とし、無関係なリファクタリングを混ぜない

---

## 4. 役割一覧

| 役割 | 担当 | 主な責務 |
|---|---|---|
| 司令塔 | Feature Orchestrator | 要求整理、段階管理、handoff、差し戻し管理、最終取りまとめ |
| 設計 | System Architect | 最小構成の技術設計、影響範囲整理、API / backend 整合確認 |
| UI/UX | UI/UX Designer | 画面構成、導線、状態設計、レスポンシブ、アクセシビリティ整理 |
| 実装 | Frontend Implementer | 最小差分実装、必要なテスト追加、検証実施 |
| レビュー | Feature Reviewer | 要求適合、規約順守、テスト妥当性、回帰リスク評価 |

---

## 5. 標準フロー

```text
Request / Issue / Spec
  -> Feature Orchestrator
    -> System Architect
      -> UI/UX Designer
        -> Frontend Implementer
          -> Feature Reviewer
            -> Feature Orchestrator summary
```

UI 変更が存在しない場合、`UI/UX Designer` を省略してもよいです。  
バックエンド変更や API 契約変更が必要な場合は、System Architect の段階でその依存を明示し、frontend 単独で閉じる前提にしません。

---

## 6. ステージ定義

### 6.1 Feature Orchestrator

#### 入力

- Issue
- 要件書
- 要求仕様
- ユーザーの自然言語依頼

#### やること

- 要求の要約
- 非対象の明確化
- frontend 単独対応か、backend / contract を跨ぐかの判定
- 実行ステージの決定
- handoff 順序の管理

#### 出力

- Request summary
- Scope and non-goals
- Required stages
- Current stage status
- Blockers or open questions
- Recommended next action

#### 次へ進める条件

- 要求と非対象が読み取れる
- 設計に必要な入力が不足していない
- backend / contract 影響の有無が暫定でも整理されている

#### 差し戻し条件

- 要件が曖昧で受け入れ条件を定義できない
- API 前提が不明
- UI 変更の有無が判断不能

---

### 6.2 System Architect

#### 入力

- Orchestrator の要求整理結果
- 既存 frontend 実装
- 必要に応じて backend 実装
- `../contract/api-schema.yaml`

#### やること

- 最小構成の実装設計
- 影響ファイルの特定
- state / data flow の整理
- API 利用、契約 drift リスク、backend 依存の整理
- 実装順序と acceptance criteria の定義

#### 出力

- Requirement summary
- Non-goals
- Proposed architecture
- Impacted files
- API and backend alignment
- Implementation order
- Acceptance criteria
- Risks and open questions

#### 次へ進める条件

- 実装担当が迷わず着手できる粒度まで構造が整理されている
- API の利用方法が契約に照らして説明できる
- backend / contract 依存がある場合、その事実が明記されている

#### 差し戻し条件

- 要件に対して設計の粒度が粗すぎる
- API レスポンス前提が契約と整合しない
- 新規 abstraction の必要性が説明できない

---

### 6.3 UI/UX Designer

#### 入力

- 要件
- System Architect の設計結果
- 既存画面とコンポーネント
- i18n 辞書

#### やること

- 画面構成と情報階層の定義
- ユーザーフロー、操作導線、状態遷移の定義
- loading / empty / success / error の状態設計
- レスポンシブ、アクセシビリティ、文言設計の整理

#### 出力

- UI objective
- Affected screens and components
- Interaction and state design
- Responsive and accessibility notes
- Copy and i18n notes
- Implementation handoff

#### 次へ進める条件

- 実装担当が画面状態を再解釈せずに組める
- destructive action や validation の見せ方が定義されている
- レスポンシブと a11y の前提が明文化されている

#### 差し戻し条件

- 情報設計が architecture と矛盾する
- UI の都合で API / state の前提を書き換えている
- 主要状態が抜けている

---

### 6.4 Frontend Implementer

#### 入力

- System Architect の設計結果
- UI/UX Designer の handoff
- 既存コードベース

#### やること

- 最小差分での機能実装
- 必要に応じたテスト追加または更新
- i18n、型、レスポンシブ、アクセシビリティの反映
- 変更に見合う最小限の検証実施

#### 出力

- changed files
- tests or checks added and run
- manual verification performed when applicable
- unresolved risks or follow-up items

#### 次へ進める条件

- 要求に対応する実装が完了している
- 必要な検証結果を提示できる
- 設計や UI との差分がある場合、その理由が説明されている

#### 差し戻し条件

- 設計未確定のまま実装判断が必要になった
- UI 仕様の矛盾で画面挙動を決めきれない
- backend / contract 側の不足で frontend 単独では成立しない

---

### 6.5 Feature Reviewer

#### 入力

- 設計結果
- UI 仕様
- 実装コード
- テストと検証結果

#### やること

- 要求適合性の確認
- repository rule 順守確認
- API 契約整合、i18n、a11y、レスポンシブ、回帰リスクの確認
- Must Fix / Should Fix / Nice to Have / Final Verdict の提示

#### 出力

- Must Fix
- Should Fix
- Nice to Have
- Final Verdict

#### 完了条件

- blocking issue の有無が明確
- ship recommendation が明確
- 残リスクが列挙されている

#### 差し戻し条件

- 要求未達
- 規約違反
- 検証不足
- 契約 drift や hidden regression の疑い

---

## 7. API / backend / contract 変更時の分岐

System Architect は、要求を受けた時点で以下を判定します。

| 判定 | 対応 |
|---|---|
| frontend だけで完結 | そのまま UI/UX と実装へ進む |
| backend 実装変更が必要 | backend 依存として明示し、frontend 単独で完了扱いにしない |
| contract 変更が必要 | `../contract/api-schema.yaml` を正本として確認し、contract 変更を前提に計画する |
| frontend 実装が契約から逸脱している | drift として報告し、仕様変更か実装修正かを切り分ける |

API や contract に影響する変更では、以下を最低限確認します。

- `api/endpoints.ts` と利用箇所の整合
- `../contract/api-schema.yaml` の request / response との整合
- frontend 側の画面要件が backend の提供可能範囲に収まっているか

---

## 8. テストと検証の扱い

この repository では、変更内容に応じて検証手段を選びます。

- 既存のテスト可能な seam がある場合は、Vitest による unit / component test を追加または更新する
- UI 中心で自動テストの足場が弱い場合は、無理にテストを量産せず、手動確認手順を明示する
- lint / type check / build は変更リスクに応じて最小限から実行する
- E2E 対象の変更なら、必要に応じて別途 Playwright フローを使う

実装担当は「常に coverage 数値を満たすこと」ではなく、「変更に対して妥当な検証を完了すること」を重視します。

---

## 9. 開始前チェックリスト

Feature Orchestrator は着手前に、最低でも以下を確認します。

| 確認項目 | 内容 |
|---|---|
| 要求の正本 | Issue、要件書、要求仕様、口頭依頼のどれを正本とするか |
| 完了条件 | 完了の判断に必要な受け入れ条件があるか |
| UI 影響 | 新規 UI、既存 UI 改修、文言変更のみ、のどれか |
| API 影響 | 既存 API 利用、未定義 API 依存、contract 変更要否 |
| backend 依存 | backend 側の変更待ちがあるか |
| 検証方針 | 自動テスト、手動確認、E2E 再確認のどれが必要か |
| リスク | 既存画面回帰、i18n、a11y、responsive、認証、権限の懸念 |

この時点で上記の大半が不明な場合は、実装へ進めず要件整理または設計整理へ戻します。

---

## 10. 成果物テンプレート

各ステージの成果物は、最低でも以下を含むことを推奨します。

| ステージ | 最低限の成果物 |
|---|---|
| Orchestrator | 要求要約、非対象、必要ステージ、阻害要因 |
| Architect | 影響範囲、データフロー、API 整合、acceptance criteria |
| UI/UX | 画面状態、導線、文言、a11y / responsive 前提 |
| Implementer | 変更ファイル、検証結果、残リスク |
| Reviewer | Must Fix / Should Fix / Nice to Have / Final Verdict |

実際の feature 文書を作る場合は、`docs/features/_templates/` 配下のひな形を複製して使います。

以下のテンプレートを、そのままベースとして利用してよいです。

### 10.1 Orchestrator テンプレート

```text
Request summary
- 対象:
- 背景:
- 期待される結果:

Scope and non-goals
- 対象範囲:
- 非対象:

Required stages
- Architect: 必須 / 任意
- UI/UX: 必須 / 任意
- Implementer: 必須
- Reviewer: 必須

Current stage status
- 現在ステージ:
- 進行可否:

Blockers or open questions
-

Recommended next action
-
```

### 10.2 Architect テンプレート

```text
Requirement summary
-

Non-goals
-

Proposed architecture
- 入口となる page / component:
- state ownership:
- data flow:
- 既存資産の再利用方針:

Impacted files
-

API and backend alignment
- 使用 API:
- contract 整合:
- backend 依存:
- drift リスク:

Implementation order
1.
2.
3.

Acceptance criteria
-

Risks and open questions
-
```

### 10.3 UI/UX テンプレート

```text
UI objective
-

Affected screens and components
-

Interaction and state design
- 初期表示:
- loading:
- empty:
- success:
- error:
- destructive action:

Responsive and accessibility notes
- mobile / desktop 差分:
- keyboard:
- screen reader:

Copy and i18n notes
- 新規文言:
- 既存文言変更:

Implementation handoff
- 使う既存 component:
- 新規 component 要否:
- 注意点:
```

### 10.4 Implementer テンプレート

```text
Changed files
-

Implementation notes
-

Tests or checks added and run
-

Manual verification performed when applicable
-

Unresolved risks or follow-up items
-
```

### 10.5 Reviewer テンプレート

```text
Must Fix
-

Should Fix
-

Nice to Have
-

Final Verdict
- Ship recommendation:
- Residual risk:
```

---

## 11. 成果物の保存先ポリシー

このワークフローでは、成果物を「長期参照するもの」と「一時的な作業メモ」に分けて扱います。

### 11.1 基本方針

- 長期参照する成果物は `docs/` 配下に保存する
- 一時的な作業メモ、壁打ち、未整理の検討内容は `.codex/` に置く
- 差し戻しメッセージ本文は通常はチャット上の運用メッセージとして扱い、逐一永続化しない
- 差し戻しによって確定した判断、blocker、仕様変更は成果物へ反映して永続化する

### 11.2 推奨保存先

feature ごとの長期成果物は、原則として `docs/features/<feature-slug>/` に保存します。

| 成果物 | 推奨保存先 | 永続化の原則 |
|---|---|---|
| Orchestrator の初期整理 | `docs/features/<feature-slug>/workflow-notes.md` | 複数日にまたがる作業、backend / contract 依存、承認判断がある場合は保存 |
| Architect の設計結果 | `docs/features/<feature-slug>/*-plan.md` または `*-spec.md` | 原則として保存 |
| UI/UX の設計結果 | `docs/features/<feature-slug>/*-spec.md` または `*-notes.md` | 原則として保存 |
| Implementer の検証サマリ | `docs/features/<feature-slug>/implementation-notes.md` | 手動確認手順、既知の制約、残リスクがある場合に保存 |
| Reviewer のレビュー結果 | `docs/features/<feature-slug>/review-notes.md` | Must Fix がある場合、または ship recommendation の根拠を残す必要がある場合は保存 |
| 一時メモ、未確定案 | `.codex/` | 必要時のみ保存 |

`<feature-slug>` は feature 名や issue 名に対応する短い識別子を使います。既存の feature 文書がある場合は、その配下へ追記または関連ファイルを追加します。

利用開始時は、以下の共通ひな形を基に feature ディレクトリを構成します。

- `docs/features/_templates/workflow-notes.md`
- `docs/features/_templates/feature-plan.md`
- `docs/features/_templates/ui-spec.md`
- `docs/features/_templates/implementation-notes.md`
- `docs/features/_templates/review-notes.md`

### 11.3 保存必須のもの

以下はチャットだけで済ませず、原則として永続化します。

- System Architect の最終設計結果
- UI/UX Designer の最終 UI 仕様
- backend / contract 依存が確定した判断
- レビュー段階での Must Fix
- 次回セッションへ持ち越す blocker

### 11.4 保存不要または任意のもの

以下は通常、永続化必須ではありません。

- 軽微な差し戻しメッセージ本文
- 単発セッション内で完結する Orchestrator の進行メッセージ
- git diff から十分に追跡できる単純な実装メモ

ただし、以下のいずれかに当てはまる場合は要点だけ保存します。

- 要件や非対象が変わった
- 実装前提が変わった
- API / backend 依存が新たに判明した
- 次の担当者がその判断を参照しないと再開できない

### 11.5 差し戻し時の永続化ルール

差し戻しメッセージそのものは、通常はチャット上で伝えるだけで構いません。  
ただし差し戻しにより、以下が確定した場合は成果物へ反映します。

- blocker の内容
- 誰に戻すか
- 次に必要な判断または入力
- 仕様、非対象、API 前提の変更点

保存先は、差し戻し対象に最も近い成果物を優先します。

- 要件整理の差し戻し: `workflow-notes.md` または設計書
- 設計差し戻し: `*-plan.md` または `*-spec.md`
- UI 差し戻し: UI 仕様書
- 実装差し戻し: 実装ノートまたは設計書追記
- レビュー差し戻し: `review-notes.md`

---

## 12. 差し戻しメッセージ例

差し戻し時は、何が不足しているかを短く具体的に返すことを推奨します。

### 12.1 Orchestrator から差し戻す場合

```text
現時点では次ステージへ進めません。
理由: 要件の完了条件が不明で、設計対象範囲を固定できません。
不足情報:
-
必要な次アクション:
-
```

### 12.2 Architect から差し戻す場合

```text
現時点では実装設計を確定できません。
理由: API 前提が `../contract/api-schema.yaml` と一致していません。
確認が必要な点:
-
提案:
- contract 修正を行う
- frontend 実装前提を見直す
```

### 12.3 UI/UX から差し戻す場合

```text
現時点では UI 仕様を確定できません。
理由: architecture で state ownership が未確定のため、画面状態を閉じられません。
不足している情報:
-
必要な次アクション:
- architect で state / data flow を再整理する
```

### 12.4 Implementer から差し戻す場合

```text
現時点では安全に実装を進められません。
理由: 設計または UI 仕様に矛盾があり、画面挙動を一意に決められません。
衝突している内容:
-
必要な次アクション:
- architect または UI/UX で仕様を再確定する
```

### 12.5 Reviewer から差し戻す場合

```text
現時点では ship recommendation を出せません。
理由: blocking issue が残っています。
Must Fix:
-
再確認が必要な項目:
-
```

---

## 13. 実運用時の開始テンプレート

Feature Orchestrator を起動する際は、以下のような入力形式を推奨します。

```text
対象: <issue or feature name>
入力資料:
- <issue link or summary>
- <spec or requirement note>

依頼内容:
- 5役ワークフローで feature 開発を開始
- backend / contract 影響があれば明示
- 最終的に設計、UI、実装、レビューの順で進める
```

---

## 14. 今後の拡張候補

- backend / contract 連携時の handoff パターンを別文書へ切り出す
- feature 種別ごとの派生テンプレートを `docs/features/` に追加する

---

## 15. 関連ドキュメント

- `docs/README.md`
- `docs/architecture/overview.md`
- `docs/architecture/e2e-test.md`
- `docs/features/_templates/README.md`
- `docs/features/_templates/workflow-notes.md`
- `docs/features/_templates/feature-plan.md`
- `docs/features/_templates/ui-spec.md`
- `docs/features/_templates/implementation-notes.md`
- `docs/features/_templates/review-notes.md`
- `api/endpoints.ts`
- `../contract/api-schema.yaml`
- `.github/agents/feature-orchestrator.agent.md`
- `.github/agents/system-architect.agent.md`
- `.github/agents/ui-ux-designer.agent.md`
- `.github/agents/frontend-implementer.agent.md`
- `.github/agents/feature-reviewer.agent.md`