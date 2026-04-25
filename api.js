// API Configuration
const API_BASE = '/api';

let currentFormat = 'video';
let currentData = null;

// DOM Elements
const videoFormatCard = document.querySelector('.format-card.video');
const audioFormatCard = document.querySelector('.format-card.audio');
const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const resultCard = document.getElementById('resultCard');
const errorMessageDiv = document.getElementById('errorMessage');
const videoContainer = document.getElementById('videoContainer');
const resultTitle = document.getElementById('resultTitle');
const resultMeta = document.getElementById('resultMeta');
const actionButtons = document.getElementById('actionButtons');

// Format Selection
function setActiveFormat(format) {
    currentFormat = format;
    
    if (format === 'video') {
        videoFormatCard.classList.add('active');
        audioFormatCard.classList.remove('active');
    } else {
        audioFormatCard.classList.add('active');
        videoFormatCard.classList.remove('active');
    }
}

videoFormatCard.addEventListener('click', () => setActiveFormat('video'));
audioFormatCard.addEventListener('click', () => setActiveFormat('audio'));

// Helper Functions
function showLoading() {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<span class="loading"></span> Memproses...';
    hideError();
    resultCard.classList.remove('show');
}

function hideLoading() {
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '⬇️ AMBIL';
}

function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.add('show');
    setTimeout(() => {
        errorMessageDiv.classList.remove('show');
    }, 5000);
}

function hideError() {
    errorMessageDiv.classList.remove('show');
}

function isValidUrl(url) {
    return url.includes('tiktok.com') || url.includes('vt.tiktok.com');
}

// Extract Video ID from URL
function extractVideoId(url) {
    const patterns = [
        /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
        /tiktok\.com\/t\/([\w]+)/,
        /vt\.tiktok\.com\/([\w]+)/
    ];
    
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Display Result
function displayResult(data, format) {
    resultCard.classList.add('show');
    
    if (format === 'video') {
        // Video Preview
        videoContainer.innerHTML = `
            <video class="video-preview" controls>
                <source src="${data.video_url}" type="video/mp4">
                Browser Anda tidak mendukung video tag.
            </video>
        `;
        
        resultTitle.textContent = data.title || 'Video TikTok';
        resultMeta.textContent = `📊 Durasi: ${data.duration || 'N/A'} | 👁️ ${data.views || 'N/A'} views`;
        
        actionButtons.innerHTML = `
            <a href="${data.video_url}" download class="action-btn download-item" target="_blank">
                ⬇️ Download Video (MP4)
            </a>
            <button class="action-btn" style="background:#6c757d;color:white;" onclick="copyToClipboard('${data.video_url}')">
                📋 Copy Link
            </button>
        `;
    } else {
        // Audio Only
        videoContainer.innerHTML = `
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;border-radius:12px;text-align:center;color:white;">
                <div style="font-size:48px;margin-bottom:10px;">🎵</div>
                <div style="font-weight:bold;">Audio Siap Didownload</div>
                <audio controls style="margin-top:15px;width:100%;">
                    <source src="${data.audio_url}" type="audio/mpeg">
                </audio>
            </div>
        `;
        
        resultTitle.textContent = data.title || 'Audio TikTok';
        resultMeta.textContent = `🎵 Format: MP3 | 📊 Kualitas: High Quality`;
        
        actionButtons.innerHTML = `
            <a href="${data.audio_url}" download class="action-btn download-item" target="_blank">
                ⬇️ Download MP3
            </a>
            <button class="action-btn" style="background:#6c757d;color:white;" onclick="copyToClipboard('${data.audio_url}')">
                📋 Copy Link
            </button>
        `;
    }
    
    currentData = data;
}

// Copy to Clipboard
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showTemporaryMessage('Link disalin ke clipboard!');
    }).catch(() => {
        showError('Gagal menyalin link');
    });
};

function showTemporaryMessage(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #28a745;
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Main Download Function
async function downloadTikTok() {
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('❌ Masukkan URL TikTok terlebih dahulu!');
        return;
    }
    
    if (!isValidUrl(url)) {
        showError('❌ URL tidak valid! Pastikan URL berasal dari TikTok.');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                format: currentFormat
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Gagal mendownload video');
        }
        
        displayResult(data.data, currentFormat);
        
    } catch (error) {
        console.error('Error:', error);
        showError(`❌ ${error.message || 'Terjadi kesalahan. Silakan coba lagi.'}`);
        resultCard.classList.remove('show');
    } finally {
        hideLoading();
    }
}

// Event Listeners
downloadBtn.addEventListener('click', downloadTikTok);

urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        downloadTikTok();
    }
});

// Auto-detect paste
urlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const pastedUrl = urlInput.value.trim();
        if (isValidUrl(pastedUrl)) {
            console.log('Valid TikTok URL detected');
        }
    }, 100);
});
