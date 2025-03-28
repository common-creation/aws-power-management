import { EC2Client } from '@aws-sdk/client-ec2';
import { RDSClient } from '@aws-sdk/client-rds';
import { ECSClient } from '@aws-sdk/client-ecs';

// 環境変数からAWSアカウント情報を取得する関数
export function getAwsAccounts() {
  const accounts = [];
  
  // デバッグ: 環境変数の読み込み確認
  console.log('ENV keys:', Object.keys(process.env).filter(key => key.startsWith('AWS_ACCOUNT_')));
  
  // 環境変数をループして、パターンに一致するキーを探す
  Object.keys(process.env).forEach(key => {
    // AWS_ACCOUNT_X_NAME という形式のキーを探す
    if (key.match(/^AWS_ACCOUNT_\d+_NAME$/)) {
      const match = key.match(/\d+/);
      if (!match) return;
      
      const accountIndex = match[0];
      
      // 各アカウントに必要な情報を取得
      let name = process.env[`AWS_ACCOUNT_${accountIndex}_NAME`] || '';
      const region = process.env[`AWS_ACCOUNT_${accountIndex}_REGION`];
      const accessKeyId = process.env[`AWS_ACCOUNT_${accountIndex}_ACCESS_KEY_ID`];
      const secretAccessKey = process.env[`AWS_ACCOUNT_${accountIndex}_SECRET_ACCESS_KEY`];
      
      // デバッグ: アカウント情報をログに出力
      console.log(`Processing account ${accountIndex}:`, { 
        name,
        region: region ? '✓' : '✗', 
        accessKeyId: accessKeyId ? '✓' : '✗', 
        secretAccessKey: secretAccessKey ? '✓' : '✗' 
      });

      
      // すべての情報が揃っている場合のみアカウントを追加
      if (name && region && accessKeyId && secretAccessKey) {
        accounts.push({
          id: accountIndex,
          name,
          region,
          credentials: {
            accessKeyId,
            secretAccessKey
          }
        });
      } else {
        console.log(`Account ${accountIndex} is missing required information.`);
      }
    }
  });
  
  console.log(`Total accounts found: ${accounts.length}`);
  
  return accounts;
}

// EC2クライアントを作成する関数
export function createEC2Client(accountInfo) {
  return new EC2Client({
    region: accountInfo.region,
    credentials: {
      accessKeyId: accountInfo.credentials.accessKeyId,
      secretAccessKey: accountInfo.credentials.secretAccessKey
    }
  });
}

// RDSクライアントを作成する関数
export function createRDSClient(accountInfo) {
  return new RDSClient({
    region: accountInfo.region,
    credentials: {
      accessKeyId: accountInfo.credentials.accessKeyId,
      secretAccessKey: accountInfo.credentials.secretAccessKey
    }
  });
}

// ECSクライアントを作成する関数
export function createECSClient(accountInfo) {
  return new ECSClient({
    region: accountInfo.region,
    credentials: {
      accessKeyId: accountInfo.credentials.accessKeyId,
      secretAccessKey: accountInfo.credentials.secretAccessKey
    }
  });
}

// クライアント側で使用するために機密情報を除外したアカウント情報を返す
export function getClientSideAccounts() {
  const accounts = getAwsAccounts();
  
  // クライアント側に送信するために、機密情報を削除
  return accounts.map(account => ({
    id: account.id,
    name: account.name,
    region: account.region
  }));
} 