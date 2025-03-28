import Link from 'next/link';
import { AppBar, Toolbar, Typography, Container, Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const Header = ({ onMenuClick, isMobile }) => {
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