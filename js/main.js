document.addEventListener('DOMContentLoaded', () => {
    // 저장된 API 키 불러오기
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    document.getElementById('upload-btn').addEventListener('click', async () => {
        const keyInput = document.getElementById('apiKey');
        const fileInput = document.getElementById('pdfFile');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');
        const pContainer = document.getElementById('progress-container');

        const key = keyInput.value.trim();
        const file = fileInput.files[0];

        if(!key || !file) return alert("API 키 입력과 정책 파일 선택은 필수입니다.");

        // 키 저장 여부
        if(document.getElementById('chkSaveKey').checked) {
            localStorage.setItem(CONFIG.STORAGE_KEY, key);
        }

        pContainer.style.display = 'block';
        pBar.style.width = '0%';
        pBar.innerText = '0%';
        pText.innerText = "출입국 정책 동기화 시작 중...";

        try {
            // window.VisaAPI를 통해 명확하게 호출
            const data = await window.VisaAPI.uploadPDF(key, file, (percent) => {
                pBar.style.width = percent + '%';
                pBar.innerText = percent + '%';
                pText.innerText = percent < 100 ? `구글 서버로 전송 중...` : `전송 완료! 파일 처리 중...`;
            });
            
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            pText.innerText = "✅ 정책 데이터 동기화 성공!";
            console.log("File URI:", data.file.uri);
            
        } catch(e) {
            pText.innerText = "❌ 오류: " + e.message;
            pBar.style.background = "#c0392b";
            console.error("Upload Error:", e);
        }
    });
});