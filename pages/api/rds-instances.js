import { getAllRDSInstances, getRDSInstances } from '../../utils/rds-operations';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountId } = req.query;
    
    let instances;
    
    // アカウントIDが指定されている場合は、そのアカウントのインスタンスのみを取得
    if (accountId) {
      instances = await getRDSInstances(accountId);
    } else {
      // アカウントIDが指定されていない場合は、すべてのアカウントのインスタンスを取得
      instances = await getAllRDSInstances();
    }
    
    return res.status(200).json({ instances });
  } catch (error) {
    console.error('Error getting RDS instances:', error);
    return res.status(500).json({ error: 'Failed to get RDS instances', message: error.message });
  }
} 