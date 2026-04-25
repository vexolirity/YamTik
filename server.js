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
app.post('/api/download/video', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL tidak boleh kosong' });

    try {
        const response = await axios.get(API_TIKTOK, {
            params: { url, apikey: API_KEY },
            timeout: 15000
        });

        const data = response.data;
        if (data.status === true || data.success === true) {
            res.json({
                success: true,
                title: data.title || data.desc || 'TikTok Video',
                author: data.author || data.nickname || 'TikTok User',
                videoUrl: data.video || data.url || data.link,
                cover: data.cover || data.thumbnail || '',
                duration: data.duration || '0'
            });
        } else {
            throw new Error('Gagal mengambil video');
        }
    } catch (error) {
        // Fallback ke API AIO
        try {
            const fallback = await axios.get(API_AIO, {
                params: { url, apikey: API_KEY },
                timeout: 15000
            });
            const fbData = fallback.data;
            if (fbData.status === true || fbData.success === true) {
                res.json({
                    success: true,
                    title: fbData.title || fbData.desc || 'TikTok Video',
                    author: fbData.author || 'TikTok User',
                    videoUrl: fbData.video || fbData.url || fbData.link,
                    cover: fbData.cover || '',
                    duration: fbData.duration || '0'
                });
            } else {
                res.status(500).json({ error: 'Gagal memproses link, coba lagi' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Service sedang sibuk' });
        }
    }
});

// Endpoint download MP3
app.post('/api/download/mp3', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL tidak boleh kosong' });

    try {
        const response = await axios.get(API_AIO, {
            params: { url, apikey: API_KEY },
            timeout: 15000
        });

        const data = response.data;
        if (data.status === true || data.success === true) {
            const audioUrl = data.audio || data.music || data.mp3 || 
                            (data.links && data.links.audio) || '';
            
            if (!audioUrl) throw new Error('Audio tidak ditemukan');

            res.json({
                success: true,
                title: (data.title || data.desc || 'TikTok Audio') + ' (MP3)',
                author: data.author || data.nickname || 'TikTok User',
                audioUrl: audioUrl,
                cover: data.cover || data.thumbnail || '',
                duration: data.duration || '0'
            });
        } else {
            throw new Error('Gagal mengambil audio');
        }
    } catch (error) {
        res.status(500).json({ error: 'Gagal ekstrak audio, pastikan link valid' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 YamTik running at http://localhost:${PORT}`);
    console.log(`🎵 TikTok Downloader siap digunakan!`);
});
