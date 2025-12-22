document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("API 키와 PDF 파일을 선택해주세요.");

        if(document.getElementById('chkSaveKey').checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);
        else localStorage.removeItem(CONFIG.STORAGE_KEY);

        document.getElementById('progress-container').style.display = 'block';
        pText.innerText = "서버 연결 시도 중...";

        try {
            const data = await VisaAPI.uploadPDF(key, file, (percent) => {
                pBar.style.width = percent + '%';
                pText.innerText = `업로드 진행 중... (${percent}%)`;
            });
            
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            pText.innerText = "✅ 출입국 정책 동기화 성공!";
        } catch(e) {
            console.error("에러 발생 위치:", e);
            pText.innerText = "❌ 실패: " + e.message;
            pBar.style.background = "#c0392b";
        }
    });

    document.getElementById('run-btn').addEventListener('click', () => {
        if(!uploadedFileUri) return alert("출입국 정책 파일을 먼저 업로드해야 정밀 분석이 가능합니다.");
        alert("이규희 사무장 정밀 분석 시뮬레이션을 시작합니다.");
    });
});