import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get client IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                     req.headers.get('x-real-ip') || 
                     'Unknown';
    
    // Get public IP information for the server
    let serverPublicIp = 'Unknown';
    try {
      const ipResponse = await axios.get('https://api.ipify.org?format=json');
      serverPublicIp = ipResponse.data.ip;
    } catch (ipError) {
      console.error('Error getting server public IP:', ipError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'IP information retrieved',
      clientIp,
      serverPublicIp,
      ipWhitelistInstructions: `
        To whitelist your IP in MongoDB Atlas:
        1. Go to https://cloud.mongodb.com/
        2. Select your project
        3. Click on "Network Access" in the left sidebar
        4. Click "Add IP Address"
        5. Add one or both of these IPs:
           - Your client IP: ${clientIp}
           - The server IP: ${serverPublicIp}
        6. Add a description like "My app server" or "Development machine"
        7. Click "Confirm"
        
        After adding, allow a few minutes for the changes to propagate.
      `,
      nextSteps: "After adding your IP to the whitelist, try accessing the admin panel again."
    });
  } catch (error) {
    console.error('Error getting IP info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get IP information'
    }, { status: 500 });
  }
} 