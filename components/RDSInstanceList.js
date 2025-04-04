import { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Button,
  Box,
  Stack,
  Tooltip,
  InputAdornment,
  useTheme
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SearchIcon from '@mui/icons-material/Search';
import InstanceStateBadge from './InstanceStateBadge';

const RDSInstanceList = ({ instances, onStart, onStop, isLoading, accounts }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [selectedAccount, setSelectedAccount] = useState(() => {
    const saved = sessionStorage.getItem('rdsInstanceList.selectedAccount');
    return saved || 'all';
  });
  const [copiedText, setCopiedText] = useState('');
  const [searchFilter, setSearchFilter] = useState(() => {
    const saved = sessionStorage.getItem('rdsInstanceList.searchFilter');
    return saved || '';
  });

  // デバッグ: インスタンスとアカウント情報を表示
  useEffect(() => {
    console.log("Available RDS instances:", instances);
    const accountIds = [...new Set(instances.map(instance => instance.accountId))];
    console.log("Unique account IDs from instances:", accountIds);
    console.log("All accounts from props:", accounts);
  }, [instances, accounts]);

  // フィルター設定をセッションストレージに保存
  useEffect(() => {
    sessionStorage.setItem('rdsInstanceList.selectedAccount', selectedAccount);
  }, [selectedAccount]);

  useEffect(() => {
    sessionStorage.setItem('rdsInstanceList.searchFilter', searchFilter);
  }, [searchFilter]);

  // アカウントとキーワードでフィルタリングする
  const filteredInstances = instances
    .filter(instance => selectedAccount === 'all' || instance.accountId === selectedAccount)
    .filter(instance => {
      if (!searchFilter) return true;
      
      const searchLower = searchFilter.toLowerCase();
      return (
        (instance.name && instance.name.toLowerCase().includes(searchLower)) || 
        (instance.instanceId && instance.instanceId.toLowerCase().includes(searchLower))
      );
    });

  // インスタンスからアカウントリストを作成し、propsから渡されたアカウントと結合
  const instanceAccountIds = [...new Set(instances.map(instance => instance.accountId))];
  
  // インスタンスから作成したアカウント情報
  const instanceAccounts = instanceAccountIds.map(accountId => {
    const instance = instances.find(i => i.accountId === accountId);
    return {
      id: accountId,
      name: instance ? instance.accountName : accountId
    };
  });
  
  // propsから渡されたアカウント情報と結合（重複を排除）
  const allAccounts = [...accounts || []].filter(account => 
    !instanceAccountIds.includes(account.id)
  );
  
  // 最終的なアカウントリスト（インスタンスがあるアカウント + 他のアカウント）
  const accountOptions = [...instanceAccounts, ...allAccounts];
  
  console.log("Rendered account options:", accountOptions);

  const copyToClipboard = (text) => {
    const fallbackCopyTextToClipboard = (text) => {
      try {
        // フォールバック方法1: document.execCommand
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // オフスクリーンに配置
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (success) {
          setCopiedText(text);
          setTimeout(() => setCopiedText(''), 2000);
          return true;
        }
        return false;
      } catch (err) {
        console.error('クリップボードへのコピーに失敗しました:', err);
        return false;
      }
    };

    // Modern API (navigator.clipboard)がサポートされているか確認
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedText(text);
          setTimeout(() => setCopiedText(''), 2000);
        })
        .catch(err => {
          console.warn('Clipboard API failed:', err);
          // APIが失敗した場合はフォールバックメソッドを試す
          fallbackCopyTextToClipboard(text);
        });
    } else {
      // Clipboard APIがサポートされていない場合はフォールバックメソッドを使用
      fallbackCopyTextToClipboard(text);
    }
  };

  // 検索フィルターのクリア
  const clearSearchFilter = () => {
    setSearchFilter('');
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 4,
        bgcolor: isDarkMode ? 'background.paper' : undefined 
      }}
    >
      <Stack 
        direction={{ xs: 'column', md: 'row' }}
        spacing={2} 
        sx={{ mb: 3 }}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <Box>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="rds-account-select-label">アカウント</InputLabel>
            <Select
              labelId="rds-account-select-label"
              id="rds-account-select"
              value={selectedAccount}
              label="アカウント"
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <MenuItem value="all">全てのアカウント</MenuItem>
              {accountOptions.map(account => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            id="rds-search-filter"
            placeholder="名前またはIDで検索"
            size="small"
            fullWidth
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchFilter && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={clearSearchFilter}
                    edge="end"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Stack>

      {filteredInstances.length === 0 ? (
        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
          {selectedAccount === 'all' && !searchFilter
            ? 'RDSインスタンスがありません。' 
            : searchFilter
              ? `"${searchFilter}" に一致するRDSインスタンスが見つかりません。`
              : `${accountOptions.find(a => a.id === selectedAccount)?.name || selectedAccount} アカウントにRDSインスタンスがありません。`}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>名前</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>インスタンスID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>アカウント</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>エンジン</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>タイプ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ステータス</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>エンドポイント</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ストレージ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInstances.map((instance) => (
                <TableRow key={`${instance.accountId}-${instance.instanceId}`}>
                  <TableCell>{instance.name}</TableCell>
                  <TableCell>{instance.instanceId}</TableCell>
                  <TableCell>{instance.accountName}</TableCell>
                  <TableCell>{instance.engine}</TableCell>
                  <TableCell>{instance.type}</TableCell>
                  <TableCell>
                    <InstanceStateBadge state={instance.state} />
                  </TableCell>
                  <TableCell>
                    {instance.endpoint ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>{instance.endpoint}</Typography>
                        <Tooltip title={copiedText === instance.endpoint ? "コピーしました" : "エンドポイントをコピー"}>
                          <IconButton 
                            size="small" 
                            onClick={() => copyToClipboard(instance.endpoint)}
                            color={copiedText === instance.endpoint ? "success" : "default"}
                          >
                            {copiedText === instance.endpoint ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{instance.allocatedStorage} GB ({instance.storageType})</TableCell>
                  <TableCell align="center">
                    {instance.state === 'stopped' && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => onStart(instance.accountId, instance.instanceId)}
                        disabled={isLoading}
                      >
                        <Box sx={{ wordBreak: 'keep-all' }}>
                          起動
                        </Box>
                      </Button>
                    )}
                    {instance.state === 'available' && (
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<StopIcon />}
                        onClick={() => onStop(instance.accountId, instance.instanceId)}
                        disabled={isLoading}
                      >
                        <Box sx={{ wordBreak: 'keep-all' }}>
                          停止
                        </Box>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        表示中: {filteredInstances.length} / {instances.length} RDSインスタンス
      </Typography>
    </Paper>
  );
};

export default RDSInstanceList; 