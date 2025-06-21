import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { S3Client, ListObjectsV2Command, GetBucketLocationCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    const bucketName = process.env.S3_BUCKET_NAME!;
    
    console.log(`📊 Getting S3 bucket statistics for: ${bucketName}`);
    
    // Get bucket location
    let bucketLocation = 'unknown';
    try {
      const locationCommand = new GetBucketLocationCommand({ Bucket: bucketName });
      const locationResult = await s3Client.send(locationCommand);
      bucketLocation = locationResult.LocationConstraint || 'us-east-1';
    } catch (error) {
      console.warn('Could not get bucket location:', error);
    }
    
    // List all objects in the bucket with pagination
    let allObjects: any[] = [];
    let continuationToken: string | undefined = undefined;
    let totalSize = 0;
    let folderStats: { [key: string]: { count: number; size: number } } = {};
    
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000 // Get up to 1000 objects per request
      });
      
      const response = await s3Client.send(listCommand);
      
      if (response.Contents) {
        allObjects.push(...response.Contents);
        
        // Calculate statistics
        response.Contents.forEach(obj => {
          const size = obj.Size || 0;
          totalSize += size;
          
          // Determine folder/prefix
          const key = obj.Key || '';
          const folderMatch = key.match(/^([^\/]+)\//);
          const folder = folderMatch ? folderMatch[1] : 'root';
          
          if (!folderStats[folder]) {
            folderStats[folder] = { count: 0, size: 0 };
          }
          folderStats[folder].count++;
          folderStats[folder].size += size;
        });
      }
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    
    // Get file type distribution
    const fileTypes: { [key: string]: { count: number; size: number } } = {};
    allObjects.forEach(obj => {
      const key = obj.Key || '';
      const extension = key.split('.').pop()?.toLowerCase() || 'no-extension';
      const size = obj.Size || 0;
      
      if (!fileTypes[extension]) {
        fileTypes[extension] = { count: 0, size: 0 };
      }
      fileTypes[extension].count++;
      fileTypes[extension].size += size;
    });
    
    // Find largest and smallest files
    const sortedBySize = [...allObjects].sort((a, b) => (b.Size || 0) - (a.Size || 0));
    const largestFiles = sortedBySize.slice(0, 5).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      sizeFormatted: formatBytes(obj.Size || 0),
      lastModified: obj.LastModified
    }));
    
    // Recent files (last 10)
    const sortedByDate = [...allObjects].sort((a, b) => 
      new Date(b.LastModified || 0).getTime() - new Date(a.LastModified || 0).getTime()
    );
    const recentFiles = sortedByDate.slice(0, 10).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      sizeFormatted: formatBytes(obj.Size || 0),
      lastModified: obj.LastModified
    }));
    
    // Format folder stats for display
    const formattedFolderStats = Object.entries(folderStats).map(([folder, stats]) => ({
      folder,
      fileCount: stats.count,
      totalSize: stats.size,
      totalSizeFormatted: formatBytes(stats.size),
      averageFileSize: stats.count > 0 ? Math.round(stats.size / stats.count) : 0,
      averageFileSizeFormatted: stats.count > 0 ? formatBytes(Math.round(stats.size / stats.count)) : '0 B'
    })).sort((a, b) => b.totalSize - a.totalSize);
    
    // Format file type stats
    const formattedFileTypes = Object.entries(fileTypes).map(([type, stats]) => ({
      fileType: type,
      count: stats.count,
      totalSize: stats.size,
      totalSizeFormatted: formatBytes(stats.size),
      percentage: allObjects.length > 0 ? ((stats.count / allObjects.length) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.count - a.count);
    
    const statistics = {
      bucket: {
        name: bucketName,
        region: bucketLocation,
        lastScanned: new Date().toISOString()
      },
      summary: {
        totalFiles: allObjects.length,
        totalSize: totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        averageFileSize: allObjects.length > 0 ? Math.round(totalSize / allObjects.length) : 0,
        averageFileSizeFormatted: allObjects.length > 0 ? formatBytes(Math.round(totalSize / allObjects.length)) : '0 B'
      },
      folders: formattedFolderStats,
      fileTypes: formattedFileTypes,
      largestFiles,
      recentFiles,
      isEmpty: allObjects.length === 0
    };
    
    console.log(`📊 S3 Statistics Summary:
    - Total Files: ${allObjects.length}
    - Total Size: ${formatBytes(totalSize)}
    - Folders: ${Object.keys(folderStats).length}
    - File Types: ${Object.keys(fileTypes).length}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully analyzed ${allObjects.length} objects in bucket ${bucketName}`,
      statistics
    });
    
  } catch (error: any) {
    console.error('Error getting S3 bucket statistics:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get S3 bucket statistics',
      error: error.message
    }, { status: 500 });
  }
}

// Utility function to format bytes into human readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 