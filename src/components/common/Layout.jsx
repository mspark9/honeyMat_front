import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-var(--color-background) flex">
      {/* 데스크톱(1025px+): 사이드바 */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* 모바일/태블릿(~1024px): 상단 바 */}
      <div className="lg:hidden">
        <TopBar />
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-w-0 pt-14 pb-8 lg:pl-72 lg:pt-8 lg:pr-8 text-var(--color-text)">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
