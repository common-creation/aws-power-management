import { 
  DescribeInstancesCommand, 
  StartInstancesCommand, 
  StopInstancesCommand
} from '@aws-sdk/client-ec2';

import { getAwsAccounts, createEC2Client } from './aws-accounts';

// 指定したアカウントのEC2インスタンス一覧を取得
export async function getEC2Instances(accountId) {
  try {
    // アカウント情報を取得
    const accounts = getAwsAccounts();
    console.log(`Getting EC2 instances for account ID: ${accountId}`);
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      console.error(`Account with ID ${accountId} not found`);
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    console.log(`Found account: ${account.name} (${account.region})`);
    
    // EC2クライアントを作成
    const ec2Client = createEC2Client(account);
    
    // インスタンス一覧を取得するコマンドを実行
    const command = new DescribeInstancesCommand({});
    console.log(`Sending DescribeInstancesCommand for account: ${account.name}`);
    const response = await ec2Client.send(command);
    
    // レスポンスから必要な情報を抽出
    const instances = [];
    
    if (response.Reservations) {
      console.log(`Found ${response.Reservations.length} reservations for account: ${account.name}`);
      response.Reservations.forEach(reservation => {
        if (reservation.Instances) {
          console.log(`Found ${reservation.Instances.length} instances in reservation`);
          reservation.Instances.forEach(instance => {
            // インスタンスの名前タグを取得
            let name = '';
            if (instance.Tags) {
              const nameTag = instance.Tags.find(tag => tag.Key === 'Name');
              if (nameTag) {
                name = nameTag.Value || '';
              }
            }
            
            instances.push({
              accountId: account.id,
              accountName: account.name,
              instanceId: instance.InstanceId || '',
              name: name || instance.InstanceId || '',
              state: instance.State?.Name || 'unknown',
              type: instance.InstanceType || '',
              publicIp: instance.PublicIpAddress || '',
              privateIp: instance.PrivateIpAddress || '',
              launchTime: instance.LaunchTime,
            });
          });
        }
      });
    }
    
    console.log(`Returning ${instances.length} instances for account: ${account.name}`);
    return instances;
  } catch (error) {
    console.error(`Error getting EC2 instances for account ${accountId}:`, error);
    throw error;
  }
}

// 全アカウントのEC2インスタンス一覧を取得
export async function getAllEC2Instances() {
  try {
    const accounts = getAwsAccounts();
    console.log(`Getting EC2 instances for all ${accounts.length} accounts`);
    
    // 各アカウントごとにインスタンス取得のプロミスを作成
    const instancePromises = accounts.map(account => {
      // エラーハンドリングをアカウントごとに行い、1つのアカウントのエラーが全体に影響しないようにする
      return getEC2Instances(account.id).catch(error => {
        console.error(`Error getting instances for account ${account.id} (${account.name}):`, error);
        return []; // エラーの場合は空の配列を返す
      });
    });
    
    // すべてのアカウントからのレスポンスを待機
    const instancesArrays = await Promise.all(instancePromises);
    
    // すべてのインスタンスを結合
    const allInstances = instancesArrays.flat();
    console.log(`Returning ${allInstances.length} instances from all accounts`);
    return allInstances;
  } catch (error) {
    console.error('Error getting all EC2 instances:', error);
    throw error;
  }
}

// EC2インスタンスを起動
export async function startEC2Instance(accountId, instanceId) {
  try {
    const accounts = getAwsAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    const ec2Client = createEC2Client(account);
    
    const command = new StartInstancesCommand({
      InstanceIds: [instanceId]
    });
    
    const response = await ec2Client.send(command);
    return response;
  } catch (error) {
    console.error(`Error starting EC2 instance ${instanceId} in account ${accountId}:`, error);
    throw error;
  }
}

// EC2インスタンスを停止
export async function stopEC2Instance(accountId, instanceId) {
  try {
    const accounts = getAwsAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    const ec2Client = createEC2Client(account);
    
    const command = new StopInstancesCommand({
      InstanceIds: [instanceId]
    });
    
    const response = await ec2Client.send(command);
    return response;
  } catch (error) {
    console.error(`Error stopping EC2 instance ${instanceId} in account ${accountId}:`, error);
    throw error;
  }
} 