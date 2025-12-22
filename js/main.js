/**
 * js/main.js - v1.1.7
 * UI 및 이벤트 제어
 */
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    document.getElementById('upload-btn').addEventListener('click', async () => {
        // 1. 객체 존재 여부 체크 (undefined 방어)
        if (typeof VisaAPI === 'undefined' || !VisaAPI.uploadPDF) {
            alert("시스템 엔진(api.js)이 아직 로드되지 않았습니다. 잠시 후 다시 시도하거나 새로고침(F5) 해주세요.");
            return;
        }

        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("API 키와 정책 파일을 모두 준비해주세요.");

        document.getElementById('progress-container').style.display = 'block';
        pText.innerText = "서버 연결 시도 중...";

        try {
            // 2. 안전하게 호출
            const data = await VisaAPI.uploadPDF(key, file, (percent) => {
                pBar.style.width = percent + '%';
                pBar.innerText = percent + '%';
                pText.innerText = `업로드 중... (${percent}%)`;
            });
            
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            pText.innerText = "✅ 성공: 출입국 정책 데이터 동기화됨";
            
        } catch(e) {
            pText.innerText = "❌ 오류: " + e.message;
            pBar.style.background = "#c0392b";
            console.error(e);
        }
    });
});