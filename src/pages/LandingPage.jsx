import { Link } from 'react-router-dom';
import { Utensils, Camera, BarChart3, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'linear-gradient(135deg, #FF8243 0%, #E05A1F 50%, #c44d1a 100%)',
      }}
    >
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex items-center gap-3 mb-8">
          <img
            src="/logo1.png"
            alt="HoneyMat"
            className="h-16 w-auto object-contain drop-shadow-lg"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-md">
            HoneyMat
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-white/95 font-medium max-w-2xl mb-4">
          AI와 함께하는 스마트 영양 관리
        </p>
        <p className="text-base md:text-lg text-white/85 max-w-xl mb-12 leading-relaxed">
          음식 사진을 찍기만 하면 AI가 분석해드립니다.
          <br />
          일일 식사 기록부터 주간·월간 리포트까지, 건강한 식습관을 함께
          만들어가요.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-10 py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: '#fff',
              color: '#FF8243',
            }}
          >
            로그인
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-10 py-4 rounded-2xl font-semibold text-lg transition-all border-2 border-white/90 text-white hover:bg-white/15"
          >
            회원가입
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
          {[
            { icon: Camera, label: 'AI 식단분석' },
            { icon: Utensils, label: '일일식사기록' },
            { icon: BarChart3, label: '주간리포트' },
            { icon: Sparkles, label: '영양점수 추적' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <Icon className="w-8 h-8 text-white" strokeWidth={2} />
              <span className="text-sm font-medium text-white/95">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 면책 조항 */}
      <div className="px-6 pb-8">
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
          <p className="text-center text-white/80 text-xs leading-relaxed">
            ⚠️ 본 서비스는 일반적인 건강 정보 제공을 목적으로 하며,{' '}
            <strong className="text-white">의료 조언, 진단 또는 치료를 대체하지 않습니다.</strong>
            <br />
            건강 관련 결정은 반드시 전문 의료진과 상담하시기 바랍니다.
          </p>
        </div>
      </div>

      {/* Footer hint */}
      {/* <p className="text-center text-white/70 text-sm pb-6">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="underline font-semibold text-white hover:text-white/90">
          로그인
        </Link>
        {' · '}
        <Link to="/register" className="underline font-semibold text-white hover:text-white/90">
          회원가입
        </Link>
      </p> */}
    </div>
  );
}
