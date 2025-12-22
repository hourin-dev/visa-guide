document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;
    const logBox = document.getElementById('status-log');

    function log(msg) {
        const time = new Date().toLocaleTimeString();
        logBox.innerHTML += `[${time}] > ${msg}<br>`;
        logBox.scrollTop = logBox.scrollHeight; 
    }

    log(`🚀 시스템 v${CONFIG.VERSION} 가동 완료`);
    log("📅 분석 기준일: 2025년 12월 22일");

    // 파일 업로드 및 프로그래스 바
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("보안 키와 파일을 확인하세요.");
        
        log(`📡 지침서 서버 업로드 요청: ${file.name}`);
        pCont.style.display = 'block';

        try {
            const data = await window.VisaAPI.uploadPDF(key, file, (p) => {
                pBar.style.width = p + '%';
                pText.innerText = `서버 동기화 중... ${p}%`;
            });
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 성공";
            log("✅ 법무부 정책 데이터 동기화 완료.");
            pText.innerText = "업로드 성공";
        } catch(e) { log("❌ 업로드 오류: " + e.message); }
    });

    // 정밀 분석 실행 (전체 비자 대조)
    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        if(!uploadedFileUri) return alert("지침서가 업로드되지 않았습니다.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        btn.innerHTML = '⏳ 지침 대조 분석 중...';
        
        const dateStr = "2025년 12월 22일";
        const timeStr = new Date().toLocaleTimeString('ko-KR');

        const clientData = {
            name: document.getElementById('clientName').value,
            visa: document.getElementById('visaType').value,
            income: document.getElementById('income').value,
            korean: document.getElementById('koreanSkill').value,
            criminal: document.getElementById('criminalRecord').value,
            tax: document.getElementById('taxArrears').value
        };

        try {
            log("🔍 AI 모델 Search 및 시스템 최적화 중...");
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const listData = await listRes.json();
            const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();

            for(let model of models) {
                log(`📡 [Search] ${model.name.split('/')[1]} 모델 연결 - 전체 비자 대조 분석 시작...`);
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [
                                { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                        제공된 PDF와 의뢰인 데이터를 대조하여 리포트를 작성하십시오.
                                        작성일: ${dateStr} / 의뢰인: ${clientData.name} 귀하
                                        [분석 대상]: E-7-4, E-7-R, F-2-R, F-2-7, F-4 전체 자격 대조.
                                        [필수]: '예상 승인률: OO%' 및 결격사유 문구는 반드시 <span class="red-text">내용</span> 태그로 빨간색 강조.
                                        [하단]: 📊 분석 완료 시간: <span class="red-text">${timeStr}</span> 표기.
                                        별표 제거 및 이모티콘 적극 사용.` 
                                },
                                { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }
                            ] }]
                        })
                    });
                    const resData = await response.json();
                    if (resData.candidates) {
                        const text = resData.candidates[0].content.parts[0].text;
                        document.getElementById('result-box').style.display = 'block';
                        document.getElementById('result-content').innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
                        log(`✅ 분석 성공! (최종 완료: ${timeStr})`);
                        break;
                    }
                } catch(e) { continue; }
            }
        } catch(e) { log("❌ 분석 실패"); }
        finally { btn.disabled = false; btn.innerText = "⚖️ 이규희 사무장 정밀 분석 실행"; }
    });
});