import Link from 'next/link';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  MenuItem,
  Menu,
  FormControl,
  Select,
  InputLabel,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useContext } from 'react';
import { ThemeContext, THEME_MODES } from '../pages/_app';

const Header = ({ onMenuClick, isMobile }) => {
  // テーマコンテキストからモードと設定関数を取得
  const { mode, setMode } = useContext(ThemeContext);

  const handleThemeChange = (event) => {
    setMode(event.target.value);
  };

  // テーマアイコンを選択
  const getThemeIcon = () => {
    switch (mode) {
      case THEME_MODES.LIGHT:
        return <Brightness7Icon />;
      case THEME_MODES.DARK:
        return <Brightness4Icon />;
      default:
        return <SettingsBrightnessIcon />;
    }
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Box>
        <Toolbar disableGutters>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="メニューを開く"
              edge="start"
              onClick={onMenuClick}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ ml: 2 }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', cursor: 'pointer' }}>
                AWS Power Management
              </Typography>
            </Link>
          </Box>
          
          {/* スペースを作成して右端にセレクトボックスを配置 */}
          <Box sx={{ flexGrow: 1 }} />
          
          {/* テーマ切替ドロップダウン */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Tooltip title="テーマ設定">
              <IconButton color="inherit" sx={{ mr: isMobile ? 0.5 : 1 }}>
                {getThemeIcon()}
              </IconButton>
            </Tooltip>
            <FormControl variant="standard" size="small" sx={{ minWidth: isMobile ? 80 : 120 }}>
              <Select
                value={mode}
                onChange={handleThemeChange}
                sx={{ 
                  color: 'inherit',
                  '.MuiSelect-icon': { color: 'inherit' },
                  '.MuiInput-underline:before': { borderBottomColor: 'rgba(255, 255, 255, 0.42)' },
                  '.MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(255, 255, 255, 0.87)' },
                  fontSize: isMobile ? '0.8rem' : 'inherit'
                }}
              >
                <MenuItem value={THEME_MODES.SYSTEM}>
                  {isMobile ? 'システム' : 'システム設定'}
                </MenuItem>
                <MenuItem value={THEME_MODES.LIGHT}>
                  {isMobile ? 'ライト' : 'ライトモード'}
                </MenuItem>
                <MenuItem value={THEME_MODES.DARK}>
                  {isMobile ? 'ダーク' : 'ダークモード'}
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Toolbar>
      </Box>
    </AppBar>
  );
};

// デフォルトのプロップス値
Header.defaultProps = {
  onMenuClick: () => {},
  isMobile: false
};

export default Header; 