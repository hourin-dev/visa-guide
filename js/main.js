document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 1. API 키 로드
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) {
        document.getElementById('apiKey').value = savedKey;
        document.getElementById('chkSaveKey').checked = true;
    }

    // 2. 출입국정책 업로드 버튼 클릭
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pContainer = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("보안 키와 정책 파일을 모두 확인해주세요.");

        // 키 저장 여부 확인
        if(document.getElementById('chkSaveKey').checked) {
            localStorage.setItem(CONFIG.STORAGE_KEY, key);
        } else {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
        }

        pContainer.style.display = 'block';
        pBar.style.width = '0%';
        pBar.style.background = 'var(--success)';
        pText.innerText = "서버 연결 중...";

        try {
            const data = await VisaAPI.uploadPDF(key, file, (percent) => {
                pBar.style.width = percent + '%';
                pText.innerText = `업로드 중... (${percent}%)`;
            });
            
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            pText.innerText = "✅ 출입국 정책 동기화 완료!";
        } catch(e) {
            pText.innerText = "❌ 실패: API 키 만료 또는 PDF 형식을 확인하세요.";
            pBar.style.background = "var(--accent)";
            console.error(e);
        }
    });

    // 3. 분석 실행 (기본 로직)
    document.getElementById('run-btn').addEventListener('click', () => {
        if(!uploadedFileUri) return alert("출입국정책 파일을 먼저 업로드해주세요.");
        alert("분석 로직을 실행합니다. (API 연동 파트 추가 필요)");
    });
});