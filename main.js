document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 버전 통합 관리
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

    // 지침서 서버 업로드 이벤트
    document.getElementById('upload-btn').addEventListener('click', async () => {
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

    // 정밀 분석 실행 (처리 시간 및 빨간색 강조 적용)
    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = document.getElementById('apiKey').value.trim();
        if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국정책 분석 중...';
        
        // 현재 실시간 정보 생성
        const now = new Date();
        const dateStr = now.getFullYear() + "년 " + (now.getMonth() + 1) + "월 " + now.getDate() + "일";
        const timeStr = now.toLocaleTimeString('ko-KR'); // 상세 처리 시간

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
            log("🔍 최적 모델 Search 및 정책 대조 중...");
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const listData = await listRes.json();
            const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();

            let success = false;
            for(let model of models) {
                log(`📡 [Search] ${model.name.split('/')[1]} 모델로 리포트 생성 중...`);
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [
                                { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                        의뢰인 정보와 PDF 지침서를 정밀 분석하여 리포트를 작성하십시오.
                                        
                                        의뢰인: ${clientData.name} 귀하 / 작성일: ${dateStr}
                                        [입력 데이터]: ${JSON.stringify(clientData)}
                                        [기준]: 2024 GNI ${CONFIG.GNI_2024}만원

                                        필수 요구사항:
                                        1. 모든 날짜는 반드시 ${dateStr}로 출력.
                                        2. '예상 승인률' 용어를 사용하고, 승인률 수치와 결격 사유 경고는 반드시 <span class="red-text">내용</span> 태그로 감싸 빨간색으로 표시.
                                        3. 💡 [취득 시 주요 장점] 섹션 포함.
                                        4. **중요**: 리포트 최하단에 "📊 분석 완료 시간: <span class="red-text">${timeStr}</span>"을 반드시 포함하십시오.
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
                        log(`✅ 리포트 생성 완료 (v${CONFIG.VERSION})`);
                        success = true;
                        break;
                    }
                } catch(e) { continue; }
            }
        } catch(e) { log("❌ 분석 오류 발생"); }
        finally { 
            btn.disabled = false; 
            btn.innerText = "⚖️ 이규희 사무장 정밀 분석"; 
        }
    });
});