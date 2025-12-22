document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 버전 관리 통합
    const verBadge = document.getElementById('sys-version');
    if(verBadge) verBadge.innerText = `v${CONFIG.VERSION}`;

    function log(msg) {
        const b = document.getElementById('status-log'); 
        b.style.display = 'block';
        b.innerText += `> ${msg}\n`;
        b.scrollTop = b.scrollHeight; 
    }

    log(`🚀 시스템 가동 (Version: ${CONFIG.VERSION})`);
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    // 업로드 로직
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            const file = document.getElementById('pdfFile').files[0];
            const pCont = document.getElementById('progress-container');
            if(!key || !file) return alert("키와 파일을 확인하세요.");
            
            log("📡 지침서 서버 동기화 시작...");
            pCont.style.display = 'block';
            try {
                const data = await window.VisaAPI.uploadPDF(key, file, (p) => {
                    document.getElementById('progress-bar').style.width = p + '%';
                    document.getElementById('progress-text').innerText = p + '%';
                });
                uploadedFileUri = data.file.uri;
                document.getElementById('file-label').className = "status-badge status-active";
                document.getElementById('file-label').innerText = "동기화 완료";
                log("✅ 정책 데이터 동기화 성공!");
            } catch(e) { log("❌ 업로드 실패: " + e.message); }
        });
    }

    // 분석 로직 (모델 Search 로그 포함)
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
                tax: document.getElementById('taxArrears').value
            };

            try {
                // 모델 서치 로그 출력 시작
                log("🔍 AI 모델 리스트 검색 중 (Model Search)...");
                const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                const listData = await listRes.json();
                const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();
                log(`🔎 총 ${models.length}개의 가용 모델 발견. 분석을 시작합니다.`);

                let success = false;
                for(let model of models) {
                    const modelName = model.name.split('/')[1];
                    log(`📡 [Search] ${modelName} 모델에 정책 대조 요청 전송...`);

                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [
                                    { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                            다음 의뢰인의 비자 분석 리포트를 한국어로 정밀하게 작성하십시오.
                                            의뢰인 정보: ${JSON.stringify(clientData)}
                                            기준 지표: 2024 GNI ${CONFIG.GNI_2024}만원

                                            필수 조건:
                                            1. 추천 비자별 예상 합격 확률(%) 명시.
                                            2. 결격사유(범죄/체납) 한글 표기 및 최상단 경고.
                                            3. 💡 [취득 시 주요 장점] 섹션 포함.
                                            4. 하단에 "조회 일시: ${new Date().toLocaleString('ko-KR')}" 표기.
                                            5. 모든 별표(*) 제거 및 이모티콘 사용.` 
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
                            log(`✅ [${modelName}] 분석 리포트 생성 완료.`);
                            success = true;
                            break;
                        }
                    } catch(e) { 
                        log(`⚠️ [${modelName}] 응답 지연으로 다음 모델을 서치합니다.`);
                        continue; 
                    }
                }
            } catch(e) { log("❌ 오류 발생"); }
            finally { 
                runBtn.disabled = false; 
                runBtn.innerText = "⚖️ 이규희 사무장 정밀 분석"; 
            }
        });
    }
});