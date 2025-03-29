import '../styles/globals.css';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { useState, useEffect, useMemo, createContext } from 'react';

// テーマモードの選択肢
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// テーマコンテキストを作成
export const ThemeContext = createContext({
  mode: THEME_MODES.SYSTEM,
  setMode: (newMode) => {},
});

function MyApp({ Component, pageProps }) {
  // テーマモードの状態
  const [mode, setMode] = useState(THEME_MODES.SYSTEM);
  // 実際に適用するモード（systemの場合はOSの設定に依存）
  const [actualMode, setActualMode] = useState(THEME_MODES.LIGHT);

  // localStorageからテーマ設定を読み込む
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('themeMode');
      if (savedMode && Object.values(THEME_MODES).includes(savedMode)) {
        setMode(savedMode);
      }
    }
  }, []);

  // システム設定を監視し、モードに反映する
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      return;
    }
    
    // システム設定のダークモード検出
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // システム設定の変更を検知したときの処理
    const handleChange = (e) => {
      if (mode === THEME_MODES.SYSTEM) {
        setActualMode(e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT);
      }
    };

    // 初期値を設定
    if (mode === THEME_MODES.SYSTEM) {
      setActualMode(mediaQuery.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT);
    } else {
      setActualMode(mode);
    }

    // メディアクエリのリスナーを設定
    mediaQuery.addEventListener('change', handleChange);
    
    // クリーンアップ
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [mode]);

  // モードが変更されたときにlocalStorageに保存
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      localStorage.setItem('themeMode', mode);
    }
  }, [mode]);

  // テーマを生成
  const theme = useMemo(() => createTheme({
    palette: {
      mode: actualMode === THEME_MODES.DARK ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: actualMode === THEME_MODES.LIGHT ? '#f5f5f5' : '#121212',
        paper: actualMode === THEME_MODES.LIGHT ? '#fff' : '#1e1e1e',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
  }), [actualMode]);

  // テーマコンテキストの値
  const themeContextValue = {
    mode,
    setMode: (newMode) => {
      setMode(newMode);
    }
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default MyApp; 