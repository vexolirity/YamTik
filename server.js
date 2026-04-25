const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = 'a7k3m9x2p4';
const API_AIO = 'https://api.neoxr.eu/api/aio';
const API_TIKTOK = 'https://api.neoxr.eu/api/tiktok';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware untuk debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Endpoint health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint download video
app.post('/api/download/video', async (req, res) => {
    const { url } = req.body;
    console.log('[VIDEO REQUEST] URL:', url);
    
    if (!url) {
        return res.status(400).json({ error: 'URL tidak boleh kosong' });
    }

    try {
        // Coba API TikTok spesifik dulu
        console.log('[VIDEO] Mencoba API TikTok...');
        const response = await axios.get(API_TIKTOK, {
            params: { url, apikey: API_KEY },
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log('[VIDEO] Response status:', response.status);
        const data = response.data;
        console.log('[VIDEO] Data received:', JSON.stringify(data).substring(0, 200));

        if (data && (data.status === true || data.success === true)) {
            return res.json({
                success: true,
                title: data.title || data.desc || 'TikTok Video',
                author: data.author || data.nickname || data.owner?.username || 'TikTok User',
                videoUrl: data.video || data.url || data.link || data.play,
                cover: data.cover || data.thumbnail || '',
                duration: data.duration || '0'
            });
        }
        
        throw new Error(data.message || 'Gagal mengambil video');
        
    } catch (error) {
        console.log('[VIDEO] Error, mencoba fallback ke AIO...');
        
        // Fallback ke API AIO
        try {
            const fallbackRes = await axios.get(API_AIO, {
                params: { url, apikey: API_KEY },
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const fbData = fallbackRes.data;
            console.log('[AIO] Response:', JSON.stringify(fbData).substring(0, 200));
            
            if (fbData && (fbData.status === true || fbData.success === true)) {
                return res.json({
                    success: true,
                    title: fbData.title || fbData.desc || 'TikTok Video',
                    author: fbData.author || fbData.nickname || 'TikTok User',
                    videoUrl: fbData.video || fbData.url || fbData.link,
                    cover: fbData.cover || fbData.thumbnail || '',
                    duration: fbData.duration || '0'
                });
            } else {
                return res.status(500).json({ 
                    error: 'Gagal memproses link. Pastikan URL TikTok valid dan coba lagi.',
                    detail: fbData?.message || 'Unknown error'
                });
            }
        } catch (fallbackError) {
            console.error('[FALLBACK ERROR]:', fallbackError.message);
            return res.status(500).json({ 
                error: 'Service sedang sibuk. Silakan coba beberapa saat lagi.',
                detail: fallbackError.message
            });
        }
    }
});

// Endpoint download MP3
app.post('/api/download/mp3', async (req, res) => {
    const { url } = req.body;
    console.log('[MP3 REQUEST] URL:', url);
    
    if (!url) {
        return res.status(400).json({ error: 'URL tidak boleh kosong' });
    }

    try {
        const response = await axios.get(API_AIO, {
            params: { url, apikey: API_KEY },
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = response.data;
        console.log('[MP3] Response:', JSON.stringify(data).substring(0, 300));

        if (data && (data.status === true || data.success === true)) {
            // Cari audio URL
            const audioUrl = data.audio || data.music || data.mp3 || 
                            data.link_audio || data.audio_url ||
                            (data.links && (data.links.audio || data.links.mp3)) ||
                            (data.result && data.result.audio) || '';
            
            if (!audioUrl) {
                return res.status(500).json({ error: 'Tidak dapat menemukan audio dari video ini' });
            }

            return res.json({
                success: true,
                title: (data.title || data.desc || 'TikTok Audio'),
                author: data.author || data.nickname || 'TikTok User',
                audioUrl: audioUrl,
                cover: data.cover || data.thumbnail || '',
                duration: data.duration || '0'
            });
        } else {
            return res.status(500).json({ 
                error: 'Gagal mengambil audio',
                detail: data?.message || 'Unknown error'
            });
        }
    } catch (error) {
        console.error('[MP3 ERROR]:', error.message);
        return res.status(500).json({ 
            error: 'Gagal ekstrak audio. Pastikan link valid dan coba lagi.',
            detail: error.message
        });
    }
});

// Catch-all untuk SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║     🎵 YAMTIK TIKTOK DOWNLOADER      ║
    ╠═══════════════════════════════════════╣
    ║  Server running on http://localhost:${PORT} ║
    ║  API Key: ${API_KEY}                      ║
    ║  Status: ✅ Ready to use               ║
    ╚═══════════════════════════════════════╝
    `);
});
