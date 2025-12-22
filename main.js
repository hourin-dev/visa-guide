document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;
    const logBox = document.getElementById('status-log');
    const apiKeyInput = document.getElementById('apiKey');
    const chkSaveKey = document.getElementById('chkSaveKey');

    // 버전 자동 업데이트
    const verBadge = document.getElementById('sys-version');
    if (verBadge) verBadge.innerText = `v${CONFIG.VERSION}`;

    // 저장된 키 로드
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (savedKey) apiKeyInput.value = savedKey;

    function log(msg) {
        const time = new Date().toLocaleTimeString();
        logBox.innerHTML += `[${time}] > ${msg}<br>`;
        logBox.scrollTop = logBox.scrollHeight; 
    }

    log(`🚀 시스템 v${CONFIG.VERSION} 가동 완료`);
    log("📅 분석 기준일: 2025년 12월 22일");

    // 파일 업로드 로직
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("API 키와 파일을 확인하세요.");
        
        // 키 저장 로직
        if(chkSaveKey.checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);
        else localStorage.removeItem(CONFIG.STORAGE_KEY);

        log(`📡 지침서 서버 업로드 시작: ${file.name}`);
        pCont.style.display = 'block';

        try {
            const data = await window.VisaAPI.uploadPDF(key, file, (p) => {
                pBar.style.width = p + '%';
                pText.innerText = `업로드 중... ${p}%`;
            });
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            log("✅ 정책 데이터 서버 동기화 성공!");
            pText.innerText = "업로드 완료";
        } catch(e) { log("❌ 업로드 오류: " + e.message); }
    });

    // 정밀 분석 실행 로직
    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        // 요청하신 문구로 변경 및 회전하는 모래시계 추가
        btn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국 정책 분석 중 ,,,';
        
        if(chkSaveKey.checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);

        const startTime = new Date();
        log(`🔍 분석 가동 시작 시간: ${startTime.toLocaleTimeString()}`);

        const clientData = {
            name: document.getElementById('clientName').value,
            visa: document.getElementById('visaType').value,
            income: document.getElementById('income').value,
            korean: document.getElementById('koreanSkill').value,
            criminal: document.getElementById('criminalRecord').value,
            tax: document.getElementById('taxArrears').value
        };

        try {
            log("🔍 가용 AI 모델 리스트 검색 중 (Model Search)...");
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const listData = await listRes.json();
            const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();

            for(let model of models) {
                log(`📡 [Search] ${model.name.split('/')[1]} 모델로 전체 비자군 대조 분석 중...`);
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [
                                { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                        제공된 PDF와 데이터를 대조하여 리포트를 작성하십시오.
                                        작성일: 2025년 12월 22일 / 의뢰인: ${clientData.name}
                                        분석대상: E-7-4, E-7-R, F-2-R, F-2-7, F-4 전체 자격 대조.
                                        - '예상 승인률: OO%' 및 결격사유는 <span class="red-text">빨간색</span> 강조.
                                        - 하단에 📊 최종 분석 완료 시간을 표기하십시오.
                                        - 모든 별표 제거 및 이모티콘 사용.` 
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
                        
                        const endTime = new Date();
                        log(`✅ 분석 완료! (분석 종료 시간: ${endTime.toLocaleTimeString()})`);
                        break;
                    }
                } catch(e) { continue; }
            }
        } catch(e) { log("❌ 오류 발생"); }
        finally { 
            btn.disabled = false; 
            btn.innerText = "⚖️ 이규희 사무장 정밀 분석 실행"; 
        }
    });
});