document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 버전 통합 관리: config.js의 버전을 HTML 배지에 주입
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

    // 업로드 버튼 이벤트 (api.js 호출)
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        if(!key || !file) return alert("키와 파일을 확인하세요.");
        
        log("📡 지침서 서버 동기화 중...");
        try {
            const data = await window.VisaAPI.uploadPDF(key, file, (p) => {
                document.getElementById('progress-bar').style.width = p + '%';
                document.getElementById('progress-text').innerText = p + '%';
            });
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            log("✅ 정책 데이터 동기화 성공!");
        } catch(e) { log("❌ 오류: " + e.message); }
    });

    // 분석 버튼 이벤트 (회전 애니메이션 및 한글 리포트 생성)
    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국정책 분석 중...';
        
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
            log("🔍 최적 모델 탐색 및 정책 대조 시작...");
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const listData = await listRes.json();
            const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();

            for(let model of models) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [
                                { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                        다음 의뢰인의 비자 분석 리포트를 한국어로 작성하십시오.
                                        
                                        [의뢰인 정보]: ${JSON.stringify(clientData)}
                                        [기준]: 2024 GNI ${CONFIG.GNI_2024}만원

                                        [리포트 작성 필수 지침]:
                                        1. 결격 사유 표기: 'Criminal Record' 등 영어 대신 반드시 '형사범죄 경력: 있음/없음', '세금 체납 여부: 있음/없음'으로 한글 표기하십시오.
                                        2. 합격 확률 명시: 각 추천 비자별로 '예상 합격 확률: OO%'를 수치로 명확히 표시하십시오.
                                        3. 체류 장점 강조: 💡 [취득 시 주요 장점] 섹션을 만들어 해당 비자로 변경 시 얻는 혜택(가족초청, 영주권 가점 등)을 상세히 적으십시오.
                                        4. 결격사유 경고: 범죄나 체납이 '있음'일 경우 최상단에 ⚖️ [긴급 진단] 섹션을 구성하여 출입국관리법 근거와 함께 강력히 경고하십시오.
                                        5. 모든 별표(*) 제거. 이모티콘과 볼드체만 사용하여 가독성을 높이십시오.` 
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
                        log(`✅ 리포트 생성 완료 (System v${CONFIG.VERSION})`);
                        break;
                    }
                } catch(e) { continue; }
            }
        } catch(e) { log("❌ 분석 오류"); }
        finally { btn.disabled = false; btn.innerText = "⚖️ 이규희 사무장 정밀 분석"; }
    });
});