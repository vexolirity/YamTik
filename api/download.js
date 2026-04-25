// TikTok Downloader API - Vercel Serverless Function
const API_KEY = 'a7k3m9x2p4';
const API_URL = 'https://api.neoxr.eu/api/aio';

let activeUsers = new Map();

function cleanInactiveUsers() {
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    for (const [sessionId, timestamp] of activeUsers.entries()) {
        if (now - timestamp > FIVE_MINUTES) {
            activeUsers.delete(sessionId);
        }
    }
}

function getOnlineUsersCount() {
    cleanInactiveUsers();
    return activeUsers.size;
}

function registerUser(sessionId) {
    cleanInactiveUsers();
    activeUsers.set(sessionId, Date.now());
    return activeUsers.size;
}

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

function isValidTikTokUrl(url) {
    const patterns = [
        /tiktok\.com\/@[\w.-]+\/video\/\d+/,
        /tiktok\.com\/t\/[\w]+/,
        /vt\.tiktok\.com\/[\w]+/,
        /tiktok\.com\/@[\w.-]+\/v\/\d+/
    ];
    return patterns.some(pattern => pattern.test(url));
}

// Helper untuk format duration (detik → mm:ss)
function formatDuration(seconds) {
    if (!seconds || seconds === '00:00') return '00:00';
    if (typeof seconds === 'string' && seconds.includes(':')) return seconds;
    const num = parseInt(seconds);
    if (isNaN(num)) return '00:00';
    const mins = Math.floor(num / 60);
    const secs = num % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper untuk format angka (views, likes)
function parseNumber(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Handle "1.2M", "500K", dll
        const clean = value.toLowerCase().replace(/[^0-9.]/g, '');
        const num = parseFloat(clean);
        if (value.includes('m')) return Math.round(num * 1000000);
        if (value.includes('k')) return Math.round(num * 1000);
        return Math.round(num) || 0;
    }
    return 0;
}

// Extract data dari berbagai format response API
function extractMediaData(result) {
    // Coba berbagai kemungkinan field
    const data = result;
    
    // Title / Description
    let title = data.title || data.desc || data.description || data.caption || 'TikTok Video';
    if (typeof title === 'object') title = title.text || JSON.stringify(title);
    
    // Author / Username
    let author = data.author || data.nickname || data.unique_id || data.username || data.owner?.username || 'Unknown';
    if (typeof author === 'object') author = author.unique_id || author.username || author.nickname || 'Unknown';
    
    // Duration
    let duration = data.duration || data.video_duration || data.play_duration || '00:00';
    if (typeof duration === 'number') duration = formatDuration(duration);
    
    // Views / Play Count
    let views = parseNumber(data.views || data.play_count || data.video_views || data.stats?.playCount || 0);
    
    // Likes
    let likes = parseNumber(data.likes || data.digg_count || data.like_count || data.stats?.diggCount || 0);
    
    // Comments
    let comments = parseNumber(data.comments || data.comment_count || data.stats?.commentCount || 0);
    
    // Shares
    let shares = parseNumber(data.shares || data.share_count || data.stats?.shareCount || 0);
    
    // Thumbnail
    let thumbnail = data.thumbnail || data.cover || data.video_cover || data.origin_cover || null;
    
    // Video URLs
    let nowatermark = data.nowatermark || data.no_watermark || data.video_no_watermark || 
                      data.video?.no_watermark || data.play || data.video_url || null;
    
    let nowatermark_hd = data.nowatermark_hd || data.hdplay || data.video_hd || 
                         data.video?.hd || data.hd_video || null;
    
    let watermark = data.watermark || data.wm || data.video_watermark || 
                    data.video?.watermark || null;
    
    // Audio
    let audio = data.audio || data.music || data.mp3 || data.audio_url || 
                data.music_info?.play_url || null;
    
    // Images for slideshow
    let images = data.images || data.photos || data.album || 
                 (data.imagePost && data.imagePost.images) || [];
    
    return {
        title: title,
        author: author,
        duration: duration,
        views: views,
        likes: likes,
        comments: comments,
        shares: shares,
        thumbnail: thumbnail,
        nowatermark: nowatermark,
        nowatermark_hd: nowatermark_hd,
        watermark: watermark,
        audio: audio,
        images: Array.isArray(images) ? images : (images ? [images] : [])
    };
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const urlPath = req.url || '';
    
    // Health check
    if (urlPath.includes('/health') && req.method === 'GET') {
        return res.status(200).json({ 
            status: 'ok', 
            timestamp: Date.now(),
            onlineUsers: getOnlineUsersCount()
        });
    }
    
    // Online users
    if (urlPath.includes('/online') && req.method === 'GET') {
        return res.status(200).json({ 
            status: true,
            onlineUsers: getOnlineUsersCount()
        });
    }
    
    // Register user
    if (urlPath.includes('/register') && req.method === 'POST') {
        try {
            const { sessionId } = req.body;
            if (sessionId) {
                const count = registerUser(sessionId);
                return res.status(200).json({ status: true, onlineUsers: count });
            }
        } catch (e) {}
        return res.status(200).json({ status: true, onlineUsers: getOnlineUsersCount() });
    }
    
    // Download endpoint
    if (req.method !== 'POST') {
        return res.status(405).json({ status: false, message: 'Method not allowed' });
    }
    
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ status: false, message: 'URL TikTok diperlukan' });
    }
    
    if (!isValidTikTokUrl(url)) {
        return res.status(400).json({ status: false, message: 'URL TikTok tidak valid' });
    }
    
    try {
        console.log(`[${new Date().toISOString()}] Processing: ${url}`);
        
        const apiCallUrl = `${API_URL}?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
        const response = await fetchWithTimeout(apiCallUrl, 30000);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === false || data.error) {
            throw new Error(data.message || data.error || 'API error');
        }
        
        // Extract result dari berbagai kemungkinan struktur
        let result = data.data || data.result || data;
        
        // Jika result masih wrapped, coba lagi
        if (result.data) result = result.data;
        if (result.result) result = result.result;
        
        // Extract semua data dengan parser yang lebih baik
        const extracted = extractMediaData(result);
        
        // Validasi - pastikan setidaknya ada satu konten
        const hasContent = extracted.nowatermark || extracted.watermark || extracted.audio || extracted.images.length > 0;
        
        if (!hasContent) {
            throw new Error('Tidak ada konten yang dapat didownload');
        }
        
        console.log(`Success: ${extracted.title} - Views: ${extracted.views} - Likes: ${extracted.likes}`);
        
        return res.status(200).json({
            status: true,
            message: 'success',
            result: extracted
        });
        
    } catch (error) {
        console.error(`Error:`, error.message);
        
        let errorMessage = 'Gagal memproses video. ';
        if (error.message.includes('timeout')) errorMessage += 'Waktu habis. Coba lagi.';
        else if (error.message.includes('fetch')) errorMessage += 'Koneksi gagal.';
        else if (error.message.includes('JSON')) errorMessage += 'Response tidak valid.';
        else errorMessage += error.message;
        
        return res.status(500).json({ 
            status: false, 
            message: errorMessage,
            // Tetap return data dummy biar UI tidak error
            result: {
                title: 'Video TikTok',
                author: 'TikTok User',
                duration: '00:00',
                views: 0,
                likes: 0,
                thumbnail: null,
                nowatermark: null,
                watermark: null,
                audio: null,
                images: []
            }
        });
    }
}
