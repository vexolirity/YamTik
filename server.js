const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = 'a7k3m9x2p4';
const API_AIO = 'https://api.neoxr.eu/api/aio';
const API_TIKTOK = 'https://api.neoxr.eu/api/tiktok';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Endpoint download video
app.post('/api/download', async (req, res) => {
    const { url, type } = req.body;
    
    console.log(`📥 Request: ${type} | URL: ${url}`);
    
    if (!url) {
        return res.status(400).json({ 
            success: false, 
            error: 'URL tidak boleh kosong' 
        });
    }

    try {
        // Gunakan API AIO untuk semua (lebih stabil)
        const response = await axios.get(API_AIO, {
            params: { 
                url: url, 
                apikey: API_KEY 
            },
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log('📦 API Response:', JSON.stringify(response.data).substring(0, 300));

        const data = response.data;

        // Cek apakah response sukses
        if (data.status === true || data.success === true) {
            
            if (type === 'mp3') {
                // Cari audio URL dari berbagai kemungkinan
                const audioUrl = data.audio || data.music || data.mp3 || 
                                (data.result && data.result.audio) ||
                                (data.links && (data.links.audio || data.links.mp3));
                
                if (!audioUrl) {
                    return res.json({
                        success: false,
                        error: 'Tidak ditemukan audio untuk video ini'
                    });
                }
                
                return res.json({
                    success: true,
                    title: data.title || data.desc || 'TikTok Audio',
                    author: data.author || data.nickname || 'TikTok User',
                    downloadUrl: audioUrl,
                    cover: data.cover || data.thumbnail || '',
                    duration: data.duration || '0'
                });
            } 
            else {
                // Type video
                const videoUrl = data.video || data.url || data.link || data.play;
                
                if (!videoUrl) {
                    return res.json({
                        success: false,
                        error: 'Tidak ditemukan video untuk link ini'
                    });
                }
                
                return res.json({
                    success: true,
                    title: data.title || data.desc || 'TikTok Video',
                    author: data.author || data.nickname || 'TikTok User',
                    downloadUrl: videoUrl,
                    cover: data.cover || data.thumbnail || '',
                    duration: data.duration || '0'
                });
            }
        } else {
            return res.json({
                success: false,
                error: data.message || 'Gagal memproses link TikTok'
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Fallback ke API TikTok spesifik
        try {
            console.log('🔄 Mencoba API TikTok spesifik...');
            const fallbackRes = await axios.get(API_TIKTOK, {
                params: { url, apikey: API_KEY },
                timeout: 20000
            });
            
            const fbData = fallbackRes.data;
            
            if (fbData.status === true || fbData.success === true) {
                if (type === 'mp3') {
                    const audioUrl = fbData.audio || fbData.music;
                    return res.json({
                        success: true,
                        title: fbData.title || 'TikTok Audio',
                        author: fbData.author || 'TikTok User',
                        downloadUrl: audioUrl,
                        cover: fbData.cover || '',
                        duration: fbData.duration || '0'
                    });
                } else {
                    return res.json({
                        success: true,
                        title: fbData.title || 'TikTok Video',
                        author: fbData.author || 'TikTok User',
                        downloadUrl: fbData.video || fbData.url,
                        cover: fbData.cover || '',
                        duration: fbData.duration || '0'
                    });
                }
            }
        } catch (fallbackErr) {
            console.error('❌ Fallback juga gagal:', fallbackErr.message);
        }
        
        return res.json({
            success: false,
            error: 'Service sedang sibuk. Silakan coba lagi nanti.'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║     🎵 TIKTOK DOWNLOADER READY       ║
    ╠═══════════════════════════════════════╣
    ║  URL: http://localhost:${PORT}          ║
    ║  API Key: ${API_KEY}                    ║
    ║  Status: ✅ RUNNING                    ║
    ╚═══════════════════════════════════════╝
    `);
});
