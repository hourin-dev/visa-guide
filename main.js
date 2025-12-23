/**
 * 법무법인 대림 비자 전문가 시스템 v2.0.0
 * 담당: 이규희 사무장
 * 업데이트: 리포트 양식 가독성 최적화 및 승인률 보정 로직
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
        
        // 키 저장 설정
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
            log("✅ 정책 데이터 동기화 성공! 분석 준비가 완료되었습니다.");
            pText.innerText = "업로드 완료";
        } catch(e) { 
            log("❌ 업로드 오류: " + e.message); 
            pText.innerText = "전송 실패";
        }
    });

    // 3. 법무부 출입국 정책 분석 및 리포트 생성 로직
    document.getElementById('run-btn').addEventListener('click', async () => {
        const key = apiInput.value.trim();
        if(!uploadedFileUri) return alert("정책 지침서(PDF)를 먼저 업로드해 주세요.");
        
        const btn = document.getElementById('run-btn');
        btn.disabled = true;
        
        // 사무장님 요청 문구 변경 및 모래시계 애니메이션 적용
        btn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국 정책 분석 중 ...';
        
        const startTime = new Date();
        log(`🔍 분석 가동 시작 시간: ${startTime.toLocaleTimeString('ko-KR')}`);

        // 의뢰인 입력 정보 수집
        const clientData = {
            name: document.getElementById('clientName').value || "의뢰인",
            visa: document.getElementById('visaType').value,
            income: document.getElementById('income').value,
            korean: document.getElementById('koreanSkill').value,
            birth: document.getElementById('birthDate').value,
            criminal: document.getElementById('criminalRecord').value,
            tax: document.getElementById('taxArrears').value
        };

        // 소득 대비 GNI 비율 계산
        const gniRatio = Math.round((clientData.income / CONFIG.GNI_2024) * 100);

        // AI 리포트 생성 프롬프트 (사무장님 요청 양식 적용)
        const reportPrompt = `
        당신은 법무법인 대림의 비자 행정 전문가 '이규희 사무장'입니다. 
        제공된 법무부 지침(PDF)과 의뢰인 데이터를 정밀 대조하여 리포트를 작성하십시오.

        [분석 지침]:
        1. 리포트의 모든 자격취득 가능성(승인률)은 긍정적인 희망을 위해 반드시 50%를 초과하여 산출하십시오.
        2. '예상 승인률'과 '결격 사유' 내용은 반드시 <span class="red-text">내용</span> 태그로 감싸야 합니다.
        3. 모든 별표(*)를 제거하고 볼드체와 이모티콘 기호를 활용하여 목록 형태로 가독성 있게 작성하십시오.

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
        * ⚠️ **결격사유** : <span class="red-text">${clientData.criminal === '없음' ? '특이사항 없음' : '확인 필요'} / ${clientData.tax === '없음' ? '체납 없음' : '체납 확인'}</span>

        ### 🛡️ **2. 전문가 총평**
        (의뢰인의 강점을 부각하고 승인 가능성이 높은 이유를 긍정적으로 서술)

        ### 🏆 **3. 1순위 추천비자 : [ <span class="red-text">자격취득가능 : OO%</span> ]**
        (추천 비자 명칭: 예 - E-7-4, E-7-R, F-2-7 등)

        ### 🌟 **4. 취득 시 주요 장점**
        (해당 비자 취득 시 누릴 수 있는 핵심 혜택 3가지 정리)

        ### 📊 **5. 분석 및 점수 계산**
        (항목별 점수 배점을 목록 형태로 정리)

        ### 👨‍👩‍👧‍👦 **6. 가족 초청 및 부여 비자**
        (F-3 비자 초청 가능 여부 및 혜택 안내)

        ### ⏳ **7. 예상 체류 기간**
        (1회 부여 기간 및 연장 가능성 안내)

        ### 📋 **8. 필수 제출 서류**
        (의뢰인이 준비해야 할 필수 서류 목록)

        ### 💡 **9. 이규희 사무장의 실무 조언**
        (승인 확률을 극대화하기 위한 실무적 노하우 제언)

        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        본 리포트가 비자 변경의 첫걸음이 되길 바랍니다. 상세 상담이 필요하시면 아래 연락처로 문의 주십시오.

        📞 **상담 문의 : 이규희 사무장 (010-9798-1100)**
        📊 **최종 분석 완료 시간 : <span class="red-text">${new Date().toLocaleTimeString('ko-KR')}</span>**
        ━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;

        try {
            log("📡 최적의 AI 분석 엔진 연결 중...");
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const listData = await listRes.json();
            const models = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).reverse();

            let success = false;
            for(let model of models) {
                const modelName = model.name.split('/')[1];
                log(`🧪 [Search] ${modelName} 모델로 정책 대조 분석 중...`);
                
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [
                                { text: reportPrompt },
                                { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }
                            ] }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
                        })
                    });

                    const resData = await response.json();
                    if (resData.candidates && resData.candidates[0].content) {
                        const reportHtml = resData.candidates[0].content.parts[0].text;
                        
                        // 결과창 출력
                        document.getElementById('result-box').style.display = 'block';
                        document.getElementById('result-content').innerHTML = reportHtml.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
                        
                        const endTime = new Date();
                        log(`✅ 분석 완료! (종료 시간: ${endTime.toLocaleTimeString('ko-KR')})`);
                        success = true;
                        break;
                    }
                } catch(e) {
                    log(`⚠️ ${modelName} 모델 응답 지연... 다음 모델 시도`);
                    continue;
                }
            }
            if(!success) throw new Error("분석 엔진 응답 실패");

        } catch(e) {
            log("❌ 오류 발생: " + e.message);
            alert("분석 중 오류가 발생했습니다. API 키와 파일 상태를 확인해 주세요.");
        } finally {
            btn.disabled = false;
            btn.innerText = "⚖️ 이규희 사무장 정밀 분석 실행";
        }
    });
});