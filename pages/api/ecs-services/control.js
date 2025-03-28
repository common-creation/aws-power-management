import { startECSService, stopECSService } from '../../../utils/ecs-operations';

export default async function handler(req, res) {
  // POSTメソッド以外は許可しない
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, accountId, clusterArn, serviceArn } = req.body;
    
    if (!action || !accountId || !clusterArn || !serviceArn) {
      return res.status(400).json({ error: '必須パラメータが不足しています' });
    }
    
    console.log(`API: ${action === 'start' ? 'Starting' : 'Stopping'} ECS service ${serviceArn} in account ${accountId}...`);
    
    let result;
    
    if (action === 'start') {
      // サービスを起動
      result = await startECSService(accountId, clusterArn, serviceArn);
      console.log(`API: Successfully started ECS service: ${serviceArn}`);
    } else if (action === 'stop') {
      // サービスを停止
      result = await stopECSService(accountId, clusterArn, serviceArn);
      console.log(`API: Successfully stopped ECS service: ${serviceArn}`);
    } else {
      return res.status(400).json({ error: '無効なアクションです' });
    }
    
    res.status(200).json({
      message: result.message || `ECSサービスを${action === 'start' ? '起動' : '停止'}しました`
    });
  } catch (error) {
    console.error('API: Error controlling ECS service:', error);
    res.status(500).json({ 
      error: `ECSサービスの${req.body.action === 'start' ? '起動' : '停止'}に失敗しました`, 
      message: error.message 
    });
  }
} 