import { useState } from 'react';
import { authApi } from '../api/auth';
import { Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    InputAdornment,
    Link,
    Paper,
    TextField,
    Typography,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    EmailOutlined,
    LockResetOutlined,
    ArrowBack,
    MarkEmailReadOutlined,
    LockOutlined,
    Visibility,
    VisibilityOff,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { IconButton } from '@mui/material';

// ─── 단계 정의 ───────────────────────────────────────────────────────────────
// step 0: 이메일 입력
// step 1: 인증 코드 입력
// step 2: 새 비밀번호 설정
// step 3: 완료

const PASSWORD_RULES = [
    { label: '8자 이상', test: (v) => v.length >= 8 },
    { label: '대문자 포함', test: (v) => /[A-Z]/.test(v) },
    { label: '숫자 포함', test: (v) => /[0-9]/.test(v) },
    { label: '특수문자 포함', test: (v) => /[!@#$%^&*]/.test(v) },
];

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

function StrengthBar({ password }) {
    if (!password) return null;
    const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
    const pct = (passed / PASSWORD_RULES.length) * 100;
    const color = pct <= 25 ? '#EF5350' : pct <= 50 ? '#FFA726' : pct <= 75 ? '#29B6F6' : '#66BB6A';
    const label = ['', '약함', '보통', '강함', '매우 강함'][passed];
    return (
        <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">비밀번호 강도</Typography>
                <Typography variant="caption" fontWeight={600} sx={{ color }}>{label}</Typography>
            </Box>
            <Box sx={{ height: 5, bgcolor: '#e8ecf0', borderRadius: 4, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.3s, background-color 0.3s' }} />
            </Box>
        </Box>
    );
}

// ─── 공통 레이아웃 래퍼 ──────────────────────────────────────────────────────
function PageShell({ children }) {
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
            <Container maxWidth="sm">{children}</Container>
        </Box>
    );
}

// ─── 로고 헤더 ───────────────────────────────────────────────────────────────
function PageHeader({ icon: Icon, title, subtitle }) {
    return (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
                sx={{
                    width: 56, height: 56, borderRadius: '16px',
                    background: 'rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mx: 'auto', mb: 2,
                    border: '1px solid rgba(255,255,255,0.3)',
                }}
            >
                <Icon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>{title}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem' }}>{subtitle}</Typography>
        </Box>
    );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
    const [step, setStep] = useState(0);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resetToken, setResetToken] = useState('');

    // ── 코드 입력 핸들러 ──────────────────────────────────────────────────────
    const handleCodeChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...code];
        next[index] = value.slice(-1);
        setCode(next);
        setError('');
        if (value && index < 5) {
            document.getElementById(`code-${index + 1}`)?.focus();
        }
    };

    const handleCodeKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            document.getElementById(`code-${index - 1}`)?.focus();
        }
    };

    const handleCodePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(''));
            e.preventDefault();
        }
    };

    // ── 재전송 쿨다운 ─────────────────────────────────────────────────────────
    const startCooldown = () => {
        setResendCooldown(60);
        const timer = setInterval(() => {
            setResendCooldown((v) => {
                if (v <= 1) { clearInterval(timer); return 0; }
                return v - 1;
            });
        }, 1000);
    };

    // ── Step 0: 이메일 제출 ───────────────────────────────────────────────────
    const handleEmailSubmit = async () => {
        if (!email.trim()) return setError('이메일을 입력해주세요.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('올바른 이메일 형식을 입력해주세요.');
        setLoading(true);
        try {
            await authApi.forgotPasswordSendCode(email);
            setStep(1);
            startCooldown();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Step 1: 인증 코드 확인 ────────────────────────────────────────────────
    const handleCodeSubmit = async () => {
        if (code.some((c) => !c)) return setError('인증 코드 6자리를 모두 입력해주세요.');
        setLoading(true);
        try {
            const res = await authApi.forgotPasswordVerifyCode(email, code.join(''));
            setResetToken(res.resetToken);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: 새 비밀번호 설정 ──────────────────────────────────────────────
    const handlePasswordSubmit = async () => {
        if (!newPassword) return setError('새 비밀번호를 입력해주세요.');
        if (PASSWORD_RULES.filter((r) => r.test(newPassword)).length < 2)
            return setError('더 강한 비밀번호를 설정해주세요.');
        if (newPassword !== confirmPassword) return setError('비밀번호가 일치하지 않습니다.');
        setLoading(true);
        try {
            await authApi.forgotPasswordResetPassword(resetToken, newPassword);
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: 완료 ──────────────────────────────────────────────────────────
    if (step === 3) {
        return (
            <PageShell>
                <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, textAlign: 'center' }}>
                    <Box
                        sx={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FF8243, #E05A1F)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', mb: 3,
                        }}
                    >
                        <CheckCircleIcon sx={{ color: '#fff', fontSize: 44 }} />
                    </Box>
                    <Typography variant="h5" fontWeight={700} mb={1}>비밀번호 재설정 완료!</Typography>
                    <Typography color="text.secondary" mb={4}>
                        새 비밀번호로 로그인하실 수 있습니다.
                    </Typography>
                    <Button
                        component={RouterLink}
                        to="/login"
                        variant="contained"
                        fullWidth
                        size="large"
                        sx={{
                            py: 1.5,
                            bgcolor: '#FF8243',
                            '&:hover': { bgcolor: '#E05A1F' },
                        }}
                    >
                        로그인하러 가기
                    </Button>
                </Paper>
            </PageShell>
        );
    }

    return (
        <PageShell>
            {/* ── Step 0: 이메일 입력 ── */}
            {step === 0 && (
                <>
                    <PageHeader icon={LockResetOutlined} title="비밀번호 찾기" subtitle="가입한 이메일로 인증 코드를 보내드립니다" />
                    <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.6)' }}>
                        {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

                        <Typography variant="body2" color="text.secondary" mb={2.5} sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, border: '1px solid #e8ecf0' }}>
                            💡 회원가입 시 사용한 이메일 주소를 입력하시면 비밀번호 재설정 인증 코드를 발송합니다.
                        </Typography>

                        <TextField
                            fullWidth
                            label="이메일"
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            placeholder="example@email.com"
                            onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 3, ...textFieldFocusStyle }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleEmailSubmit}
                            disabled={loading}
                            sx={{
                                py: 1.5,
                                mb: 2,
                                bgcolor: '#FF8243',
                                '&:hover': { bgcolor: '#E05A1F' },
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : '인증 코드 발송'}
                        </Button>

                        <Box sx={{ textAlign: 'center' }}>
                            <Link
                                component={RouterLink}
                                to="/login"
                                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', textDecoration: 'none', fontSize: '0.875rem', '&:hover': { color: '#FF8243' } }}
                            >
                                <ArrowBack sx={{ fontSize: 16 }} /> 로그인으로 돌아가기
                            </Link>
                        </Box>
                    </Paper>
                </>
            )}

            {/* ── Step 1: 인증 코드 입력 ── */}
            {step === 1 && (
                <>
                    <PageHeader icon={MarkEmailReadOutlined} title="인증 코드 확인" subtitle={`${email} 으로 발송된 코드를 입력해주세요`} />
                    <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.6)' }}>
                        {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

                        {/* 6자리 코드 입력 박스 */}
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }} onPaste={handleCodePaste}>
                            {code.map((digit, i) => (
                                <Box
                                    key={i}
                                    id={`code-${i}`}
                                    component="input"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleCodeChange(i, e.target.value)}
                                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                    sx={{
                                        width: 48, height: 56,
                                        textAlign: 'center',
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        border: `2px solid ${digit ? '#FF8243' : '#e8ecf0'}`,
                                        borderRadius: '10px',
                                        outline: 'none',
                                        bgcolor: digit ? '#fff3ed' : '#f8fafc',
                                        color: '#FF8243',
                                        transition: 'all 0.15s',
                                        fontFamily: 'inherit',
                                        cursor: 'text',
                                        '&:focus': {
                                            borderColor: '#FF8243',
                                            bgcolor: '#fff',
                                            boxShadow: '0 0 0 3px rgba(255,130,67,0.15)',
                                        },
                                    }}
                                />
                            ))}
                        </Box>

                        {/* 재전송 */}
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            {resendCooldown > 0 ? (
                                <Typography variant="body2" color="text.disabled">
                                    {resendCooldown}초 후 재전송 가능
                                </Typography>
                            ) : (
                                <Button
                                    size="small"
                                    onClick={async () => {
                                        setCode(['', '', '', '', '', '']);
                                        setError('');
                                        try {
                                            await authApi.forgotPasswordResendCode(email);
                                            startCooldown();
                                        } catch (err) {
                                            setError(err.message);
                                        }
                                    }}
                                    sx={{ color: 'text.secondary', fontSize: '0.8rem', textTransform: 'none' }}
                                >
                                    코드를 받지 못하셨나요? <Box component="span" sx={{ color: 'primary.main', fontWeight: 700, ml: 0.5 }}>재전송</Box>
                                </Button>
                            )}
                        </Box>

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleCodeSubmit}
                            disabled={loading || code.some((c) => !c)}
                            sx={{
                                py: 1.5,
                                mb: 2,
                                bgcolor: '#FF8243',
                                '&:hover': { bgcolor: '#E05A1F' },
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : '인증 확인'}
                        </Button>

                        <Box sx={{ textAlign: 'center' }}>
                            <Link
                                component="button"
                                onClick={() => { setStep(0); setCode(['', '', '', '', '', '']); setError(''); }}
                                sx={{ color: 'text.secondary', textDecoration: 'none', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 0.5, '&:hover': { color: '#FF8243' } }}
                            >
                                <ArrowBack sx={{ fontSize: 16 }} /> 이메일 다시 입력
                            </Link>
                        </Box>
                    </Paper>
                </>
            )}

            {/* ── Step 2: 새 비밀번호 설정 ── */}
            {step === 2 && (
                <>
                    <PageHeader icon={LockOutlined} title="새 비밀번호 설정" subtitle="사용할 새 비밀번호를 입력해주세요" />
                    <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.6)' }}>
                        {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

                        <TextField
                            fullWidth
                            label="새 비밀번호"
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                            placeholder="••••••••"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowNew((v) => !v)} edge="end" size="small">
                                            {showNew ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 0.5, ...textFieldFocusStyle }}
                        />
                        <StrengthBar password={newPassword} />

                        <TextField
                            fullWidth
                            label="새 비밀번호 확인"
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                            placeholder="••••••••"
                            error={confirmPassword !== '' && newPassword !== confirmPassword}
                            helperText={
                                confirmPassword !== '' && newPassword !== confirmPassword
                                    ? '비밀번호가 일치하지 않습니다.'
                                    : confirmPassword && newPassword === confirmPassword
                                        ? '비밀번호가 일치합니다.'
                                        : ''
                            }
                            FormHelperTextProps={{
                                sx: { color: newPassword === confirmPassword && confirmPassword ? 'success.main' : 'error.main' },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" size="small">
                                            {showConfirm ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mt: 2.5, mb: 3, ...textFieldFocusStyle }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handlePasswordSubmit}
                            disabled={loading}
                            sx={{
                                py: 1.5,
                                bgcolor: '#FF8243',
                                '&:hover': { bgcolor: '#E05A1F' },
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : '비밀번호 변경 완료'}
                        </Button>
                    </Paper>
                </>
            )}
        </PageShell>
    );
}
