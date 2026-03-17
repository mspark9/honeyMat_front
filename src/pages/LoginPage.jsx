import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import {
    Box,
    Button,
    Checkbox,
    Container,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Link,
    Paper,
    TextField,
    Typography,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    LockOutlined,
    EmailOutlined,
    Google,
    GitHub,
} from '@mui/icons-material';

// ─── TextField Focus 스타일 ─────────────────────────────────────────────────
const textFieldFocusStyle = {
    '& .MuiOutlinedInput-root': {
        '&.Mui-focused fieldset': {
            borderColor: '#FF8243',
        },
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: '#FF8243',
    },
};

export default function LoginPage() {
    const navigate = useNavigate();
    const auth = useAuth();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            setError('이메일과 비밀번호를 입력해주세요.');
            return;
        }
        setLoading(true);
        try {
            const response = await authApi.login(form.email, form.password);
            auth.login(response.token, response.user);
            navigate('/home');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #FF8243 0%, #E05A1F 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
            }}
        >
            <Container maxWidth="sm">
                {/* 로고 영역 */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.25)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2,
                            border: '1px solid rgba(255,255,255,0.3)',
                        }}
                    >
                        <LockOutlined sx={{ color: '#fff', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                        다시 만나서 반갑습니다
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem' }}>
                        계정에 로그인하세요
                    </Typography>
                </Box>

                {/* 카드 */}
                <Paper
                    sx={{
                        p: { xs: 3, sm: 4.5 },
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.6)',
                    }}
                >
                    {error && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <TextField
                            fullWidth
                            label="이메일"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="example@email.com"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2.5, ...textFieldFocusStyle }}
                        />

                        <TextField
                            fullWidth
                            label="비밀번호"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword((v) => !v)}
                                            edge="end"
                                            size="small"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 1, ...textFieldFocusStyle }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
                            {/* <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        size="small"
                                        sx={{
                                            color: '#FF8243',
                                            '&.Mui-checked': { color: '#FF8243' },
                                        }}
                                    />
                                }
                                label={<Typography variant="body2" color="text.secondary">로그인 유지</Typography>}
                            /> */}
                            <Link
                                component={RouterLink}
                                to="/forgot-password"
                                variant="body2"
                                sx={{ color: '#FF8243', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                            >
                                비밀번호 찾기
                            </Link>
                        </Box>

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{
                                mb: 2.5,
                                py: 1.5,
                                bgcolor: '#FF8243',
                                '&:hover': { bgcolor: '#E05A1F' },
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : '로그인'}
                        </Button>

                        <Divider sx={{ mb: 2.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                                또는
                            </Typography>
                        </Divider>

                        {/* 잠시 보류 (후순위) */}
                        {/* <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Google />}
                                sx={{
                                    borderColor: '#e2e8f0',
                                    color: 'text.primary',
                                    '&:hover': { borderColor: '#FF8243', backgroundColor: '#fff4ee' },
                                }}
                            >
                                Google
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<GitHub />}
                                sx={{
                                    borderColor: '#e2e8f0',
                                    color: 'text.primary',
                                    '&:hover': { borderColor: '#FF8243', backgroundColor: '#fff4ee' },
                                }}
                            >
                                GitHub
                            </Button>
                        </Box> */}

                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            계정이 없으신가요?{' '}
                            <Link
                                component={RouterLink}
                                to="/register"
                                sx={{ color: '#FF8243', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                            >
                                회원가입
                            </Link>
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
