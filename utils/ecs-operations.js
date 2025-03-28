import { 
  ListClustersCommand, 
  ListServicesCommand,
  DescribeServicesCommand,
  UpdateServiceCommand,
  ListTagsForResourceCommand,
  TagResourceCommand,
  UntagResourceCommand
} from '@aws-sdk/client-ecs';

import { getAwsAccounts, createECSClient } from './aws-accounts';

// 指定したアカウントのECSサービス一覧を取得
export async function getECSServices(accountId) {
  try {
    // アカウント情報を取得
    const accounts = getAwsAccounts();
    console.log(`Getting ECS services for account ID: ${accountId}`);
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      console.error(`Account with ID ${accountId} not found`);
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    console.log(`Found account: ${account.name} (${account.region})`);
    
    // ECSクライアントを作成
    const ecsClient = createECSClient(account);
    
    // クラスター一覧を取得
    const listClustersCommand = new ListClustersCommand({});
    console.log(`Sending ListClustersCommand for account: ${account.name}`);
    const clustersResponse = await ecsClient.send(listClustersCommand);
    
    if (!clustersResponse.clusterArns || clustersResponse.clusterArns.length === 0) {
      console.log(`No ECS clusters found for account: ${account.name}`);
      return [];
    }
    
    console.log(`Found ${clustersResponse.clusterArns.length} clusters for account: ${account.name}`);
    
    const allServices = [];
    
    // 各クラスターからサービスを取得（並列処理）
    const clusterPromises = clustersResponse.clusterArns.map(async (clusterArn) => {
      // クラスター名（ARNの最後の部分）を取得
      const clusterName = clusterArn.split('/').pop() || clusterArn;
      
      // サービス一覧を取得
      const listServicesCommand = new ListServicesCommand({ cluster: clusterArn });
      const servicesResponse = await ecsClient.send(listServicesCommand);
      
      if (!servicesResponse.serviceArns || servicesResponse.serviceArns.length === 0) {
        console.log(`No services found in cluster ${clusterName}`);
        return [];
      }
      
      console.log(`Found ${servicesResponse.serviceArns.length} services in cluster ${clusterName}`);
      
      const clusterServices = [];
      
      // サービスを10個ずつ処理（AWS APIの制限）
      for (let i = 0; i < servicesResponse.serviceArns.length; i += 10) {
        const servicesChunk = servicesResponse.serviceArns.slice(i, i + 10);
        
        // サービスの詳細情報を取得
        const describeServicesCommand = new DescribeServicesCommand({
          cluster: clusterArn,
          services: servicesChunk
        });
        
        const serviceDetailsResponse = await ecsClient.send(describeServicesCommand);
        
        if (!serviceDetailsResponse.services || serviceDetailsResponse.services.length === 0) {
          continue;
        }
        
        // 各サービスの情報を処理
        for (const service of serviceDetailsResponse.services) {
          if (!service.serviceArn) continue;
          
          console.log(`Processing service with ARN: ${service.serviceArn}`);
          let tags = [];
          try {
            // タグ情報を取得
            const listTagsCommand = new ListTagsForResourceCommand({
              resourceArn: service.serviceArn
            });
            
            console.log(`Attempting to get tags for service: ${service.serviceArn}`);
            const tagsResponse = await ecsClient.send(listTagsCommand);
            tags = tagsResponse.tags || [];
          } catch (tagError) {
            console.warn(`Failed to get tags for service ${service.serviceArn}:`, tagError);
            // タグ取得に失敗しても処理は継続
          }
          
          // 前回のdesiredCountを保存しているタグを検索
          const previousDesiredCountTag = tags.find(tag => 
            tag.key === 'ac-cost-saver_previous-desired-count'
          );
          
          // 状態を判断（desiredCount = 0 が停止、それ以外が起動中）
          const state = (service.desiredCount && service.desiredCount > 0) ? 'RUNNING' : 'STOPPED';
          
          clusterServices.push({
            accountId: account.id,
            accountName: account.name,
            region: account.region,
            cluster: clusterName,
            clusterArn,
            serviceArn: service.serviceArn,
            serviceName: service.serviceName || service.serviceArn.split('/').pop() || '',
            desiredCount: service.desiredCount || 0,
            runningCount: service.runningCount || 0,
            pendingCount: service.pendingCount || 0,
            state,
            previousDesiredCount: previousDesiredCountTag && previousDesiredCountTag.value 
              ? parseInt(previousDesiredCountTag.value, 10) 
              : null,
            tags
          });
        }
      }
      
      return clusterServices;
    });
    
    // すべてのクラスターの処理が完了するのを待つ
    const clusterResults = await Promise.all(clusterPromises);
    allServices.push(...clusterResults.flat());
    
    console.log(`Returning ${allServices.length} ECS services for account: ${account.name}`);
    return allServices;
  } catch (error) {
    console.error(`Error getting ECS services for account ${accountId}:`, error);
    throw error;
  }
}

