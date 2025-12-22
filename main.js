document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    function log(msg) {
        const b = document.getElementById('status-log'); 
        b.style.display = 'block';
        b.innerText += `> ${msg}\n`;
        b.scrollTop = b.scrollHeight; 
    }

    log(`🚀 시스템 가동 (Version: ${CONFIG.VERSION})`);
    log(`📊 적용 기준: 2024년 GNI ${CONFIG.GNI_2024}만원`);

    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            const file = document.getElementById('pdfFile').files[0];
            if(!key || !file) return alert("키와 파일을 확인하세요.");
            if(!window.VisaAPI) return log("❌ 오류: 통신 모듈(api.js) 로드 실패");

            log("📡 지침서 서버 동기화 중...");
            document.getElementById('progress-container').style.display = 'block';
            if(document.getElementById('chkSaveKey').checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);

            try {
                const data = await window.VisaAPI.uploadPDF(key, file, (p) => {
                    document.getElementById('progress-bar').style.width = p + '%';
                    document.getElementById('progress-text').innerText = p + '%';
                });
                uploadedFileUri = data.file.uri;
                document.getElementById('file-label').className = "status-badge status-active";
                document.getElementById('file-label').innerText = "동기화 완료";
                log("✅ 정책 데이터 동기화 성공!");
            } catch(e) { log("❌ 업로드 오류: " + e.message); }
        });
    }

    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
            
            runBtn.disabled = true;
            runBtn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국정책 분석 중...';
            
            const clientData = {
                name: document.getElementById('clientName').value,
                visa: document.getElementById('visaType').value,
                income: document.getElementById('income').value,
                korean: document.getElementById('koreanSkill').value,
                birth: document.getElementById('birthDate').value,
                criminal: document.getElementById('criminalRecord').value,
                tax: document.getElementById('taxArrears').value,
                details: document.getElementById('details').value
            };

            try {
                log("🔍 최적 모델 탐색 및 정책 대조 중...");
                const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                const listData = await listRes.json();
                const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();

                let success = false;
                for(let model of models) {
                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [
                                    { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                            의뢰인 정보와 PDF 지침서를 정밀 분석하여 리포트를 작성하십시오.
                                            의뢰인: ${clientData.name} 귀하 / 현재비자: ${clientData.visa}
                                            [입력 데이터]: ${JSON.stringify(clientData)}
                                            [기준]: 2024 GNI ${CONFIG.GNI_2024}만원

                                            [리포트 작성 지점]:
                                            1. H-2 비자의 경우 F-4 변경 가능성, E-7-4 전환 및 F-2-7 점수 분석을 상세히 포함하십시오.
                                            2. 결격사유(${clientData.criminal}, ${clientData.tax})가 하나라도 해당되면 최상단에 "⚖️ 전문가 총평: 결격 사유 긴급 진단" 섹션을 두고 경고하십시오.
                                            3. 모든 별표(*) 제거. 볼드체와 이모티콘만 사용하십시오.` 
                                    },
                                    { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }
                                ] }],
                                generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                            })
                        });
                        const resData = await response.json();
                        if (resData.candidates) {
                            const text = resData.candidates[0].content.parts[0].text;
                            document.getElementById('result-box').style.display = 'block';
                            document.getElementById('result-content').innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
                            log(`✅ 분석 완료 (v${CONFIG.VERSION})`);
                            success = true;
                            break;
                        }
                    } catch(e) { continue; }
                }
            } catch(e) { log("❌ 오류 발생"); }
            finally { 
                runBtn.disabled = false; 
                runBtn.innerText = "⚖️ 이규희 사무장 정밀 분석"; 
            }
        });
    }
});