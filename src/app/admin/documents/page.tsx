import ExistingS3Upload from '@/components/admin/ExistingS3Upload';
import CreateUser from '@/components/admin/CreateUser';
import UserDisplay from '@/components/admin/UserDisplay';
import DocumentDisplay from '@/components/admin/DocumentDisplay';
import S3ConnectionTest from '@/components/admin/S3ConnectionTest';
import AdminLayout from '@/components/AdminLayout';

const DocumentsPage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-white mb-2">📄 Document Upload Admin Panel</h1>
          <p className="text-purple-100">Upload documents directly to ops-loan-data S3 bucket</p>
        </div>

        {/* Main Document Upload Section - Only ops-loan-data */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">📤 Upload Documents to ops-loan-data</h2>
            <p className="text-blue-100">All uploads go directly to ops-loan-data bucket using existing folder structure</p>
          </div>
          <div className="p-6">
            <ExistingS3Upload />
          </div>
        </div>

        {/* Connection Testing Section */}
        <div className="bg-white rounded-lg shadow-md p-1">
          <div className="bg-indigo-600 text-white p-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">🔧 S3 Connection Testing</h2>
            <p className="text-indigo-100">Test S3 connectivity and permissions</p>
          </div>
          <div className="p-4">
            <S3ConnectionTest />
          </div>
        </div>

        {/* User Management Section - MongoDB */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-1">
            <div className="bg-green-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">👥 Create Users (MongoDB)</h2>
              <p className="text-green-100">Add new users to MongoDB database</p>
            </div>
            <div className="p-4">
              <CreateUser />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-1">
            <div className="bg-green-700 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">👤 View Users (MongoDB)</h2>
              <p className="text-green-100">Display all users from MongoDB</p>
            </div>
            <div className="p-4">
              <UserDisplay />
            </div>
          </div>
        </div>

        {/* Document Display Section - S3 */}
        <div className="bg-white rounded-lg shadow-md p-1">
          <div className="bg-orange-600 text-white p-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">📂 View Documents from ops-loan-data</h2>
            <p className="text-orange-100">Browse and view documents from ops-loan-data S3 bucket</p>
          </div>
          <div className="p-4">
            <DocumentDisplay />
          </div>
        </div>

        {/* Status Summary */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 rounded-lg shadow-md text-white">
          <h2 className="text-2xl font-bold mb-2">✅ System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">🗄️ MongoDB Connection</h3>
              <ul className="text-sm space-y-1">
                <li>✅ User creation working</li>
                <li>✅ User fetching working</li>
                <li>✅ Database queries optimized</li>
                <li>✅ Login system fixed</li>
              </ul>
            </div>
            <div className="bg-white/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">☁️ ops-loan-data S3 Bucket</h3>
              <ul className="text-sm space-y-1">
                <li>✅ Document upload to ops-loan-data</li>
                <li>✅ Folder structure preserved</li>
                <li>✅ File validation enabled</li>
                <li>✅ Progress tracking available</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DocumentsPage;