import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-var(--color-background) flex">
      <Sidebar />

      <main className="flex-1 min-w-0 pl-72 pt-8 pr-8 pb-8 text-var(--color-text)">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
