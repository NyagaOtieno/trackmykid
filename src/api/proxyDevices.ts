import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = process.env.MYTRACK_API_KEY;
    const response = await axios.get(
      'https://mytrack-production.up.railway.app/api/devices/list',
      { headers: { 'X-API-Key': token } }
    );
    res.status(200).json(response.data);
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
}
