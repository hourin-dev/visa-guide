document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 저장된 키 로드
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    function log(msg) {
        const b = document.getElementById('status-log'); b.style.display = 'block';
        b.innerText += `> ${msg}\n`;
    }

    // 업로드 버튼
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("키와 파일을 확인하세요.");
        if(document.getElementById('chkSaveKey').checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);

        pCont.style.display = 'block';
        try {
            const data = await window.VisaAPI.uploadPDF(key, file, (percent) => {
                pBar.style.width = percent + '%';
                pText.innerText = percent + '%';
            });
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            log("✅ 정책 지침서 업로드 성공");
        } catch(e) { log("❌ 오류: " + e.message); }
    });

    // 분석 실행
    document.getElementById('run-btn').addEventListener('click', async () => {
        if(!uploadedFileUri) return alert("정책 파일을 먼저 업로드하세요.");
        log("⏳ 정밀 분석 리포트 생성 중...");
        // (여기에 Gemini AI 호출 로직 추가 가능)
        document.getElementById('result-box').style.display = 'block';
        document.getElementById('result-content').innerText = "리포트를 생성 중입니다. 잠시만 기다려 주십시오.";
    });
});