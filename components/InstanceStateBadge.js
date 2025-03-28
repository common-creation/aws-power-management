import { Chip } from '@mui/material';

/**
 * インスタンスの状態を表示するバッジコンポーネント
 */
const InstanceStateBadge = ({ state }) => {
  // 状態に応じた色を決定
  const getColorByState = () => {
    switch (state) {
      case 'running':
      case 'available':
        return 'success';
      case 'stopped':
        return 'error';
      case 'stopping':
      case 'pending':
      case 'shutting-down':
      case 'starting':
      case 'modifying':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 色を取得
  const color = getColorByState();

  return (
    <Chip 
      size="small" 
      color={color}
      variant="outlined" 
      label={state}
    />
  );
};

export default InstanceStateBadge; 