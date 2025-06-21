'use client';

import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import DocumentList from '@/components/DocumentList';

export default function DocumentsPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#f0f7ff]">
        <Navbar />
        <Suspense fallback={<div className="container mx-auto p-4 md:p-8">Loading...</div>}>
          <DocumentList />
        </Suspense>
      </div>
    </ProtectedRoute>
  );
}