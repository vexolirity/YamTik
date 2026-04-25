// DOM Elements
const formatCards = document.querySelectorAll('.format-card');
const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const loadingDiv = document.getElementById('loadingIndicator');
const resultDiv = document.getElementById('resultContainer');

let selectedFormat = 'video';

// Format selection
formatCards.forEach(card => {
    card.addEventListener('click', () => {
        formatCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedFormat = card.dataset.format;
    });
});

// Health check
async function checkServerHealth() {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            console.log('✅ Server connected');
            return true;
        }
    } catch (error) {
        console.error('⚠️ Server not responding:', error);
        showError('Tidak dapat terhubung ke server. Pastikan server backend berjalan.', true);
        return false;
    }
}

// Main download function
async function handleDownload() {
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('❌ Masukkan link TikTok terlebih dahulu!');
        return;
    }

    // Validasi URL TikTok
    if (!url.includes('tiktok.com') && !url.includes('vt.tiktok')) {
        showError('❌ URL tidak valid! Pastikan link dari TikTok.\nContoh: https://vt.tiktok.com/...');
        return;
    }

    // Disable button
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Memproses...';
    
    loadingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    const endpoint = selectedFormat === 'video' ? '/api/download/video' : '/api/download/mp3';

    try {
        console.log(`📤 Sending request to ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url })
        });

        console.log(`📥 Response status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Data received:', data);

        if (data.error) {
            showError(data.error + (data.detail ? `\nDetail: ${data.detail}` : ''));
        } else if (data.success) {
            if (selectedFormat === 'mp3') {
                showMp3Result(data);
            } else {
                showVideoResult(data);
            }
        } else {
            showError(data.message || 'Gagal memproses link. Coba lagi nanti.');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showError(error.message || 'Terjadi kesalahan. Coba periksa koneksi internet Anda.', true);
    } finally {
        loadingDiv.classList.add('hidden');
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> AMBIL';
    }
}

function showVideoResult(data) {
    const durationText = data.duration ? `⏱️ ${data.duration} detik` : '';
    
    resultDiv.innerHTML = `
        <div class="result-card">
            <div class="result-thumb">
                <img src="${data.cover || 'https://via.placeholder.com/100?text=YamTik'}" alt="thumbnail" 
                     onerror="this.src='https://via.placeholder.com/100?text=No+Image'">
            </div>
            <div class="result-info">
                <div class="result-title">📹 ${escapeHtml(data.title).substring(0, 80)}</div>
                <div class="result-author"><i class="fab fa-tiktok"></i> @${escapeHtml(data.author)}</div>
                ${durationText ? `<div class="result-meta">${durationText}</div>` : ''}
                <a href="${data.videoUrl}" class="download-link" download target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-download"></i> Download Video (No Watermark)
                </a>
            </div>
        </div>
    `;
    resultDiv.classList.remove('hidden');
}

function showMp3Result(data) {
    resultDiv.innerHTML = `
        <div class="result-card">
            <div class="result-thumb">
                <img src="${data.cover || 'https://via.placeholder.com/100?text=Audio'}" alt="cover"
                     onerror="this.src='https://via.placeholder.com/100?text=MP3'">
            </div>
            <div class="result-info">
                <div class="result-title">🎵 ${escapeHtml(data.title).substring(0, 80)}</div>
                <div class="result-author"><i class="fas fa-user"></i> ${escapeHtml(data.author)}</div>
                <div class="result-meta">🎧 Format MP3 · Siap download</div>
                <a href="${data.audioUrl}" class="download-link" download target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-headphones"></i> Download MP3
                </a>
            </div>
        </div>
    `;
    resultDiv.classList.remove('hidden');
}

function showError(msg, isConnectionError = false) {
    resultDiv.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(msg)}
            ${isConnectionError ? '<div class="error-detail">💡 Pastikan server backend berjalan: <code>node server.js</code></div>' : ''}
        </div>
    `;
    resultDiv.classList.remove('hidden');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Event listeners
downloadBtn.addEventListener('click', handleDownload);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleDownload();
});

// Check server on load
checkServerHealth();
