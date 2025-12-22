document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // config.js의 버전을 HTML 배지에 자동으로 주입
    const verBadge = document.getElementById('sys-version');
    if(verBadge) verBadge.innerText = `v${CONFIG.VERSION}`;

    function log(msg) {
        const b = document.getElementById('status-log'); 
        b.style.display = 'block';
        b.innerText += `> ${msg}\n`;
        b.scrollTop = b.scrollHeight; 
    }

    // 시스템 가동 로그 출력
    log(`🚀 시스템 가동 (Version: ${CONFIG.VERSION})`);
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    // ---------------------------------------------------------
    // 📂 지침서 서버 업로드 로직 (프로그레스 바 수정 핵심)
    // ---------------------------------------------------------
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            const fileInput = document.getElementById('pdfFile');
            const file = fileInput.files[0];
            
            // 시각적 요소 캐싱
            const pCont = document.getElementById('progress-container');
            const pBar = document.getElementById('progress-bar');
            const pText = document.getElementById('progress-text');

            if(!key) return alert("Google AI API 키를 입력해주세요.");
            if(!file) return alert("PDF 지침서 파일을 먼저 선택해주세요.");
            
            // 1. 업로드 시작 전 UI 초기화 및 노출 (수정 포인트)
            log("📡 지침서 서버 동기화 중...");
            pCont.style.display = 'block'; // 프로그레스 바 컨테이너 즉시 노출
            pBar.style.width = '0%';
            pText.innerText = '0%';
            
            if(document.getElementById('chkSaveKey').checked) {
                localStorage.setItem(CONFIG.STORAGE_KEY, key);
            }

            try {
                // 2. api.js의 VisaAPI 호출 및 실시간 프로그레스 반영
                const data = await window.VisaAPI.uploadPDF(key, file, (percent) => {
                    // 서버로부터 전달받은 진행률(percent)을 UI에 적용
                    pBar.style.width = percent + '%';
                    pText.innerText = percent + '%';
                    
                    if(percent === 100) {
                        pText.innerText = "서버 인덱싱 중...";
                    }
                });

                if (data && data.file && data.file.uri) {
                    uploadedFileUri = data.file.uri;
                    document.getElementById('file-label').className = "status-badge status-active";
                    document.getElementById('file-label').innerText = "동기화 완료";
                    log("✅ 정책 데이터 동기화 성공! (분석 준비 완료)");
                } else {
                    throw new Error("파일 URI 응답을 받지 못했습니다.");
                }
            } catch(e) {
                log("❌ 업로드 오류: " + e.message);
                pCont.style.display = 'none'; // 실패 시 바 숨김
                console.error(e);
            }
        });
    }

    // ---------------------------------------------------------
    // ⚖️ 분석 실행 로직 (H-2 비자 분석 및 확률 포함)
    // ---------------------------------------------------------
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            if(!uploadedFileUri) return alert("지침서를 먼저 업로드하세요.");
            
            runBtn.disabled = true;
            runBtn.innerHTML = '<span class="loading-icon">⏳</span> 법무부 출입국정책 분석 중...';
            
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

                let success = false;
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
                                            [기준 지표]: 2024 GNI ${CONFIG.GNI_2024}만원

                                            [리포트 작성 필수 가이드]:
                                            1. 결격 사유 한글 표기: '형사범죄 경력: 있음/없음', '세금 체납 여부: 있음/없음'으로 명확히 표기.
                                            2. 확률 명시: 각 추천 비자별로 '예상 합격 확률: OO%' 수치 포함.
                                            3. 체류 장점: 💡 [취득 시 주요 장점] 섹션을 통해 가족초청, 거주 자유 등 혜택 강조.
                                            4. H-2 비자 특화: 현재 비자가 H-2인 경우 F-4 변경, E-7-4 전환 요건을 지침서 기반으로 정밀 분석.
                                            5. 모든 별표(*) 제거 및 볼드체/이모티콘 사용.` 
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
                            success = true;
                            break;
                        }
                    } catch(e) { continue; }
                }
            } catch(e) { log("❌ 분석 실패"); }
            finally { 
                runBtn.disabled = false; 
                runBtn.innerText = "⚖️ 이규희 사무장 정밀 분석"; 
            }
        });
    }
});