// 全アカウントのECSサービス一覧を取得
export async function getAllECSServices() {
  try {
    const accounts = getAwsAccounts();
    console.log(`Getting ECS services for all ${accounts.length} accounts`);
    
    // 各アカウントごとにサービス取得のプロミスを作成
    const servicesPromises = accounts.map(account => {
      // エラーハンドリングをアカウントごとに行い、1つのアカウントのエラーが全体に影響しないようにする
      return getECSServices(account.id).catch(error => {
        console.error(`Error getting ECS services for account ${account.id} (${account.name}):`, error);
        return []; // エラーの場合は空の配列を返す
      });
    });
    
    // すべてのアカウントからのレスポンスを待機
    const servicesArrays = await Promise.all(servicesPromises);
    
    // すべてのサービスを結合
    const allServices = servicesArrays.flat();
    console.log(`Returning ${allServices.length} ECS services from all accounts`);
    return allServices;
  } catch (error) {
    console.error('Error getting all ECS services:', error);
    throw error;
  }
}

// ECSサービスを起動（desiredCountを以前の値に設定）
export async function startECSService(accountId, clusterArn, serviceArn) {
  try {
    const accounts = getAwsAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    const ecsClient = createECSClient(account);
    
    // サービスの詳細情報を取得
    const describeCommand = new DescribeServicesCommand({
      cluster: clusterArn,
      services: [serviceArn]
    });
    
    const serviceDetails = await ecsClient.send(describeCommand);
    
    if (!serviceDetails.services || serviceDetails.services.length === 0) {
      throw new Error(`Service ${serviceArn} not found in cluster ${clusterArn}`);
    }
    
    // タグ情報を取得
    const listTagsCommand = new ListTagsForResourceCommand({
      resourceArn: serviceArn
    });
    
    const tagsResponse = await ecsClient.send(listTagsCommand);
    const tags = tagsResponse.tags || [];
    
    // 前回のdesiredCountを保存しているタグを検索
    const previousDesiredCountTag = tags.find(tag => 
      tag.key === 'ac-cost-saver_previous-desired-count'
    );
    
    let desiredCount = 1; // デフォルト値として1を設定
    
    if (previousDesiredCountTag && previousDesiredCountTag.value) {
      desiredCount = parseInt(previousDesiredCountTag.value, 10);
      
      // タグを削除
      const untagCommand = new UntagResourceCommand({
        resourceArn: serviceArn,
        tagKeys: ['ac-cost-saver_previous-desired-count']
      });
      
      await ecsClient.send(untagCommand);
    }
    
    // サービスの希望数を更新
    const updateCommand = new UpdateServiceCommand({
      cluster: clusterArn,
      service: serviceArn,
      desiredCount: desiredCount
    });
    
    await ecsClient.send(updateCommand);
    
    return {
      message: `Service ${serviceArn} started with desired count ${desiredCount}`
    };
  } catch (error) {
    console.error(`Error starting ECS service ${serviceArn} in account ${accountId}:`, error);
    throw error;
  }
}

// ECSサービスを停止（desiredCountを0に設定）
export async function stopECSService(accountId, clusterArn, serviceArn) {
  try {
    const accounts = getAwsAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    const ecsClient = createECSClient(account);
    
    // サービスの詳細情報を取得
    const describeCommand = new DescribeServicesCommand({
      cluster: clusterArn,
      services: [serviceArn]
    });
    
    const serviceDetails = await ecsClient.send(describeCommand);
    
    if (!serviceDetails.services || serviceDetails.services.length === 0) {
      throw new Error(`Service ${serviceArn} not found in cluster ${clusterArn}`);
    }
    
    const service = serviceDetails.services[0];
    
    // 現在の希望数が0より大きい場合のみ処理
    if (!service.desiredCount || service.desiredCount <= 0) {
      throw new Error(`Service ${serviceArn} is already stopped`);
    }
    
    // 現在の希望数をタグに保存
    const tagCommand = new TagResourceCommand({
      resourceArn: serviceArn,
      tags: [
        {
          key: 'ac-cost-saver_previous-desired-count',
          value: service.desiredCount.toString()
        }
      ]
    });
    
    await ecsClient.send(tagCommand);
    
    // サービスの希望数を0に設定
    const updateCommand = new UpdateServiceCommand({
      cluster: clusterArn,
      service: serviceArn,
      desiredCount: 0
    });
    
    await ecsClient.send(updateCommand);
    
    return {
      message: `Service ${serviceArn} stopped (previous desired count: ${service.desiredCount})`
    };
  } catch (error) {
    console.error(`Error stopping ECS service ${serviceArn} in account ${accountId}:`, error);
    throw error;
  }
} 