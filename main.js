document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;
    const verBadge = document.getElementById('sys-version');
    if(verBadge) verBadge.innerText = `v${CONFIG.VERSION}`;

    function log(msg) {
        const b = document.getElementById('status-log'); 
        b.style.display = 'block';
        b.innerText += `> ${msg}\n`;
        b.scrollTop = b.scrollHeight; 
    }

    // 업로드 로직
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        if(!key || !file) return alert("키와 파일을 확인하세요.");
        
        log("📡 지침서 서버 동기화 프로세스 시작...");
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
        } catch(e) { log("❌ 오류: " + e.message); }
    });

    // 분석 로직
    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국정책 분석 중...';
        
        const now = new Date();
        const dateStr = "2025년 12월 22일"; // 현재 날짜
        const timeStr = now.toLocaleTimeString('ko-KR');

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
                                        의뢰인 정보와 PDF 지침서를 대조하여 리포트를 작성하십시오.
                                        작성일: ${dateStr} / 의뢰인: ${clientData.name} 귀하
                                        [데이터]: ${JSON.stringify(clientData)}

                                        [리포트 지침]:
                                        1. E-7-4, E-7-R, F-2-R, F-2-7, F-4 등 모든 비자 자격을 대조하십시오.
                                        2. '예상 승인률: OO%' 및 결격사유 경고는 반드시 <span class="red-text">내용</span> 태그로 빨간색 강조하십시오.
                                        3. 최하단에 📊 분석 완료 시간: <span class="red-text">${timeStr}</span>을 포함하십시오.
                                        4. 모든 별표(*) 제거 및 이모티콘 사용.` 
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
                        break;
                    }
                } catch(e) { continue; }
            }
        } catch(e) { log("❌ 오류 발생"); }
        finally { btn.disabled = false; btn.innerText = "⚖️ 이규희 사무장 정밀 분석"; }
    });
});