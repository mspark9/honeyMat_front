import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { authApi } from '../api/auth';
import {
    Box,
    Button,
    Container,
    IconButton,
    InputAdornment,
    Link,
    Paper,
    TextField,
    Typography,
    Alert,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    LinearProgress,
    Chip,
    ToggleButton,
    ToggleButtonGroup,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    PersonOutlined,
    EmailOutlined,
    LockOutlined,
    PersonAddOutlined,
    CheckCircle,
    Male,
    Female,
    FitnessCenter,
    MonitorWeight,
    Restaurant,
    FavoriteBorder,
    TagFacesOutlined,
    LocalDining,
    NoFood,
    SpaOutlined,
    GrainOutlined,
} from '@mui/icons-material';

// ─── 비밀번호 강도 ───────────────────────────────────────────────────────────
const PASSWORD_RULES = [
    { label: '8자 이상', test: (v) => v.length >= 8 },
    { label: '대문자 포함', test: (v) => /[A-Z]/.test(v) },
    { label: '숫자 포함', test: (v) => /[0-9]/.test(v) },
    { label: '특수문자 포함', test: (v) => /[!@#$%^&*]/.test(v) },
];

function PasswordStrength({ password }) {
    const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
    const strength = (passed / PASSWORD_RULES.length) * 100;
    const color = strength <= 25 ? 'error' : strength <= 50 ? 'warning' : strength <= 75 ? 'info' : 'success';
    const label = ['', '약함', '보통', '강함', '매우 강함'][passed];
    if (!password) return null;
    return (
        <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">비밀번호 강도</Typography>
                <Typography variant="caption" color={`${color}.main`} fontWeight={600}>{label}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={strength} color={color} sx={{ borderRadius: 4, height: 6 }} />
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {PASSWORD_RULES.map((rule) => (
                    <Chip
                        key={rule.label}
                        label={rule.label}
                        size="small"
                        icon={rule.test(password) ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : undefined}
                        color={rule.test(password) ? 'success' : 'default'}
                        variant={rule.test(password) ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.7rem', height: 22 }}
                    />
                ))}
            </Box>
        </Box>
    );
}

// ─── 목표 / 식이 제한 옵션 ──────────────────────────────────────────────────
const GOAL_OPTIONS = [
    { key: 'weight', label: '체중 관리', Icon: MonitorWeight, color: '#FF8243', bg: '#fff3ed' },
    { key: 'muscle', label: '근육 증가', Icon: FitnessCenter, color: '#5C6BC0', bg: '#e8eaf6' },
    { key: 'nutrition', label: '영양 균형', Icon: Restaurant, color: '#43A047', bg: '#e8f5e9' },
    { key: 'condition', label: '컨디션 관리', Icon: FavoriteBorder, color: '#EC407A', bg: '#fce4ec' },
];

const DIET_OPTIONS = [
    { key: 'lactose', label: '유당불내증', Icon: LocalDining, color: '#FFA726', bg: '#fff8e1' },
    { key: 'vegan', label: '채식주의', Icon: SpaOutlined, color: '#66BB6A', bg: '#e8f5e9' },
    { key: 'gluten', label: '글루텐 프리', Icon: GrainOutlined, color: '#8D6E63', bg: '#efebe9' },
    { key: 'nut', label: '견과류 알레르기', Icon: NoFood, color: '#EF5350', bg: '#ffebee' },
];

const AGE_OPTIONS = ['10대', '20대', '30대', '40대', '50대 이상'];

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

// ─── 체크박스 그리드 ─────────────────────────────────────────────────────────
function CheckboxGrid({ options, selected, onChange }) {
    const toggle = (key) => {
        onChange(
            selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
        );
    };
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
            {options.map(({ key, label, Icon, color, bg }) => {
                const checked = selected.includes(key);
                return (
                    <Box
                        key={key}
                        onClick={() => toggle(key)}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1.2,
                            px: 1.5, py: 1.2, borderRadius: 2, cursor: 'pointer',
                            border: `1.5px solid ${checked ? color : '#e8ecf0'}`,
                            bgcolor: checked ? bg : '#fafafa',
                            transition: 'all 0.15s',
                            '&:hover': { borderColor: color, bgcolor: bg },
                        }}
                    >
                        <Checkbox
                            checked={checked}
                            size="small"
                            sx={{ p: 0, color: '#cbd5e1', '&.Mui-checked': { color } }}
                        />
                        <Icon sx={{ fontSize: 18, color: checked ? color : '#94a3b8' }} />
                        <Typography variant="body2" fontWeight={checked ? 700 : 400} sx={{ color: checked ? color : 'text.primary', fontSize: '0.82rem' }}>
                            {label}
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────
const STEPS = ['기본 정보', '보안 설정', '프로필 정보'];

export default function RegisterPage() {
    const navigate = useNavigate();

    // 기본 정보 (step 0)
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // 프로필 정보 (step 2)
    const [profile, setProfile] = useState({
        nickname: '',
        gender: '',
        ageGroup: '',
        height: '',
        weight: '',
        goals: [],
        dietary: [],
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(0);

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleProfileChange = (field, value) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
        setError('');
    };

    // Step 0 → 1
    const handleNextStep0 = () => {
        if (!form.name.trim()) return setError('이름을 입력해주세요.');
        if (!form.email.trim()) return setError('이메일을 입력해주세요.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('올바른 이메일 형식을 입력해주세요.');
        setError('');
        setStep(1);
    };

    // Step 1 → 2
    const handleNextStep1 = (e) => {
        e.preventDefault();
        if (!form.password) return setError('비밀번호를 입력해주세요.');
        if (form.password !== form.confirmPassword) return setError('비밀번호가 일치하지 않습니다.');
        if (PASSWORD_RULES.filter((r) => r.test(form.password)).length < 2)
            return setError('더 강한 비밀번호를 설정해주세요.');
        setError('');
        setStep(2);
    };

    // Step 2 → 완료 (API 호출)
    const handleFinalSubmit = async () => {
        if (!profile.nickname.trim()) return setError('닉네임을 입력해주세요.');
        setLoading(true);
        // await new Promise((r) => setTimeout(r, 1500));
        // setLoading(false);
        // setStep(3);
        try {
            await authApi.signup(
                form.email,
                form.password,
                profile.nickname,
                profile.gender,
                profile.ageGroup,
                parseFloat(profile.height) || null,
                parseFloat(profile.weight) || null,
                profile.goals,
                profile.dietary
            );
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── 완료 화면 ──────────────────────────────────────────────────────────────
    if (step === 3) {
        return (
            <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF8243 0%, #E05A1F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                <Container maxWidth="sm">
                    <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, textAlign: 'center' }}>
                        <Box sx={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #FF8243, #E05A1F)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                            <CheckCircle sx={{ color: '#fff', fontSize: 44 }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} mb={1}>가입 완료!</Typography>
                        <Typography color="text.secondary" mb={1}>
                            <strong>{profile.nickname || form.name}</strong>님, 환영합니다.
                        </Typography>
                        <Typography color="text.secondary" mb={4}>
                            계정이 성공적으로 생성되었습니다.
                        </Typography>
                        {profile.goals.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
                                {profile.goals.map((g) => {
                                    const opt = GOAL_OPTIONS.find((o) => o.key === g);
                                    return opt ? (
                                        <Chip key={g} label={opt.label} size="small" sx={{ bgcolor: opt.bg, color: opt.color, fontWeight: 600 }} />
                                    ) : null;
                                })}
                            </Box>
                        )}
                        <Button variant="contained" fullWidth size="large" onClick={() => navigate('/login')} sx={{ py: 1.5, bgcolor: '#FF8243', '&:hover': { bgcolor: '#E05A1F' } }}>
                            로그인하러 가기
                        </Button>
                    </Paper>
                </Container>
            </Box>
        );
    }

    // ── 공통 레이아웃 ──────────────────────────────────────────────────────────
    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF8243 0%, #E05A1F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, py: 4 }}>
            <Container maxWidth="sm">
                {/* 로고 */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, border: '1px solid rgba(255,255,255,0.3)' }}>
                        <PersonAddOutlined sx={{ color: '#fff', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>계정 만들기</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem' }}>무료로 시작하세요</Typography>
                </Box>

                <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.6)' }}>
                    {/* 스텝퍼 */}
                    <Stepper activeStep={step} sx={{ mb: 4 }}>
                        {STEPS.map((label, i) => (
                            <Step key={label}>
                                <StepLabel StepIconProps={{ sx: { '&.Mui-active': { color: '#FF8243' }, '&.Mui-completed': { color: '#FF8243' } } }}>
                                    <Typography variant="body2" fontWeight={step === i ? 600 : 400} sx={{ display: { xs: 'none', sm: 'block' } }}>
                                        {label}
                                    </Typography>
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

                    {/* ── Step 0: 기본 정보 ── */}
                    {step === 0 && (
                        <Box>
                            <TextField
                                fullWidth label="이름" name="name" value={form.name} onChange={handleChange} placeholder="홍길동"
                                InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlined sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
                                sx={{ mb: 2.5, ...textFieldFocusStyle }}
                            />
                            <TextField
                                fullWidth label="이메일" name="email" type="email" value={form.email} onChange={handleChange} placeholder="example@email.com"
                                InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
                                sx={{ mb: 3, ...textFieldFocusStyle }}
                            />
                            <Button fullWidth variant="contained" size="large" onClick={handleNextStep0} sx={{ py: 1.5, bgcolor: '#FF8243', '&:hover': { bgcolor: '#E05A1F' } }}>
                                다음 단계
                            </Button>
                        </Box>
                    )}

                    {/* ── Step 1: 보안 설정 ── */}
                    {step === 1 && (
                        <Box component="form" onSubmit={handleNextStep1} noValidate>
                            <TextField
                                fullWidth label="비밀번호" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="••••••••"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                                    endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                                }}
                                sx={{ mb: 0.5, ...textFieldFocusStyle }}
                            />
                            <PasswordStrength password={form.password} />

                            <TextField
                                fullWidth label="비밀번호 확인" name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange} placeholder="••••••••"
                                error={form.confirmPassword !== '' && form.password !== form.confirmPassword}
                                helperText={
                                    form.confirmPassword !== '' && form.password !== form.confirmPassword ? '비밀번호가 일치하지 않습니다.'
                                        : form.confirmPassword && form.password === form.confirmPassword ? '비밀번호가 일치합니다.' : ''
                                }
                                FormHelperTextProps={{ sx: { color: form.password === form.confirmPassword && form.confirmPassword ? 'success.main' : 'error.main' } }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                                    endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" size="small">{showConfirm ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                                }}
                                sx={{ mt: 2.5, mb: 3, ...textFieldFocusStyle }}
                            />

                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button fullWidth variant="outlined" size="large" onClick={() => setStep(0)} sx={{ py: 1.5, borderColor: '#e2e8f0', color: 'text.secondary' }}>
                                    이전
                                </Button>
                                <Button type="submit" fullWidth variant="contained" size="large" sx={{ py: 1.5, bgcolor: '#FF8243', '&:hover': { bgcolor: '#E05A1F' } }}>
                                    다음 단계
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* ── Step 2: 프로필 정보 ── */}
                    {step === 2 && (
                        <Box>
                            {/* 닉네임 */}
                            <TextField
                                fullWidth label="닉네임" value={profile.nickname}
                                onChange={(e) => handleProfileChange('nickname', e.target.value)}
                                placeholder="앱에서 사용할 이름"
                                InputProps={{ startAdornment: <InputAdornment position="start"><TagFacesOutlined sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
                                sx={{ mb: 3, ...textFieldFocusStyle }}
                            />

                            {/* 성별 */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="body2" fontWeight={700} color="text.secondary" mb={1}>
                                    성별
                                </Typography>
                                <ToggleButtonGroup
                                    value={profile.gender}
                                    exclusive
                                    onChange={(_, val) => val && handleProfileChange('gender', val)}
                                    fullWidth
                                    sx={{ gap: 1 }}
                                >
                                    {[
                                        { value: 'male', label: '남성', Icon: Male, activeColor: '#FF8243', activeBg: '#FFF0E8' },
                                        { value: 'female', label: '여성', Icon: Female, activeColor: '#FF8243', activeBg: '#FFF0E8' },
                                    ].map(({ value, label, Icon, activeColor, activeBg }) => {
                                        const isActive = profile.gender === value;
                                        return (
                                            <ToggleButton
                                                key={value}
                                                value={value}
                                                sx={{
                                                    flex: 1, py: 1.2, borderRadius: '10px !important',
                                                    border: `1.5px solid ${isActive ? activeColor : '#e8ecf0'} !important`,
                                                    bgcolor: isActive ? activeBg : '#fafafa',
                                                    color: isActive ? activeColor : 'text.secondary',
                                                    fontWeight: isActive ? 700 : 400,
                                                    gap: 0.8,
                                                    '&.Mui-selected': { bgcolor: activeBg, color: activeColor },
                                                    '&.Mui-selected:hover': { bgcolor: activeBg },
                                                    '&:hover': { bgcolor: activeBg, borderColor: `${activeColor} !important` },
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <Icon sx={{ fontSize: 20 }} />
                                                {label}
                                            </ToggleButton>
                                        );
                                    })}
                                </ToggleButtonGroup>
                            </Box>

                            {/* 나이대 */}
                            <FormControl fullWidth sx={{ mb: 3, ...textFieldFocusStyle }}>
                                <InputLabel>나이대</InputLabel>
                                <Select
                                    value={profile.ageGroup}
                                    label="나이대"
                                    onChange={(e) => handleProfileChange('ageGroup', e.target.value)}
                                    sx={{ borderRadius: 2.5 }}
                                >
                                    {AGE_OPTIONS.map((age) => (
                                        <MenuItem key={age} value={age}>{age}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* 키 / 몸무게 */}
                            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                                <TextField
                                    fullWidth label="키" type="number" value={profile.height}
                                    onChange={(e) => handleProfileChange('height', e.target.value)}
                                    placeholder="170"
                                    InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="body2" color="text.secondary">cm</Typography></InputAdornment> }}
                                    sx={{ ...textFieldFocusStyle }}
                                />
                                <TextField
                                    fullWidth label="몸무게" type="number" value={profile.weight}
                                    onChange={(e) => handleProfileChange('weight', e.target.value)}
                                    placeholder="65"
                                    InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="body2" color="text.secondary">kg</Typography></InputAdornment> }}
                                    sx={{ ...textFieldFocusStyle }}
                                />
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            {/* 목표 선택 */}
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
                                    <Typography variant="body2" fontWeight={700} color="text.secondary">목표 선택</Typography>
                                    <Typography variant="caption" color="text.disabled">중복 선택 가능</Typography>
                                </Box>
                                <CheckboxGrid options={GOAL_OPTIONS} selected={profile.goals} onChange={(v) => handleProfileChange('goals', v)} />
                            </Box>

                            {/* 식이 제한 */}
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
                                    <Typography variant="body2" fontWeight={700} color="text.secondary">식이 제한</Typography>
                                    <Typography variant="caption" color="text.disabled">해당하는 항목 선택</Typography>
                                </Box>
                                <CheckboxGrid options={DIET_OPTIONS} selected={profile.dietary} onChange={(v) => handleProfileChange('dietary', v)} />
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button fullWidth variant="outlined" size="large" onClick={() => setStep(1)} sx={{ py: 1.5, borderColor: '#e2e8f0', color: 'text.secondary' }}>
                                    이전
                                </Button>
                                <Button fullWidth variant="contained" size="large" onClick={handleFinalSubmit} disabled={loading} sx={{ py: 1.5, bgcolor: '#FF8243', '&:hover': { bgcolor: '#E05A1F' } }}>
                                    {loading ? <CircularProgress size={24} color="inherit" /> : '가입 완료'}
                                </Button>
                            </Box>
                        </Box>
                    )}

                    <Typography variant="body2" color="text.secondary" textAlign="center" mt={3}>
                        이미 계정이 있으신가요?{' '}
                        <Link component={RouterLink} to="/login" sx={{ color: '#FF8243', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                            로그인
                        </Link>
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
}
