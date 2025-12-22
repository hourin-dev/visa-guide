document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // config.js의 버전을 배지에 자동 주입
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

    // ⚖️ 분석 실행 버튼 이벤트
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
            
            runBtn.disabled = true;
            // 모래시계 회전 애니메이션 적용
            runBtn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국정책 분석 중...';
            
            const now = new Date();
            const dateStr = "2025년 12월 22일"; // 현재 날짜 고정
            const timeStr = now.toLocaleTimeString('ko-KR'); // 분석 종료(처리) 시간

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
                log("🔍 모델 Search 및 정책 대조 시작...");
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

                                            [리포트 필수 요구사항]:
                                            1. 변경 대상 비자: E-7-4, E-7-R, F-2-R, F-2-7, F-4 등을 모두 포함하십시오.
                                            2. **강조**: 결격 사유 경고 및 '예상 승인률: OO%' 문구는 반드시 <span class="red-text">내용</span> 태그로 빨간색 강조하십시오.
                                            3. **시간 표시**: 리포트 최하단에 "📊 정밀 분석 완료 시간: <span class="red-text">${timeStr}</span>"을 반드시 포함하십시오.
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
                            document.getElementById('result-content').innerHTML = text.replace(/\\n/g, '<br>').replace(/\\*\\*/g, '<b>').replace(/\\*/g, '');
                            log(`✅ 분석 완료 (처리 시각: ${timeStr})`);
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