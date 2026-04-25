// TikTok Downloader API - Fully Fixed
const API_KEY = 'a7k3m9x2p4';

// Multiple API endpoints for redundancy
const APIS = [
    `https://api.neoxr.eu/api/tiktok?apikey=${API_KEY}&url={URL}`,
    `https://api.neoxr.eu/api/aio?apikey=${API_KEY}&url={URL}`,
    `https://api.ryzendesu.vip/api/downloader/tiktok?url={URL}`,
    `https://api.agung.me.id/api/download/tiktok?url={URL}`
];

// Helper untuk fetch dengan timeout
async function fetchWithTimeout(url, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Extract video info dari response
function extractMediaData(response, url) {
    // Coba berbagai format response yang mungkin
    let data = response;
    
    // Handle response dengan struktur berbeda
    if (response.data) data = response.data;
    if (response.result) data = response.result;
    if (response.video) data = response;
    
    // Cari video URL (no watermark)
    let videoUrl = data.video || 
                   data.video_url || 
                   data.nowatermark || 
                   data.nowatermark_hd || 
                   data.no_watermark ||
                   data.play ||
                   data.url;
    
    // Cari audio URL
    let audioUrl = data.audio || 
                   data.music || 
                   data.audio_url || 
                   data.mp3;
    
    // Cari informasi lainnya
    const title = data.title || data.desc || 'TikTok Video';
    const duration = data.duration || '00:00';
    const views = data.views || data.play_count || '0';
    const author = data.author || data.nickname || data.unique_id || 'Unknown';
    const thumbnail = data.thumbnail || data.cover;
    
    // Jika videoUrl masih null, coba ekstrak dari berbagai field
    if (!videoUrl) {
        const fields = ['wm', 'watermark', 'hdplay', 'play', 'url_1', 'url_2'];
        for (let field of fields) {
            if (data[field] && typeof data[field] === 'string') {
                videoUrl = data[field];
                break;
            }
        }
    }
    
    // Clean URLs
    if (videoUrl) videoUrl = videoUrl.replace(/\\/g, '');
    if (audioUrl) audioUrl = audioUrl.replace(/\\/g, '');
    
    return {
        success: true,
        video_url: videoUrl,
        audio_url: audioUrl || videoUrl, // fallback ke video jika audio tidak ada
        title: title,
        duration: duration,
        views: views,
        author: author,
        thumbnail: thumbnail
    };
}

// Coba semua API sampai berhasil
async function tryAllApis(url) {
    const errors = [];
    
    for (let i = 0; i < APIS.length; i++) {
        const apiUrl = APIS[i].replace('{URL}', encodeURIComponent(url));
        
        try {
            console.log(`Mencoba API ${i + 1}: ${APIS[i].split('?')[0]}`);
            
            const response = await fetchWithTimeout(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cek apakah response valid
            if (data && (data.video || data.nowatermark || data.data || data.result)) {
                console.log(`API ${i + 1} berhasil!`);
                return extractMediaData(data, url);
            }
            
            errors.push(`API ${i + 1}: Response tidak valid`);
            
        } catch (error) {
            console.log(`API ${i + 1} gagal: ${error.message}`);
            errors.push(`API ${i + 1}: ${error.message}`);
        }
    }
    
    throw new Error(`Semua API gagal: ${errors.join('; ')}`);
}

// Validasi URL TikTok
function isValidTikTokUrl(url) {
    const patterns = [
        /https?:\/\/(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
        /https?:\/\/(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/t\/[\w]+/,
        /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/v\/\d+/,
        /https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[\w]+/
    ];
    return patterns.some(pattern => pattern.test(url));
}

// Main handler
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
            success: false, 
            message: 'Method not allowed' 
        });
    }
    
    const { url, format } = req.body;
    
    // Validasi input
    if (!url) {
        return res.status(400).json({ 
            success: false, 
            message: 'URL TikTok diperlukan' 
        });
    }
    
    if (!isValidTikTokUrl(url)) {
        return res.status(400).json({ 
            success: false, 
            message: 'URL TikTok tidak valid. Pastikan URL benar.' 
        });
    }
    
    if (!format || !['video', 'audio'].includes(format)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Format harus video atau audio' 
        });
    }
    
    try {
        console.log(`Processing: ${url} (${format})`);
        
        // Coba semua API
        const mediaData = await tryAllApis(url);
        
        // Validasi berdasarkan format
        if (format === 'video' && !mediaData.video_url) {
            throw new Error('Video URL tidak tersedia untuk format ini');
        }
        
        if (format === 'audio' && !mediaData.audio_url) {
            // Jika audio tidak ada, kita tetap bisa download dari video
            if (mediaData.video_url) {
                mediaData.audio_url = mediaData.video_url;
            } else {
                throw new Error('Audio URL tidak tersedia');
            }
        }
        
        // Return response
        return res.status(200).json({
            success: true,
            message: 'Berhasil mendapatkan media',
            data: {
                video_url: mediaData.video_url,
                audio_url: mediaData.audio_url,
                title: mediaData.title,
                duration: mediaData.duration,
                views: mediaData.views,
                author: mediaData.author,
                thumbnail: mediaData.thumbnail
            }
        });
        
    } catch (error) {
        console.error('Error detail:', error);
        
        let errorMessage = 'Gagal mendownload video. ';
        
        if (error.message.includes('fetch') || error.message.includes('network')) {
            errorMessage += 'Periksa koneksi internet Anda.';
        } else if (error.message.includes('timeout')) {
            errorMessage += 'Waktu habis. Silakan coba lagi.';
        } else if (error.message.includes('API')) {
            errorMessage += 'Server sedang sibuk. Coba lagi nanti.';
        } else {
            errorMessage += error.message;
        }
        
        return res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
}
