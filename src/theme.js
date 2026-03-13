import { createTheme } from '@mui/material/styles';

// Tailwind 브레이크포인트 기준으로 MUI 테마 설정
// Mobile: ≤550px / Tablet: 551~1024px / Desktop: ≥1025px
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 551,
      md: 768,
      lg: 1025,
      xl: 1280,
    },
  },
});

export default theme;
