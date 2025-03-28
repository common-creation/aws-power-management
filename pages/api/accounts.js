import { getClientSideAccounts } from '../../utils/aws-accounts';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // クライアント側で使用するための安全なアカウント情報を取得
    const accounts = getClientSideAccounts();
    
    // デバッグ: 取得したアカウント情報をログに出力
    console.log('Retrieved accounts:', JSON.stringify(accounts, null, 2));
    
    return res.status(200).json({ accounts });
  } catch (error) {
    console.error('Error getting AWS accounts:', error);
    return res.status(500).json({ error: 'Failed to get AWS accounts' });
  }
} 