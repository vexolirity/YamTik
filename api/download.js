// API endpoint untuk TikTok Downloader
const API_KEY = 'a7k3m9x2p4';
const API_ALLINONE = 'https://api.neoxr.eu/api/tiktok?url={URL_TIKTOK}&apikey=a7k3m9x2p4';
const API_TIKTOK = 'https://api.neoxr.eu/api/aio?url={URL_TIKTOK}&apikey=a7k3m9x2p4';

// Helper untuk fetch dengan timeout
async function fetchWithTimeout(url, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Extract video ID dari URL
function extractVideoId(url) {
    const patterns = [
        /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
        /tiktok\.com\/t\/([\w]+)/,
        /vt\.tiktok\.com\/([\w]+)/,
        /tiktok\.com\/@[\w.]+\/v\/video\/(\d+)/
    ];
    
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Validasi URL TikTok
function isValidTikTokUrl(url) {
    const patterns = [
        /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[@a-zA-Z0-9_.]+\/video\/\d+/,
        /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/t\/[\w]+/,
        /https?:\/\/(www\.)?tiktok\.com\/@[\w.]+\/v\/video\/\d+/
    ];
    return patterns.some(pattern => pattern.test(url));
}

// API Handler utama
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
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
            message: 'URL TikTok tidak valid' 
        });
    }
    
    if (!format || !['video', 'audio'].includes(format)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Format harus video atau audio' 
        });
    }
    
    try {
        console.log(`Processing TikTok URL: ${url} in format: ${format}`);
        
        // Gunakan API All-in-One dulu
        let apiUrl = API_ALLINONE.replace('{URL_TIKTOK}', encodeURIComponent(url));
        let response = await fetchWithTimeout(apiUrl);
        
        // Jika gagal, coba API kedua
        if (!response.ok) {
            console.log('API pertama gagal, mencoba API kedua...');
            apiUrl = API_TIKTOK.replace('{URL_TIKTOK}', encodeURIComponent(url));
            response = await fetchWithTimeout(apiUrl);
        }
        
        if (!response.ok) {
            throw new Error(`API response error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response received');
        
        // Parse response dari API
        let result;
        if (data.status && data.data) {
            result = data.data;
        } else if (data.result) {
            result = data.result;
        } else {
            result = data;
        }
        
        // Extract video dan audio URLs
        let videoUrl = result.video || result.video_url || result.play || result.nowatermark || result.watermark;
        let audioUrl = result.audio || result.music || result.audio_url || result.mp3;
        
        // Jika videoUrl masih undefined, coba cari di object
        if (!videoUrl && result.no_watermark) videoUrl = result.no_watermark;
        if (!videoUrl && result.nowatermark_hd) videoUrl = result.nowatermark_hd;
        
        // Fallback jika API tidak mengembalikan URL
        if (!videoUrl && !audioUrl) {
            throw new Error('Tidak dapat mengekstrak URL media dari response API');
        }
        
        // Untuk format audio, pastikan kita punya audio URL
        if (format === 'audio' && !audioUrl && videoUrl) {
            // Jika audio tidak tersedia tapi video ada, kita bisa extract audio nanti
            audioUrl = videoUrl;
        }
        
        const responseData = {
            title: result.title || result.desc || 'TikTok Video',
            duration: result.duration || 'N/A',
            views: result.views || result.play_count || 'N/A',
            author: result.author || result.nickname || 'Unknown',
            video_url: videoUrl || null,
            audio_url: audioUrl || videoUrl || null,
            thumbnail: result.thumbnail || result.cover || null
        };
        
        // Validasi berdasarkan format
        if (format === 'video' && !responseData.video_url) {
            throw new Error('Video URL tidak tersedia untuk format ini');
        }
        
        if (format === 'audio' && !responseData.audio_url) {
            throw new Error('Audio URL tidak tersedia untuk format ini');
        }
        
        return res.status(200).json({
            success: true,
            message: 'Berhasil mendapatkan media',
            data: responseData
        });
        
    } catch (error) {
        console.error('Download error:', error.message);
        
        let errorMessage = 'Gagal mendownload video. ';
        
        if (error.name === 'AbortError') {
            errorMessage += 'Waktu habis. Silakan coba lagi.';
        } else if (error.message.includes('fetch')) {
            errorMessage += 'Koneksi gagal. Periksa koneksi internet Anda.';
        } else {
            errorMessage += error.message;
        }
        
        return res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
}
