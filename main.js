document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    function log(msg) {
        const logBox = document.getElementById('status-log');
        logBox.style.display = 'block';
        logBox.innerText += `> ${msg}\n`;
    }

    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        if(!key || !file) return alert("키와 파일을 확인하세요.");

        if(document.getElementById('chkSaveKey').checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);
        
        document.getElementById('progress-container').style.display = 'block';
        try {
            const data = await VisaAPI.uploadPDF(key, file, (percent) => {
                document.getElementById('progress-bar').style.width = percent + '%';
                document.getElementById('progress-text').innerText = percent + '%';
            });
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            log("✅ 정책 지침서 동기화 성공");
        } catch(e) { log("❌ 업로드 실패: " + e.message); }
    });

    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        if(!uploadedFileUri) return alert("정책 파일을 먼저 업로드하세요.");

        log("⏳ 이규희 사무장 정밀 분석 엔진 가동 중...");
        
        const clientData = {
            name: document.getElementById('clientName').value,
            income: document.getElementById('income').value,
            korean: document.getElementById('koreanSkill').value,
            edu: document.getElementById('education').value,
            loc: document.getElementById('location').value,
            details: document.getElementById('details').value
        };

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [
                        { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                다음 의뢰인 데이터를 업로드된 지침서와 대조하여 E-7-4 등 비자 점수와 합격 확률을 분석하십시오.
                                [의뢰인]: ${JSON.stringify(clientData)}
                                2024 GNI 기준은 ${CONFIG.GNI_2024}만원입니다.` },
                        { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }
                    ] }]
                })
            });
            const data = await response.json();
            document.getElementById('result-box').style.display = 'block';
            document.getElementById('result-content').innerHTML = data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>');
            log("✅ 리포트 생성 완료");
        } catch(e) { log("❌ 분석 실패"); }
    });
});