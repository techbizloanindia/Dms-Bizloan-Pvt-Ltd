import S3Browser from '@/components/admin/S3Browser';
import AdminLayout from '@/components/AdminLayout';
import LoanFolders from '@/components/admin/LoanFolders';
import S3ConnectionTest from '@/components/admin/S3ConnectionTest';

const S3BrowserPage = () => {
  return (
    <AdminLayout>
      <div className="mb-4">
        <S3ConnectionTest />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <LoanFolders />
        </div>
        <div className="md:col-span-2">
          <S3Browser />
        </div>
      </div>
    </AdminLayout>
  );
};

export default S3BrowserPage;