document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;
    const logBox = document.getElementById('status-log');

    // 1. API 키 복구
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    // 2. 업로드 이벤트
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value;
        const file = document.getElementById('pdfFile').files[0];
        if(!key || !file) return alert("필수 정보를 입력하세요.");
        
        try {
            const data = await VisaAPI.uploadPDF(key, file);
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
        } catch(e) { console.error(e); }
    });

    // 3. 분석 실행 이벤트
    document.getElementById('run-btn').addEventListener('click', async () => {
        // 데이터 수집 -> API 호출 -> 결과 출력 로직
    });
});