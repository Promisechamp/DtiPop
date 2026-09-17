import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';

const AdminLayout = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-ink-50/30">
      <AdminNavbar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />

      <main
        className={`pt-16 md:pt-0 min-h-screen transition-[margin-left] duration-300 ease-in-out ${
          isOpen
            ? 'md:ml-[280px]'
            : 'md:ml-[78px]'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;