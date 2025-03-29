import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Chip, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Stack,
  InputAdornment,
  useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// サービスの状態に応じた色とラベルを定義
const stateColorMap = {
  'RUNNING': { color: 'success', label: 'running' },
  'STOPPED': { color: 'error', label: 'stopped' },
  'PENDING': { color: 'warning', label: 'modifying' }
};

export default function ECSServiceList({ services, onStart, onStop, isLoading, accounts }) {
  // テーマの取得
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [selectedAccount, setSelectedAccount] = useState(() => {
    const saved = sessionStorage.getItem('ecsServiceList.selectedAccount');
    return saved || 'all';
  });
  const [searchFilter, setSearchFilter] = useState(() => {
    const saved = sessionStorage.getItem('ecsServiceList.searchFilter');
    return saved || '';
  });

  // デバッグ: サービスとアカウント情報を表示
  useEffect(() => {
    console.log("Available ECS services:", services);
    const accountIds = [...new Set(services.map(service => service.accountId))];
    console.log("Unique account IDs from services:", accountIds);
    console.log("All accounts from props:", accounts);
  }, [services, accounts]);

  // フィルター設定をセッションストレージに保存
  useEffect(() => {
    sessionStorage.setItem('ecsServiceList.selectedAccount', selectedAccount);
  }, [selectedAccount]);

  useEffect(() => {
    sessionStorage.setItem('ecsServiceList.searchFilter', searchFilter);
  }, [searchFilter]);

  // アカウントとキーワードでフィルタリングする
  const filteredServices = services
    .filter(service => selectedAccount === 'all' || service.accountId === selectedAccount)
    .filter(service => {
      if (!searchFilter) return true;
      
      const searchLower = searchFilter.toLowerCase();
      return (
        (service.serviceName && service.serviceName.toLowerCase().includes(searchLower)) || 
        (service.cluster && service.cluster.toLowerCase().includes(searchLower))
      );
    });

  // サービスからアカウントリストを作成し、propsから渡されたアカウントと結合
  const serviceAccountIds = [...new Set(services.map(service => service.accountId))];
  
  // サービスから作成したアカウント情報
  const serviceAccounts = serviceAccountIds.map(accountId => {
    const service = services.find(s => s.accountId === accountId);
    return {
      id: accountId,
      name: service ? service.accountName : accountId
    };
  });
  
  // propsから渡されたアカウント情報と結合（重複を排除）
  const allAccounts = [...accounts || []].filter(account => 
    !serviceAccountIds.includes(account.id)
  );
  
  // 最終的なアカウントリスト（サービスがあるアカウント + 他のアカウント）
  const accountOptions = [...serviceAccounts, ...allAccounts];
  
  console.log("Rendered account options:", accountOptions);

  // 検索フィルターのクリア
  const clearSearchFilter = () => {
    setSearchFilter('');
  };

  // サービスがない場合
  if (!services || services.length === 0) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 4,
          bgcolor: isDarkMode ? 'background.paper' : undefined 
        }}
      >
        <Typography variant="body1">
          表示するECSサービスがありません
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
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
              <InputLabel id="ecs-account-select-label">アカウント</InputLabel>
              <Select
                labelId="ecs-account-select-label"
                id="ecs-account-select"
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
              id="ecs-search-filter"
              placeholder="クラスター名またはサービス名で検索"
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

        {filteredServices.length === 0 ? (
          <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
            {selectedAccount === 'all' && !searchFilter
              ? 'ECSサービスがありません。' 
              : searchFilter
                ? `"${searchFilter}" に一致するECSサービスが見つかりません。`
                : `${accountOptions.find(a => a.id === selectedAccount)?.name || selectedAccount} アカウントにECSサービスがありません。`}
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>クラスター</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>サービス名</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>アカウント</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>ステータス</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>希望数</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>実行数</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>保留数</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>アクション</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.map((service) => {
                  const changing = service.desiredCount !== service.runningCount;
                  const state = stateColorMap[changing ? "PENDING" : service.state] || { color: 'default', label: service.state };
                  
                  return (
                    <TableRow key={service.serviceArn} hover>
                      <TableCell>{service.cluster}</TableCell>
                      <TableCell>{service.serviceName}</TableCell>
                      <TableCell>{service.accountName}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={state.label} 
                          color={state.color} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={service.previousDesiredCount ? `以前の希望数: ${service.previousDesiredCount}` : ''}>
                          <span>{service.desiredCount}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">{service.runningCount}</TableCell>
                      <TableCell align="center">{service.pendingCount}</TableCell>
                      <TableCell align="right">
                        <Box>
                          {service.state !== 'RUNNING' && (
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => onStart(service.accountId, service.clusterArn, service.serviceArn)}
                              disabled={isLoading}
                            >
                              <Box sx={{ wordBreak: 'keep-all' }}>
                                起動
                              </Box>
                            </Button>
                          )}
                          {service.state === 'RUNNING' && (
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              startIcon={<StopIcon />}
                              onClick={() => onStop(service.accountId, service.clusterArn, service.serviceArn)}
                              disabled={isLoading}
                            >
                              <Box sx={{ wordBreak: 'keep-all' }}>
                                停止
                              </Box>
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          表示中: {filteredServices.length} / {services.length} ECSサービス
        </Typography>
      </Paper>
    </Box>
  );
} 