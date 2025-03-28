import { startRDSInstance, stopRDSInstance } from '../../../utils/rds-operations';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, accountId, instanceId } = req.body;
    
    if (!action || !accountId || !instanceId) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        message: 'action, accountId, and instanceId are required' 
      });
    }
    
    let result;
    
    switch (action) {
      case 'start':
        result = await startRDSInstance(accountId, instanceId);
        break;
      case 'stop':
        result = await stopRDSInstance(accountId, instanceId);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid action', 
          message: 'Action must be either "start" or "stop"' 
        });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: `RDS Instance ${instanceId} ${action} request successful`,
      result 
    });
  } catch (error) {
    console.error('Error controlling RDS instance:', error);
    return res.status(500).json({ 
      error: 'Failed to control RDS instance', 
      message: error.message 
    });
  }
} 