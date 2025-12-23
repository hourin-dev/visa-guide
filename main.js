/**
 * 법무법인 대림 비자 전문가 시스템 v2.0.0
 * 담당: 이규희 사무장
 * 업데이트: 리포트 하단 최종 분석 완료 시간 실시간 날짜/시간 출력 보정
 */

document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;
    const logBox = document.getElementById('status-log');
    const verBadge = document.getElementById('sys-version');
    const apiInput = document.getElementById('apiKey');
    const chkSaveKey = document.getElementById('chkSaveKey');

    if (verBadge) verBadge.innerText = `v${CONFIG.VERSION}`;
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (savedKey) apiInput.value = savedKey;

    function log(msg) {
        const time = new Date().toLocaleTimeString('ko-KR');
        logBox.innerHTML += `[${time}] > ${msg}<br>`;
        logBox.scrollTop = logBox.scrollHeight; 
    }

    log(`🚀 시스템 v${CONFIG.VERSION} 가동 시작`);

    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = apiInput.value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("보안 키와 PDF 지침서를 확인하세요.");
        if (chkSaveKey.checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);

        log(`📡 파일 업로드 시작: ${file.name}`);
        pCont.style.display = 'block';

        try {
            const data = await window.VisaAPI.uploadPDF(key, file, (p) => {
                pBar.style.width = p + '%';
                pText.innerText = `업로드 중... ${p}%`;
            });
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').innerText = "동기화 완료";
            log("✅ 정책 데이터 동기화 성공!");
        } catch(e) { log("❌ 오류: " + e.message); }
    });

    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = apiInput.value.trim();
        if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국 정책 분석 중 ...';
        
        // ---------------------------------------------------------
        // [중요] 리포트 생성 시점의 실제 날짜와 시간을 변수로 저장
        // ---------------------------------------------------------
        const now = new Date();
        const currentFullDate = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        const currentFullTime = now.toLocaleString('ko-KR'); // 날짜 + 시간 (초 단위까지)

        log(`🔍 분석 가동 시작: ${currentFullTime}`);

        const clientData = {
            name: document.getElementById('clientName').value || "의뢰인",
            visa: document.getElementById('visaType').value,
            income: document.getElementById('income').value,
            korean: document.getElementById('koreanSkill').value,
            birth: document.getElementById('birthDate').value,
            criminal: document.getElementById('criminalRecord').value,
            tax: document.getElementById('taxArrears').value
        };

        const gniRatio = Math.round((clientData.income / CONFIG.GNI_2024) * 100);

        // AI에게 현재 시간을 텍스트로 명확히 전달하여 리포트에 포함하도록 지시
        const reportPrompt = `
        당신은 법무법인 대림의 이규희 사무장입니다. 제공된 데이터를 기반으로 분석 리포트를 작성하십시오.

        [분석 지시]:
        1. 1순위(🥇)와 2순위(🥈) 전략을 표와 함께 상세히 비교할 것.
        2. 승인 확률은 반드시 50% 이상으로 산출할 것.
        3. 리포트의 결론과 하단의 연락처, 완료 시간을 절대 생략하지 말 것.

        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        ⚖️ **법무부 출입국관리사무소 조회 분석 리포트**
        ━━━━━━━━━━━━━━━━━━━━━━━━━━

        👤 **의뢰인 : ${clientData.name} 귀하**
        ✍️ **작성자 : 이규희 사무장**
        📅 **작성일 : ${currentFullDate}**

        ### 🔍 **1. 입력 정보 및 요건 검토**
        * 👤 **성명** : ${clientData.name} (${clientData.birth})
        * 🎫 **현재자격** : ${clientData.visa}
        * 💰 **경제지표** : 전년소득 ${clientData.income}만원 (2024년 GNI 대비 약 ${gniRatio}%)
        * 🗣️ **언어능력** : ${clientData.korean}
        * ⚠️ **결격사유** : <span class="red-text">${clientData.criminal === '없음' ? '특이사항 없음' : '정밀 검토 요망'} / ${clientData.tax === '없음' ? '체납 없음' : '체납 확인'}</span>

        ---

        ### 🏆 **2. 최적 비자 추천안 비교 (2-WAY SOLUTION)**

        | 구분 | 🥇 제1순위 (최적안) | 🥈 제2순위 (대안) |
        | :--- | :--- | :--- |
        | **추천 비자** | (비자명) | (비자명) |
        | **승인 가능성** | <span class="red-text">**OO% 이상**</span> | <span class="red-text">**OO% 이상**</span> |

        ---

        ### 🥇 **[제1순위 상세 분석]**
        (점수 배점, 주요 장점, 필수 서류 상세 기술)

        ### 🥈 **[제2순위 상세 분석]**
        (대안적 장점, 가족 혜택, 신청 시 주의사항 기술)

        ---

        ### 🛡️ **3. 전문가 총평 및 실무 조언**
        (사무장님의 전략적 제언)

        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        본 리포트가 비자 변경의 첫걸음이 되길 바랍니다. 
        상담 문의 : 이규희 사무장 (010-9798-1100)

        📊 **최종 분석 완료 시간 : <span class="red-text">${currentFullTime}</span>**
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;

        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const listData = await listRes.json();
            const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();

            for(let model of models) {
                log(`🧪 [Search] ${model.name.split('/')[1]} 모델 분석 중...`);
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: reportPrompt }, { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }] }],
                            generationConfig: { 
                                temperature: 0.1, 
                                maxOutputTokens: 8192, 
                                topP: 0.95 
                            }
                        })
                    });
                    const resData = await response.json();
                    if (resData.candidates && resData.candidates[0].content) {
                        const rawText = resData.candidates[0].content.parts[0].text;
                        document.getElementById('result-box').style.display = 'block';
                        document.getElementById('result-content').innerHTML = rawText.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
                        
                        log(`✅ 분석 완료! (완료 시간: ${currentFullTime})`);
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