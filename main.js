/**
 * 법무법인 대림 비자 전문가 시스템 v2.0.0
 * 담당: 이규희 사무장
 * 업데이트: 1순위/2순위 독립 섹션 구성 및 리포트 잘림 방지(8192 토큰)
 */

document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;
    const logBox = document.getElementById('status-log');
    const verBadge = document.getElementById('sys-version');
    const apiInput = document.getElementById('apiKey');
    const chkSaveKey = document.getElementById('chkSaveKey');

    // 1. 초기화: 버전 표시 및 보안 키 로드
    if (verBadge) verBadge.innerText = `v${CONFIG.VERSION}`;
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (savedKey) apiInput.value = savedKey;

    // 실시간 시스템 로그 출력 함수
    function log(msg) {
        const time = new Date().toLocaleTimeString('ko-KR');
        logBox.innerHTML += `[${time}] > ${msg}<br>`;
        logBox.scrollTop = logBox.scrollHeight; 
    }

    log(`🚀 시스템 v${CONFIG.VERSION} 가동 시작`);
    log("📅 분석 기준일: 2025년 12월 22일");

    // 2. 지침서 PDF 업로드 로직
    document.getElementById('upload-btn').addEventListener('click', async () => {
        const key = apiInput.value.trim();
        const file = document.getElementById('pdfFile').files[0];
        const pCont = document.getElementById('progress-container');
        const pBar = document.getElementById('progress-bar');
        const pText = document.getElementById('progress-text');

        if(!key || !file) return alert("보안 키와 분석할 PDF 지침서를 선택해 주세요.");
        
        if (chkSaveKey.checked) localStorage.setItem(CONFIG.STORAGE_KEY, key);
        else localStorage.removeItem(CONFIG.STORAGE_KEY);

        log(`📡 파일 업로드 및 정책 동기화 시작: ${file.name}`);
        pCont.style.display = 'block';

        try {
            const data = await window.VisaAPI.uploadPDF(key, file, (p) => {
                pBar.style.width = p + '%';
                pText.innerText = `서버 전송 중... ${p}%`;
            });
            uploadedFileUri = data.file.uri;
            document.getElementById('file-label').className = "status-badge status-active";
            document.getElementById('file-label').innerText = "동기화 완료";
            log("✅ 정책 데이터 동기화 성공! 분석 준비 완료.");
            pText.innerText = "업로드 완료";
        } catch(e) { 
            log("❌ 업로드 오류: " + e.message); 
            pText.innerText = "전송 실패";
        }
    });

    // 3. 법무부 출입국 정책 분석 및 분리형 리포트 생성 로직
    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = apiInput.value.trim();
        if(!uploadedFileUri) return alert("정책 지침서(PDF)를 먼저 업로드해 주세요.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국 정책 분석 중 ...';
        
        const startTime = new Date();
        log(`🔍 분석 가동 시작 시간: ${startTime.toLocaleTimeString('ko-KR')}`);

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

        // [중요] 1순위와 2순위 구분을 명확히 하는 프롬프트 지침
        const reportPrompt = `
        당신은 법무법인 대림의 비자 행정 전문가 '이규희 사무장'입니다. 
        제공된 지침(PDF)과 데이터를 대조하여 1순위와 2순위가 명확히 구분된 리포트를 작성하십시오.

        [분석 지침]:
        1. 리포트 서두에 비교 표(Table)를 사용하여 두 대안을 한눈에 비교하십시오.
        2. 제1순위(🥇)와 제2순위(🥈) 전략을 개별 섹션으로 분리하여 상세히 서술하십시오.
        3. 모든 확률 수치와 결격 사유는 반드시 <span class="red-text">내용</span> 태그를 사용하십시오.
        4. 승인 확률은 반드시 50%를 초과하여 긍정적으로 산출하십시오.

        [리포트 출력 양식]:
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        ⚖️ **법무부 출입국관리사무소 조회 분석 리포트**
        ━━━━━━━━━━━━━━━━━━━━━━━━━━

        👤 **의뢰인 : ${clientData.name} 귀하**
        ✍️ **작성자 : 이규희 사무장**
        📅 **작성일 : 2025년 12월 22일**

        ### 🔍 **1. 입력 정보 및 요건 검토**
        * 👤 **성명** : ${clientData.name} (${clientData.birth})
        * 🎫 **현재자격** : ${clientData.visa}
        * 💰 **경제지표** : 전년소득 ${clientData.income}만원 (2024년 GNI 대비 약 ${gniRatio}%)
        * 🗣️ **언어능력** : ${clientData.korean}
        * ⚠️ **결격사유** : <span class="red-text">${clientData.criminal === '없음' ? '특이사항 없음' : '상담 요망'} / ${clientData.tax === '없음' ? '체납 없음' : '체납 확인'}</span>

        ---

        ### 🏆 **2. 최적 비자 추천안 비교 (2-WAY SOLUTION)**

        | 구분 | 🥇 제1순위 (최적안) | 🥈 제2순위 (대안) |
        | :--- | :--- | :--- |
        | **추천 비자** | (비자명 작성) | (비자명 작성) |
        | **승인 가능성** | <span class="red-text">**OO% 이상**</span> | <span class="red-text">**OO% 이상**</span> |
        | **핵심 이점** | (가장 큰 장점 1개) | (대안적 장점 1개) |

        ---

        ### 🥇 **[제1순위 전략] 상세 분석**
        * 🌟 **핵심 장점** : (구체적인 장점 2가지)
        * 📊 **점수 및 요건** : (지침서 기준 예상 배점 요약)
        * ⏳ **체류 기간** : (부여 기간 및 연장 조건)
        * 📋 **필수 서류** : (의뢰인이 준비할 핵심 서류)

        ---

        ### 🥈 **[제2순위 전략] 상세 분석**
        * 🌟 **핵심 장점** : (구체적인 장점 2가지)
        * 👨‍👩‍👧‍👦 **가족 혜택** : (가족 초청 및 동반 체류 여부)
        * ⏳ **체류 기간** : (체류 요건 및 주의사항)
        * 📋 **필수 서류** : (2순위 신청 시 필요한 별도 서류)

        ---

        ### 🛡️ **3. 전문가 총평 및 실무 조언**
        (의뢰인에게 왜 1순위가 최선인지 설명하고, 승인률을 높이기 위한 사무장님의 실무 팁을 제언하십시오.)

        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        본 리포트가 비자 변경의 첫걸음이 되길 바랍니다. 
        상세 상담이 필요하시면 아래 연락처로 문의 주십시오.

        📞 **상담 문의 : 이규희 사무장 (010-9798-1100)**
        📊 **최종 분석 완료 시간 : <span class="red-text">${new Date().toLocaleTimeString('ko-KR')}</span>**
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;

        try {
            log("📡 AI 분석 엔진 검색 및 모델 연결 중...");
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const listData = await listRes.json();
            const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();

            for(let model of models) {
                log(`🧪 [Search] ${model.name.split('/')[1]} 모델로 정밀 대조 시작...`);
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [
                                { text: reportPrompt + "\n\n중요: 내용을 생략하지 말고 1, 2순위 대안을 각각 명확히 분리하여 상세히 작성하십시오." },
                                { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }
                            ] }],
                            generationConfig: { 
                                temperature: 0.1, 
                                maxOutputTokens: 8192, 
                                topP: 0.95 
                            }
                        })
                    });

                    const resData = await response.json();
                    if (resData.candidates && resData.candidates[0].content) {
                        const reportHtml = resData.candidates[0].content.parts[0].text;
                        document.getElementById('result-box').style.display = 'block';
                        document.getElementById('result-content').innerHTML = reportHtml.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
                        
                        const endTime = new Date();
                        log(`✅ 분석 완료! (종료 시간: ${endTime.toLocaleTimeString('ko-KR')})`);
                        break;
                    }
                } catch(e) { continue; }
            }
        } catch(e) { log("❌ 오류 발생: " + e.message); }
        finally { 
            btn.disabled = false; 
            btn.innerText = "⚖️ 이규희 사무장 정밀 분석 실행"; 
        }
    });
});