// TikTok Downloader API - Production Ready for Vercel
const API_KEY = 'a7k3m9x2p4';
const API_URL = 'https://api.neoxr.eu/api/aio';

// Helper: Fetch with timeout
async function fetchWithTimeout(url, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Helper: Validate TikTok URL
function isValidTikTokUrl(url) {
    const patterns = [
        /tiktok\.com\/@[\w.-]+\/video\/\d+/,
        /tiktok\.com\/t\/[\w]+/,
        /vt\.tiktok\.com\/[\w]+/,
        /tiktok\.com\/@[\w.-]+\/v\/\d+/
    ];
    return patterns.some(pattern => pattern.test(url));
}

// Main handler for Vercel
export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            status: false, 
            message: 'Method not allowed' 
        });
    }
    
    const { url } = req.body;
    
    // Validate input
    if (!url) {
        return res.status(400).json({ 
            status: false, 
            message: 'URL TikTok diperlukan' 
        });
    }
    
    if (!isValidTikTokUrl(url)) {
        return res.status(400).json({ 
            status: false, 
            message: 'URL TikTok tidak valid' 
        });
    }
    
    try {
        console.log(`Processing: ${url}`);
        
        // Call Neoxr API
        const apiCallUrl = `${API_URL}?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
        const response = await fetchWithTimeout(apiCallUrl, 30000);
        
        if (!response.ok) {
            throw new Error(`API response error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check API response
        if (data.status === false || data.error) {
            throw new Error(data.message || data.error || 'API mengembalikan error');
        }
        
        // Extract result
        const result = data.data || data.result || data;
        
        // Prepare response
        const responseData = {
            status: true,
            message: 'success',
            result: {
                title: result.title || result.desc || 'TikTok Video',
                author: result.author || result.nickname || result.unique_id || 'Unknown',
                duration: result.duration || '00:00',
                views: result.views || result.play_count || 0,
                likes: result.likes || result.digg_count || 0,
                comments: result.comments || result.comment_count || 0,
                shares: result.shares || result.share_count || 0,
                thumbnail: result.thumbnail || result.cover || null,
                nowatermark: result.nowatermark || result.video || result.play || null,
                nowatermark_hd: result.nowatermark_hd || result.hdplay || null,
                watermark: result.watermark || result.wm || null,
                audio: result.audio || result.music || result.mp3 || null,
                images: result.images || result.photos || (result.album ? result.album : []),
                is_slideshow: !!(result.images || result.photos || (result.album && result.album.length > 0))
            }
        };
        
        // Validate we have content
        const hasContent = responseData.result.nowatermark || 
                          responseData.result.watermark || 
                          responseData.result.audio ||
                          (responseData.result.images && responseData.result.images.length > 0);
        
        if (!hasContent) {
