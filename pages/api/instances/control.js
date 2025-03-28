import { startEC2Instance, stopEC2Instance } from '../../../utils/ec2-operations';

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
        result = await startEC2Instance(accountId, instanceId);
        break;
      case 'stop':
        result = await stopEC2Instance(accountId, instanceId);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid action', 
          message: 'Action must be either "start" or "stop"' 
        });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: `Instance ${instanceId} ${action} request successful`,
      result 
    });
  } catch (error) {
    console.error('Error controlling EC2 instance:', error);
    return res.status(500).json({ 
      error: 'Failed to control EC2 instance', 
      message: error.message 
    });
  }
} 