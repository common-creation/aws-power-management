import { 
  DescribeDBInstancesCommand, 
  StartDBInstanceCommand, 
  StopDBInstanceCommand
} from '@aws-sdk/client-rds';

import { getAwsAccounts, createRDSClient } from './aws-accounts';

// 指定したアカウントのRDSインスタンス一覧を取得
export async function getRDSInstances(accountId) {
  try {
    // アカウント情報を取得
    const accounts = getAwsAccounts();
    console.log(`Getting RDS instances for account ID: ${accountId}`);
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      console.error(`Account with ID ${accountId} not found`);
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    console.log(`Found account: ${account.name} (${account.region})`);
    
    // RDSクライアントを作成
    const rdsClient = createRDSClient(account);
    
    // インスタンス一覧を取得するコマンドを実行
    const command = new DescribeDBInstancesCommand({});
    console.log(`Sending DescribeDBInstancesCommand for account: ${account.name}`);
    const response = await rdsClient.send(command);
    
    // レスポンスから必要な情報を抽出
    const instances = [];
    
    if (response.DBInstances && response.DBInstances.length > 0) {
      console.log(`Found ${response.DBInstances.length} RDS instances for account: ${account.name}`);
      response.DBInstances.forEach(instance => {
        instances.push({
          accountId: account.id,
          accountName: account.name,
          instanceId: instance.DBInstanceIdentifier || '',
          name: instance.DBName || instance.DBInstanceIdentifier || '',
          state: instance.DBInstanceStatus || 'unknown',
          type: instance.DBInstanceClass || '',
          engine: instance.Engine || '',
          endpoint: instance.Endpoint?.Address || '',
          port: instance.Endpoint?.Port || '',
          availabilityZone: instance.AvailabilityZone || '',
          multiAZ: instance.MultiAZ || false,
          storageType: instance.StorageType || '',
          allocatedStorage: instance.AllocatedStorage || 0
        });
      });
    }
    
    console.log(`Returning ${instances.length} RDS instances for account: ${account.name}`);
    return instances;
  } catch (error) {
    console.error(`Error getting RDS instances for account ${accountId}:`, error);
    throw error;
  }
}

// 全アカウントのRDSインスタンス一覧を取得
export async function getAllRDSInstances() {
  try {
    const accounts = getAwsAccounts();
    console.log(`Getting RDS instances for all ${accounts.length} accounts`);
    
    // 各アカウントごとにインスタンス取得のプロミスを作成
    const instancePromises = accounts.map(account => {
      // エラーハンドリングをアカウントごとに行い、1つのアカウントのエラーが全体に影響しないようにする
      return getRDSInstances(account.id).catch(error => {
        console.error(`Error getting RDS instances for account ${account.id} (${account.name}):`, error);
        return []; // エラーの場合は空の配列を返す
      });
    });
    
    // すべてのアカウントからのレスポンスを待機
    const instancesArrays = await Promise.all(instancePromises);
    
    // すべてのインスタンスを結合
    const allInstances = instancesArrays.flat();
    console.log(`Returning ${allInstances.length} RDS instances from all accounts`);
    return allInstances;
  } catch (error) {
    console.error('Error getting all RDS instances:', error);
    throw error;
  }
}

// RDSインスタンスを起動
export async function startRDSInstance(accountId, instanceId) {
  try {
    const accounts = getAwsAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    const rdsClient = createRDSClient(account);
    
    const command = new StartDBInstanceCommand({
      DBInstanceIdentifier: instanceId
    });
    
    const response = await rdsClient.send(command);
    return response;
  } catch (error) {
    console.error(`Error starting RDS instance ${instanceId} in account ${accountId}:`, error);
    throw error;
  }
}

// RDSインスタンスを停止
export async function stopRDSInstance(accountId, instanceId) {
  try {
    const accounts = getAwsAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    const rdsClient = createRDSClient(account);
    
    const command = new StopDBInstanceCommand({
      DBInstanceIdentifier: instanceId
    });
    
    const response = await rdsClient.send(command);
    return response;
  } catch (error) {
    console.error(`Error stopping RDS instance ${instanceId} in account ${accountId}:`, error);
    throw error;
  }
} 