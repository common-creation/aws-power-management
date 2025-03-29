import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Alert, 
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ComputerIcon from '@mui/icons-material/Computer';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import AppsIcon from '@mui/icons-material/Apps';
import Header from '../components/Header';
import Loading from '../components/Loading';
import InstanceList from '../components/InstanceList';
import RDSInstanceList from '../components/RDSInstanceList';
import ECSServiceList from '../components/ECSServiceList';

// コンポーネント外でタイマーIDを管理
let autoRefreshTimerId = null;
// 最後のアクション時間をコンポーネント外で管理
let lastActionTimestamp = 0;

// ドロワーの幅
const DRAWER_WIDTH = 240;

export default function Home() {
  const [instances, setInstances] = useState([]);
  const [rdsInstances, setRDSInstances] = useState([]);
  const [ecsServices, setECSServices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  // リンターエラーを回避するため、lastActionTimeをStateから除外し、代わりにフラグを使用
  const [recentActionFlag, setRecentActionFlag] = useState(false);
  // 次の更新までの秒数をカウントダウンするためのステート
  const [countdown, setCountdown] = useState(0);
  // カウントダウンタイマーのIDをrefで管理（JavaScript環境用）
  // @ts-ignore - NodeJS.Timeoutをnullに代入するエラーを無視
  const countdownTimerRef = useRef(null);
  // アクティブなセクション
  const [activeSection, setActiveSection] = useState('ec2');
  
  // レスポンシブ対応のためのメディアクエリ
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // モバイル用ドロワーの状態
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // テーマモードの取得（ダークモードかどうか）
  const isDarkMode = theme.palette.mode === 'dark';

  // アカウント情報を取得
  const fetchAccounts = async () => {
    try {
      console.log('Fetching accounts...');
      const response = await fetch('/api/accounts');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'アカウント情報の取得に失敗しました');
      }
      
      console.log('Accounts fetched successfully:', data.accounts);
      setAccounts(data.accounts);
      return data.accounts;
    } catch (err) {
      console.error('Error fetching accounts:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('アカウント情報の取得に失敗しました');
      }
      return [];
    }
  };

  // インスタンス一覧を取得
  const fetchInstances = async () => {
    setLoading(true);
    try {
      console.log('Fetching instances...');
      const response = await fetch('/api/instances');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'インスタンス情報の取得に失敗しました');
      }
      
      console.log('Instances fetched successfully:', data.instances);
      setInstances(data.instances);
      setError('');
    } catch (err) {
      console.error('Error fetching instances:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('インスタンス情報の取得に失敗しました');
      }
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  // RDSインスタンス一覧を取得
  const fetchRDSInstances = async () => {
    setLoading(true);
    try {
      console.log('Fetching RDS instances...');
      const response = await fetch('/api/rds-instances');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'RDSインスタンス情報の取得に失敗しました');
      }
      
      console.log('RDS Instances fetched successfully:', data.instances);
      setRDSInstances(data.instances);
      setError('');
    } catch (err) {
      console.error('Error fetching RDS instances:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('RDSインスタンス情報の取得に失敗しました');
      }
      setRDSInstances([]);
    } finally {
      setLoading(false);
    }
  };

  // ECSサービス一覧を取得
  const fetchECSServices = async () => {
    setLoading(true);
    try {
      console.log('Fetching ECS services...');
      const response = await fetch('/api/ecs-services');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'ECSサービス情報の取得に失敗しました');
      }
      
      console.log('ECS Services fetched successfully:', data.services);
      setECSServices(data.services);
      setError('');
    } catch (err) {
      console.error('Error fetching ECS services:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ECSサービス情報の取得に失敗しました');
      }
      setECSServices([]);
    } finally {
      setLoading(false);
    }
  };

  // インスタンスの遷移状態をチェックする関数
  const checkTransitionalInstances = (instancesList) => {
    if (!instancesList || instancesList.length === 0) return false;
    
    return instancesList.some(instance => {
      if (!instance || typeof instance !== 'object') return false;
      return instance.state === 'pending' || 
             instance.state === 'stopping' || 
             instance.state === 'shutting-down' ||
             instance.state === 'starting' ||
             instance.state === 'modifying';
    });
  };

  // アクション（起動/停止）後の経過時間をチェック（直近10秒以内のアクションを対象）
  const isRecentAction = () => {
    if (lastActionTimestamp === 0) return false;
    
    const now = Date.now();
    const elapsedSeconds = (now - lastActionTimestamp) / 1000;
    return elapsedSeconds < 10; // 10秒以内のアクションを「最近」とみなす
  };

  // 最近のアクションフラグを更新する関数
  const updateRecentActionFlag = () => {
    setRecentActionFlag(isRecentAction());
  };

  // 適切な更新間隔を決定する関数
  const determineRefreshInterval = (instancesList) => {
    // 直近のアクションがあれば3秒間隔で更新
    if (isRecentAction()) {
      return 3000; // 3秒間隔
    }
    
    // 遷移中のインスタンスがある場合は5秒間隔、それ以外は60秒間隔
    return checkTransitionalInstances(instancesList) ? 5000 : 60000;
  };

  // カウントダウンタイマーを開始する関数
  const startCountdown = (interval) => {
    // 既存のカウントダウンタイマーをクリア
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // 初期カウントダウン値を秒単位で設定
    const initialCount = Math.floor(interval / 1000);
    setCountdown(initialCount);

    // カウントダウンタイマーを設定
    const timerId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return initialCount; // 0になったら再び初期値に戻す
        }
        return prev - 1;
      });
    }, 1000);

    // refにタイマーIDを保存
    // @ts-ignore - NodeJS.Timeoutをnullに代入するエラーを無視
    countdownTimerRef.current = timerId;
  };

  // 自動更新を設定する関数
  const setupAutoRefresh = () => {
    // 既存のタイマーをクリア
    if (autoRefreshTimerId) {
      clearInterval(autoRefreshTimerId);
      autoRefreshTimerId = null;
    }

    if (!autoRefreshActive) {
      // 自動更新が無効の場合はカウントダウンタイマーも停止
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(0);
      }
      return;
    }

    // 最近のアクションフラグを更新
    updateRecentActionFlag();

    // 現在のセクションに応じたインスタンスリストを取得
    const currentInstances = activeSection === 'ec2' ? instances : 
                            activeSection === 'rds' ? rdsInstances : ecsServices;
    
    // インスタンスの状態に基づいて更新間隔を決定
    const interval = determineRefreshInterval(currentInstances);
    
    // カウントダウンタイマーを開始
    startCountdown(interval);
    
    // 新しいタイマーを設定
    autoRefreshTimerId = setInterval(() => {
      if (!loading && !actionLoading) {
        console.log(`Auto-refreshing ${activeSection} instances (interval: ${interval}ms)...`);
        // 現在のセクションに応じたデータを更新
        if (activeSection === 'ec2') {
          fetchInstances();
        } else if (activeSection === 'rds') {
          fetchRDSInstances();
        } else if (activeSection === 'ecs') {
          fetchECSServices();
        }
        // 各更新ごとにフラグを更新
        updateRecentActionFlag();
      }
    }, interval);
    
    console.log(`Auto-refresh timer set: ${interval}ms`);
  };

  // 初回読み込み時にアカウント情報とアクティブなセクションのインスタンス一覧を取得
  useEffect(() => {
    const initializeData = async () => {
      // まずアカウント情報を取得し、その後アクティブなセクションに応じたインスタンス情報を取得
      await fetchAccounts();
      
      // 選択されているセクションに応じたデータだけを取得
      if (activeSection === 'ec2') {
        await fetchInstances();
      } else if (activeSection === 'rds') {
        await fetchRDSInstances();
      } else if (activeSection === 'ecs') {
        await fetchECSServices();
      }
    };
    
    initializeData();
    
    // クリーンアップ関数
    return () => {
      if (autoRefreshTimerId) {
        clearInterval(autoRefreshTimerId);
        autoRefreshTimerId = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  // インスタンス情報や最終アクション時間の変更に応じて自動更新を再設定
  useEffect(() => {
    setupAutoRefresh();
    
    // クリーンアップ関数
    return () => {
      if (autoRefreshTimerId) {
        clearInterval(autoRefreshTimerId);
        autoRefreshTimerId = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [instances, rdsInstances, ecsServices, recentActionFlag, autoRefreshActive, activeSection]);

  // 手動更新ボタンのクリックハンドラ
  const handleRefresh = async () => {
    // 現在のセクションに応じて適切なデータを更新
    if (activeSection === 'ec2') {
      await fetchInstances();
    } else if (activeSection === 'rds') {
      await fetchRDSInstances();
    } else if (activeSection === 'ecs') {
      await fetchECSServices();
    }
  };

  // 自動更新切り替えハンドラ
  const toggleAutoRefresh = () => {
    setAutoRefreshActive(!autoRefreshActive);
  };

  // アクション実行時に時間を記録する関数
  const recordActionTime = () => {
    lastActionTimestamp = Date.now();
    // フラグを更新して自動更新のインターバルを調整
    updateRecentActionFlag();
  };

  // EC2インスタンス起動
  const handleStartInstance = async (accountId, instanceId) => {
    setActionLoading(true);
    try {
      // アクション実行時の時間を記録
      recordActionTime();
      
      console.log(`Starting instance ${instanceId} in account ${accountId}...`);
      const response = await fetch('/api/instances/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          accountId,
          instanceId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'インスタンスの起動に失敗しました');
      }
      
      console.log('Instance start initiated successfully');
      
      // 短い遅延後に最新の状態を反映するためにインスタンス情報を更新
      setTimeout(() => {
        fetchInstances();
      }, 1000);
      
    } catch (err) {
      console.error('Error starting instance:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('インスタンスの起動に失敗しました');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // EC2インスタンス停止
  const handleStopInstance = async (accountId, instanceId) => {
    setActionLoading(true);
    try {
      // アクション実行時の時間を記録
      recordActionTime();
      
      console.log(`Stopping instance ${instanceId} in account ${accountId}...`);
      const response = await fetch('/api/instances/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          accountId,
          instanceId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'インスタンスの停止に失敗しました');
      }
      
      console.log('Instance stop initiated successfully');
      
      // 短い遅延後に最新の状態を反映するためにインスタンス情報を更新
      setTimeout(() => {
        fetchInstances();
      }, 1000);
      
    } catch (err) {
      console.error('Error stopping instance:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('インスタンスの停止に失敗しました');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // RDSインスタンス起動
  const handleStartRDSInstance = async (accountId, instanceId) => {
    setActionLoading(true);
    try {
      // アクション実行時の時間を記録
      recordActionTime();
      
      console.log(`Starting RDS instance ${instanceId} in account ${accountId}...`);
      const response = await fetch('/api/rds-instances/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          accountId,
          instanceId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'RDSインスタンスの起動に失敗しました');
      }
      
      console.log('RDS Instance start initiated successfully');
      
      // 短い遅延後に最新の状態を反映するためにインスタンス情報を更新
      setTimeout(() => {
        fetchRDSInstances();
      }, 1000);
      
    } catch (err) {
      console.error('Error starting RDS instance:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('RDSインスタンスの起動に失敗しました');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // RDSインスタンス停止
  const handleStopRDSInstance = async (accountId, instanceId) => {
    setActionLoading(true);
    try {
      // アクション実行時の時間を記録
      recordActionTime();
      
      console.log(`Stopping RDS instance ${instanceId} in account ${accountId}...`);
      const response = await fetch('/api/rds-instances/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          accountId,
          instanceId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'RDSインスタンスの停止に失敗しました');
      }
      
      console.log('RDS Instance stop initiated successfully');
      
      // 短い遅延後に最新の状態を反映するためにインスタンス情報を更新
      setTimeout(() => {
        fetchRDSInstances();
      }, 1000);
      
    } catch (err) {
      console.error('Error stopping RDS instance:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('RDSインスタンスの停止に失敗しました');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ECSサービス起動
  const handleStartECSService = async (accountId, clusterArn, serviceArn) => {
    setActionLoading(true);
    try {
      // アクション実行時の時間を記録
      recordActionTime();
      
      console.log(`Starting ECS service ${serviceArn} in account ${accountId}...`);
      const response = await fetch('/api/ecs-services/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          accountId,
          clusterArn,
          serviceArn,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'ECSサービスの起動に失敗しました');
      }
      
      console.log('ECS service start initiated successfully');
      
      // 短い遅延後に最新の状態を反映するためにサービス情報を更新
      setTimeout(() => {
        fetchECSServices();
      }, 1000);
      
    } catch (err) {
      console.error('Error starting ECS service:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ECSサービスの起動に失敗しました');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ECSサービス停止
  const handleStopECSService = async (accountId, clusterArn, serviceArn) => {
    setActionLoading(true);
    try {
      // アクション実行時の時間を記録
      recordActionTime();
      
      console.log(`Stopping ECS service ${serviceArn} in account ${accountId}...`);
      const response = await fetch('/api/ecs-services/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          accountId,
          clusterArn,
          serviceArn,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'ECSサービスの停止に失敗しました');
      }
      
      console.log('ECS service stop initiated successfully');
      
      // 短い遅延後に最新の状態を反映するためにサービス情報を更新
      setTimeout(() => {
        fetchECSServices();
      }, 1000);
      
    } catch (err) {
      console.error('Error stopping ECS service:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ECSサービスの停止に失敗しました');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // セクション変更ハンドラ
  const handleSectionChange = (section) => {
    setActiveSection(section);
    
    // セクション変更時にsessionStorageの検索条件をリセット
    sessionStorage.removeItem('instanceList.searchFilter');
    sessionStorage.removeItem('instanceList.selectedAccount');
    sessionStorage.removeItem('rdsInstanceList.searchFilter');
    sessionStorage.removeItem('rdsInstanceList.selectedAccount');
    sessionStorage.removeItem('ecsServiceList.searchFilter');
    sessionStorage.removeItem('ecsServiceList.selectedAccount');
    
    // セクション変更時にそのセクションのデータを取得
    if (section === 'ec2') {
      fetchInstances();
    } else if (section === 'rds') {
      fetchRDSInstances();
    } else if (section === 'ecs') {
      fetchECSServices();
    }
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // メニュー項目のレンダリング
  const renderMenuItems = () => {
    return (
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={activeSection === 'ec2'} 
            onClick={() => handleSectionChange('ec2')}
          >
            <ListItemIcon>
              <ComputerIcon color={activeSection === 'ec2' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="EC2インスタンス" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            selected={activeSection === 'rds'} 
            onClick={() => handleSectionChange('rds')}
          >
            <ListItemIcon>
              <StorageIcon color={activeSection === 'rds' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="RDSインスタンス" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            selected={activeSection === 'ecs'} 
            onClick={() => handleSectionChange('ecs')}
          >
            <ListItemIcon>
              <AppsIcon color={activeSection === 'ecs' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="ECSサービス" />
          </ListItemButton>
        </ListItem>

        <Divider sx={{ my: 1 }} />

        <ListItem disablePadding>
          <ListItemButton onClick={handleRefresh} disabled={loading || actionLoading}>
            <ListItemIcon>
              <RefreshIcon />
            </ListItemIcon>
            <ListItemText primary="更新" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton onClick={toggleAutoRefresh} disabled={loading || actionLoading}>
            <ListItemIcon>
              <SettingsIcon color={autoRefreshActive ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {autoRefreshActive ? '自動更新 オン' : '自動更新 オフ'}
                  {autoRefreshActive && countdown > 0 && (
                    <Typography 
                      component="span" 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ ml: 1 }}
                    >
                      ({countdown}秒)
                    </Typography>
                  )}
                </Box>
              } 
            />
          </ListItemButton>
        </ListItem>
      </List>
    );
  };

  // モバイル用Headerの修正
  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100%',
      bgcolor: 'background.default' 
    }}>
      <Head>
        <title>AWS Power Management</title>
        <meta name="description" content="AWS EC2インスタンスとRDSインスタンスの電源管理ツール" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header onMenuClick={handleDrawerToggle} isMobile={isMobile} />

      {/* サイドバー（デスクトップ） */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: DRAWER_WIDTH, 
              boxSizing: 'border-box',
              top: 64, // Headerの高さ
              height: 'calc(100% - 64px)'
            },
          }}
        >
          {renderMenuItems()}
        </Drawer>
      )}

      {/* サイドバー（モバイル） */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {renderMenuItems()}
        </Drawer>
      )}

      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: 'background.default'
          // p: 3,
          // ml: isMobile ? 0 : `${DRAWER_WIDTH}px`,
          // width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` } 
        }}
      >
        <Toolbar /> {/* ヘッダー分の余白 */}

        <Container maxWidth="xl" sx={{ mt: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* モバイル用の更新ボタン表示 */}
          {isMobile && (
            <Box sx={{ display: 'flex', mb: 2 }}>
              <Button 
                variant="contained" 
                onClick={handleRefresh} 
                startIcon={<RefreshIcon />}
                disabled={loading || actionLoading}
                sx={{ mr: 1 }}
              >
                更新
              </Button>
              <Button 
                variant={autoRefreshActive ? "contained" : "outlined"} 
                color={autoRefreshActive ? "primary" : "secondary"}
                onClick={toggleAutoRefresh}
                disabled={loading || actionLoading}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                {autoRefreshActive ? '自動更新 オン' : '自動更新 オフ'}
                {autoRefreshActive && countdown > 0 && (
                  <Typography 
                    component="span" 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ ml: 1, bgcolor: 'rgba(0,0,0,0.1)', px: 0.5, borderRadius: 1 }}
                  >
                    {countdown}秒
                  </Typography>
                )}
              </Button>
            </Box>
          )}

          {/* セクションのタイトル */}
          <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
            {activeSection === 'ec2' ? 'EC2インスタンス' : 
             activeSection === 'rds' ? 'RDSインスタンス' : 'ECSサービス'}
          </Typography>

          {loading ? (
            <Loading />
          ) : (
            <>
              {activeSection === 'ec2' && (
                <InstanceList 
                  instances={instances} 
                  onStart={handleStartInstance} 
                  onStop={handleStopInstance} 
                  isLoading={actionLoading}
                  accounts={accounts}
                />
              )}
              
              {activeSection === 'rds' && (
                <RDSInstanceList 
                  instances={rdsInstances} 
                  onStart={handleStartRDSInstance} 
                  onStop={handleStopRDSInstance} 
                  isLoading={actionLoading}
                  accounts={accounts}
                />
              )}

              {activeSection === 'ecs' && (
                <ECSServiceList 
                  services={ecsServices} 
                  onStart={handleStartECSService} 
                  onStop={handleStopECSService} 
                  isLoading={actionLoading}
                  accounts={accounts}
                />
              )}
            </>
          )}
        </Container>
      </Box>
    </Box>
  );
} 