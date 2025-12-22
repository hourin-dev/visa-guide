document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 버전 관리 연동 (config.js 기준)
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

    // 📂 지침서 업로드 로직
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

    // ⚖️ 정밀 분석 실행 (E-7-R 포함 및 빨간색 강조)
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
            
            runBtn.disabled = true;
            runBtn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국정책 분석 중...';
            
            const now = new Date();
            const dateStr = "2025년 12월 22일"; // 현재 날짜 고정
            const timeStr = now.toLocaleTimeString('ko-KR');

            const clientData = {
                name: document.getElementById('clientName').value,
                visa: document.getElementById('visaType').value,
                income: document.getElementById('income').value,
                korean: document.getElementById('koreanSkill').value,
                birth: document.getElementById('birthDate').value,
                criminal: document.getElementById('criminalRecord').value, // 한글 변환 데이터
                tax: document.getElementById('taxArrears').value // 한글 변환 데이터
            };

            try {
                log("🔍 모델 Search 및 E-7-R 정책 대조 분석 시작...");
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
                                            의뢰인 정보와 PDF 지침서를 정밀 분석하여 리포트를 작성하십시오.
                                            
                                            의뢰인: ${clientData.name} 귀하 / 작성일: ${dateStr}
                                            [입력 데이터]: ${JSON.stringify(clientData)}
                                            [기준]: 2024 GNI ${CONFIG.GNI_2024}만원

                                            필수 리포트 구성 요소:
                                            1. **조회 및 변경 대상**: E-7-4, **E-7-R(첨단분야 숙련기능)**, F-2-R, F-2-7 등을 모두 포함하십시오.
                                            2. **빨간색 강조**: 결격 사유 경고와 각 비자별 '예상 승인률: OO%' 문구는 반드시 <span class="red-text">내용</span> 태그를 사용하여 빨간색으로 출력하십시오.
                                            3. **한글 표기**: 형사범죄 경력(있음/없음), 세금 체납 여부(있음/없음)를 반드시 한글로만 표기하십시오.
                                            4. **비자 장점**: 💡 [취득 시 주요 장점] 섹션을 통해 각 자격의 혜택을 명시하십시오.
                                            5. **하단 정보**: "📊 최종 분석 완료 시간: <span class="red-text">${timeStr}</span>"을 리포트 최하단에 포함하십시오.
                                            6. 모든 별표(*) 제거 및 이모티콘 사용.` 
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
                            log(`✅ [${model.name.split('/')[1]}] 분석 완료 (v${CONFIG.VERSION})`);
                            break;
                        }
                    } catch(e) { continue; }
                }
            } catch(e) { log("❌ 분석 오류 발생"); }
            finally { 
                runBtn.disabled = false; 
                runBtn.innerText = "⚖️ 이규희 사무장 정밀 분석"; 
            }
        });
    }
});