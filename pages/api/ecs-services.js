import { getAllECSServices } from '../../utils/ecs-operations';

export default async function handler(req, res) {
  try {
    console.log('API: Fetching all ECS services...');
    
    // 全アカウントのECSサービス一覧を取得
    const services = await getAllECSServices();
    
    console.log(`API: Successfully fetched ${services.length} ECS services`);
    
    // 正常なレスポンスを返す
    res.status(200).json({ services });
  } catch (error) {
    console.error('API: Error fetching ECS services:', error);
    res.status(500).json({ 
      error: 'ECSサービス一覧の取得に失敗しました', 
      message: error.message 
    });
  }
} 