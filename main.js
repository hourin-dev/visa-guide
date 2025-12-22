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
            const pCont = document.getElementById('progress-container');
            if(!key || !file) return alert("키와 파일을 확인하세요.");
            
            log("📡 지침서 서버 동기화 중...");
            pCont.style.display = 'block';
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
            runBtn.innerText = "⏳ 법무부 출입국관리 정책 조회 중..."; // 사용자 요청 라벨 적용
            
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
                log("🔍 최적 AI 모델 탐색 및 정책 대조 중...");
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
                                            다음 의뢰인의 비자 합격 확률을 PDF 지침서에 기반하여 분석하십시오.
                                            의뢰인: ${clientData.name} 귀하 / 작성일: ${new Date().toLocaleDateString()}
                                            
                                            [입력 데이터]: ${JSON.stringify(clientData)}
                                            [기준 지표]: 2024 GNI ${CONFIG.GNI_2024}만원

                                            [리포트 지침]:
                                            1. 범죄경력(${clientData.criminal}) 또는 체납(${clientData.tax})이 '있음/체납'인 경우, 최상단에 "⚖️ 전문가 총평: 결격 사유 긴급 진단" 섹션을 구성하여 강력히 경고하십시오.
                                            2. 추천 비자(E-7-4, F-2-R, F-2-7 등)별 정밀 점수표를 포함하십시오.
                                            3. 모든 문장의 별표(*) 제거. 볼드체와 이모티콘만 사용하여 출력하십시오.` 
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
                            log(`✅ 분석 보고서 생성 완료 (v${CONFIG.VERSION})`);
                            success = true;
                            break;
                        }
                    } catch(e) { continue; }
                }
            } catch(e) { log("❌ 시스템 오류"); }
            finally { 
                runBtn.disabled = false; 
                runBtn.innerText = "⚖️ 이규희 사무장 정밀 분석"; 
            }
        });
    }
});