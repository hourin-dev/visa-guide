document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // API 키 불러오기
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("키와 파일을 확인하세요.");

        // 키 저장 로직
        if(document.getElementById('chkSaveKey').checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);
        else localStorage.removeItem(CONFIG.STORAGE_KEY);

        pCont.style.display = 'block';
        pBar.style.width = '0%';
        pBar.innerText = '0%';
        pText.innerText = "정책 파일 분석 준비 중...";

        try {
            // 이제 VisaAPI가 정의되어 있으므로 에러가 발생하지 않습니다.
            const data = await VisaAPI.uploadPDF(key, file, (percent) => {
                pBar.style.width = percent + '%';
                pBar.innerText = percent + '%';
                pText.innerText = percent < 100 ? `서버 전송 중...` : `전송 완료! 처리 중...`;
            });
            
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            pText.innerText = "✅ 출입국 정책 동기화 성공!";
        } catch(e) {
            pText.innerText = "❌ 오류: " + e.message;
            pBar.style.background = "#c0392b";
        }
    });
});