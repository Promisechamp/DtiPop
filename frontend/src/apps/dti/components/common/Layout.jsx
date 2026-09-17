// components/common/Layout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-ink-50 pt-[68px]">
        <Outlet />
      </main>
    </>
  );
};

export default Layout;