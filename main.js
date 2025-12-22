document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null; // 업로드된 파일 주소 저장용

    // 1. 저장된 키 로드 및 초기화
    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

    function log(msg) {
        const b = document.getElementById('status-log'); 
        b.style.display = 'block';
        b.innerText += `> ${msg}\n`;
        b.scrollTop = b.scrollHeight; 
    }

    // 2. [지침서 서버 업로드] 버튼 이벤트
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            const fileInput = document.getElementById('pdfFile');
            const file = fileInput.files[0];
            const pCont = document.getElementById('progress-container');
            const pBar = document.getElementById('progress-bar');
            const pText = document.getElementById('progress-text');

            if(!key) return alert("Google AI API 키를 입력해주세요.");
            if(!file) return alert("PDF 지침서 파일을 먼저 선택해주세요.");
            
            log("📡 업로드 프로세스 시작...");
            
            if(document.getElementById('chkSaveKey').checked) {
                localStorage.setItem(CONFIG.STORAGE_KEY, key);
            }

            pCont.style.display = 'block';

            try {
                // api.js의 uploadPDF 호출
                const data = await window.VisaAPI.uploadPDF(key, file, (percent) => {
                    pBar.style.width = percent + '%';
                    pText.innerText = percent + '%';
                });

                if (data && data.file && data.file.uri) {
                    uploadedFileUri = data.file.uri;
                    document.getElementById('file-label').className = "status-badge status-active";
                    document.getElementById('file-label').innerText = "동기화 완료";
                    log("✅ 정책 지침서 동기화 성공! (분석 준비 완료)");
                } else {
                    throw new Error("파일 URI를 받아오지 못했습니다.");
                }
            } catch(e) {
                log("❌ 업로드 실패: " + e.message);
                console.error(e);
            }
        });
    }

    // 3. [정밀 분석] 버튼 이벤트 (모델 자동 탐색 로직 적용)
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            if(!uploadedFileUri) return alert("먼저 지침서 업로드를 완료해주세요.");
            
            runBtn.disabled = true;
            runBtn.innerText = "⏳ 지침서 대조 분석 중...";
            
            // 의뢰인 입력 데이터 통합 수집
            const clientData = {
                name: document.getElementById('clientName').value,
                visa: document.getElementById('visaType').value,
                income: document.getElementById('income').value,
                korean: document.getElementById('koreanSkill').value,
                birth: document.getElementById('birthDate').value
            };

            try {
                // [수정] 사용 가능한 최적 모델 탐색
                log("🔍 최적 AI 모델 탐색 및 인덱싱 대기 중...");
                const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                const listData = await listRes.json();
                
                // Flash 모델 우선 필터링
                const usableModels = listData.models.filter(m => 
                    m.supportedGenerationMethods.includes("generateContent")
                ).reverse(); 

                if(usableModels.length === 0) throw new Error("사용 가능한 Gemini 모델을 찾을 수 없습니다.");

                let success = false;

                // 순차적 모델 시도 (Failover)
                for(let modelInfo of usableModels) {
                    const modelFullName = modelInfo.name;
                    log(`⚖️ [${modelFullName.split('/')[1]}] 리포트 생성 시도...`);

                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelFullName}:generateContent?key=${key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [
                                    { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                            반드시 업로드된 PDF 지침서 내용을 정밀 대조하여 리포트를 작성하십시오.
                                            
                                            [의뢰인 데이터]:
                                            - 성명: ${clientData.name}
                                            - 현재 비자: ${clientData.visa} / 생년월일: ${clientData.birth}
                                            - 연간 소득: ${clientData.income}만원
                                            - 한국어 능력: ${clientData.korean}

                                            [분석 필수 조건]:
                                            1. 2024 GNI 기준(${CONFIG.GNI_2024}만원)을 소득 점수 계산에 반영하십시오.
                                            2. E-7-4, F-2-R 등 신청 가능한 모든 비자의 확률을 제시하십시오.
                                            3. 모든 문장의 별표(*)를 제거하고 이모티콘과 볼드체만 사용하여 가독성을 높이십시오.` 
                                    },
                                    { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }
                                ] }],
                                generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                            })
                        });

                        const data = await response.json();
                        
                        if (data.candidates && data.candidates[0].content) {
                            const text = data.candidates[0].content.parts[0].text;
                            const resultBox = document.getElementById('result-box');
                            const resultContent = document.getElementById('result-content');
                            
                            resultBox.style.display = 'block';
                            // 마크다운 형식 처리
                            resultContent.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
                            
                            log("✅ 리포트 생성 완료.");
                            resultBox.scrollIntoView({ behavior: 'smooth' });
                            success = true;
                            break; 
                        }
                    } catch (innerErr) {
                        log(`⚠️ 모델 오류로 다음 순위 모델로 전환합니다.`);
                    }
                }

                if(!success) throw new Error("모든 AI 모델이 응답하지 않습니다.");

            } catch(e) {
                log("❌ 분석 오류: " + e.message);
            } finally {
                runBtn.disabled = false;
                runBtn.innerText = "⚖️ 이규희 사무장 정밀 분석";
            }
        });
    }
});