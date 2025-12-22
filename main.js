document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 초기 키 로드
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    // 업로드 버튼 이벤트
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');
        const pStatus = document.getElementById('progress-status');

        if(!key || !file) return alert("키와 파일을 확인하세요.");
        if(document.getElementById('chkSaveKey').checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);

        pCont.style.display = 'block';
        pStatus.innerText = "서버 연결 중...";

        try {
            // 이제 같은 폴더 내 로드 순서에 의해 VisaAPI를 정상 인식합니다.
            const data = await VisaAPI.uploadPDF(key, file, (percent) => {
                pBar.style.width = percent + '%';
                pText.innerText = percent + '%';
                pStatus.innerText = "파일 데이터 전송 중...";
            });
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            pStatus.innerText = "✅ 정책 동기화 성공!";
        } catch(e) {
            pStatus.innerText = "❌ 오류: " + e.message;
            pBar.style.background = "#c0392b";
        }
    });

    document.getElementById('run-btn').addEventListener('click', () => {
        if(!uploadedFileUri) return alert("정책 파일을 먼저 업로드하세요.");
        document.getElementById('result-box').style.display = 'block';
        document.getElementById('result-content').innerText = "분석 리포트를 생성하는 중입니다...";
    });
});