# AWS Power Management

複数のAWSアカウントにまたがるリソース(EC2、RDS、ECS)の起動・停止を一元管理するためのWebアプリケーションです。

![アプリケーションスクリーンショット](https://i.imgur.com/xHipOTQ.png)

----

人間の編集ここから

特に断りのない限り、このリポジトリ内のファイルは全てCursorとAnthropic Claude 3.7 Sonnetによって生成されています。

人間の編集ここまで

----


## 機能

- 複数のAWSアカウントを一括管理
- EC2インスタンスの一覧表示、起動、停止
- RDSインスタンスの一覧表示、起動、停止
- ECSサービスの一覧表示、起動、停止
- リソース状態の自動更新（状態変化時は短い間隔で更新）
- アカウント別フィルタリング
- 名前/IDによる検索フィルタリング
- IPアドレスのクリップボードへのコピー
- モバイル対応レスポンシブデザイン

## 技術スタック

- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [Material UI](https://mui.com/) - UIコンポーネントライブラリ
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) - AWSリソース操作

## 環境変数の設定

`.env.local.example` を参考に、`.env.local` ファイルを作成し、AWSアカウント情報を設定してください。

```README.md
# アカウント1
AWS_ACCOUNT_1_NAME=My AWS Account 1
AWS_ACCOUNT_1_REGION=ap-northeast-1
AWS_ACCOUNT_1_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_ACCOUNT_1_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# アカウント2
AWS_ACCOUNT_2_NAME=My AWS Account 2
AWS_ACCOUNT_2_REGION=ap-northeast-1
AWS_ACCOUNT_2_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_ACCOUNT_2_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

必要に応じて、アカウント3、4...と追加できます。

## 必要な権限

このアプリケーションを利用するには、設定したIAMユーザーに以下の権限が必要です：

- EC2: `ec2:DescribeInstances`, `ec2:StartInstances`, `ec2:StopInstances`
- RDS: `rds:DescribeDBInstances`, `rds:StartDBInstance`, `rds:StopDBInstance`
- ECS: `ecs:ListClusters`, `ecs:ListServices`, `ecs:DescribeServices`, `ecs:UpdateService`

## 開発環境での実行

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 本番環境への展開

```bash
# ビルド
npm run build

# 開始
npm start
```

## Dockerでの実行

```bash
# コンテナのビルドと起動
docker compose up -d
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 注意事項

- 本番環境で利用する場合は、セキュリティ対策としてより制限されたIAMポリシーの使用を検討してください。
- 運用環境では、環境変数の管理に注意し、認証情報が漏洩しないようにしてください。 