document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 저장된 키 로드
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("API 키와 정책 파일을 선택해 주세요.");

        // 키 저장 처리
        if(document.getElementById('chkSaveKey').checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);
        else localStorage.removeItem(CONFIG.STORAGE_KEY);

        pCont.style.display = 'block';
        pBar.style.width = '0%';
        pBar.innerText = '0%';
        pText.innerText = "서버 세션 생성 중...";

        try {
            // 이제 순서대로 로드되었으므로 VisaAPI를 정상적으로 인식합니다.
            const data = await VisaAPI.uploadPDF(key, file, (percent) => {
                pBar.style.width = percent + '%';
                pBar.innerText = percent + '%';
                pText.innerText = percent < 100 ? "구글 클라우드로 전송 중..." : "전송 완료! 정책 동기화 중...";
            });
            
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            pText.innerText = "✅ 출입국 정책 동기화 성공!";
        } catch(e) {
            pText.innerText = "❌ 오류: " + e.message;
            pBar.style.background = "#c0392b";
            console.error(e);
        }
    });
});