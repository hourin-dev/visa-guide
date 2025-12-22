document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 저장된 키 로드
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    function log(msg) {
        const b = document.getElementById('status-log'); 
        b.style.display = 'block';
        b.innerText += `> ${msg}\n`;
        b.scrollTop = b.scrollHeight; 
    }

    // 파일 업로드 (v1.2.1 엔진 유지)
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("API 키와 파일을 확인하세요.");
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
            log("✅ 정책 지침서 동기화 성공 (v1.2.5)");
        } catch(e) { log("❌ 업로드 실패: " + e.message); }
    });

    // 정밀 분석 실행 (v1.2.5 최적화 로직)
    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        if(!uploadedFileUri) return alert("정책 파일을 먼저 업로드하세요.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        btn.innerText = "⏳ 지침서 대조 분석 중...";
        log("⏳ [Gemini-1.5-Flash] 정책 본문 스캔 및 점수 산출 중...");

        const clientData = {
            name: document.getElementById('clientName').value,
            visa: document.getElementById('visaType').value,
            income: document.getElementById('income').value,
            korean: document.getElementById('koreanSkill').value,
            birth: document.getElementById('birthDate').value
        };

        try {
            // v1beta 모델 호출 최적화
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [
                        { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                업로드된 PDF 지침서 내용을 엄격히 준수하여 다음 의뢰인의 비자 합격 확률을 정밀 분석하십시오.
                                [의뢰인 데이터]: ${JSON.stringify(clientData)}
                                
                                [필수 요구사항]:
                                1. 2024 GNI 기준(${CONFIG.GNI_2024}만원) 소득 점수표 작성.
                                2. E-7-4, F-2-R 등 신청 가능 비자별 확률 제시.
                                3. 모든 문장의 별표(*) 제거 및 이모티콘 사용.` },
                        { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }
                    ] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 } // 정밀도 향상
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                const resultBox = document.getElementById('result-box');
                const resultContent = document.getElementById('result-content');
                
                resultBox.style.display = 'block';
                resultContent.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
                
                log("✅ 정밀 분석 완료: 리포트가 하단에 생성되었습니다.");
                // 화면 자동 스크롤
                resultBox.scrollIntoView({ behavior: 'smooth' });
            } else {
                throw new Error("AI 응답 생성 실패 (할당량 초과 또는 키 오류)");
            }
        } catch(e) {
            log("❌ 분석 오류: " + e.message);
            console.error(e);
        } finally {
            btn.disabled = false;
            btn.innerText = "⚖️ 이규희 사무장 정밀 분석";
        }
    });
});