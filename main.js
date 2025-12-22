document.addEventListener('DOMContentLoaded', () => {
    let uploadedFileUri = null;

    // 1. 버전 정보 및 초기화 로그
    const currentVersion = CONFIG.VERSION || "1.2.5";
    function log(msg) {
        const b = document.getElementById('status-log'); 
        b.style.display = 'block';
        b.innerText += `> ${msg}\n`;
        b.scrollTop = b.scrollHeight; 
    }

    // 시스템 시작 시 버전 출력 (업데이트 유무 확인용)
    log(`🚀 시스템 가동 중... (현재 버전: v${currentVersion})`);
    log(`📅 기준 데이터: ${CONFIG.GNI_2024}만원 (2024 GNI 적용)`);

    const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(savedKey) document.getElementById('apiKey').value = savedKey;

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
            
            log("📡 지침서 업로드 프로세스 시작...");
            
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
            
            const clientData = {
                name: document.getElementById('clientName').value,
                visa: document.getElementById('visaType').value,
                income: document.getElementById('income').value,
                korean: document.getElementById('koreanSkill').value,
                birth: document.getElementById('birthDate').value
            };

            try {
                // [오류 해결 핵심] 사용 가능한 모델 리스트 조회
                log("🔍 최적 AI 모델 탐색 및 인덱싱 대기...");
                const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                const listData = await listRes.json();
                
                if(listData.error) throw new Error(listData.error.message);

                // generateContent를 지원하는 모델 중 가장 최신 모델부터 시도
                const usableModels = listData.models.filter(m => 
                    m.supportedGenerationMethods.includes("generateContent")
                ).reverse();

                if(usableModels.length === 0) throw new Error("사용 가능한 모델이 없습니다.");

                let success = false;

                for(let model of usableModels) {
                    const modelFullName = model.name;
                    log(`⚖️ [${modelFullName.split('/')[1]}] 리포트 생성 중...`);

                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelFullName}:generateContent?key=${key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [
                                    { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                            제공된 PDF 지침서와 아래 의뢰인 정보를 대조하여 분석하십시오.
                                            의뢰인: ${clientData.name} / 현재비자: ${clientData.visa} / 소득: ${clientData.income}만원
                                            
                                            [요구사항]:
                                            1. 2024 GNI 기준(${CONFIG.GNI_2024}만원)을 소득 점수 계산에 반영.
                                            2. 신청 가능한 비자 종류와 합격 확률 제시.
                                            3. 모든 별표(*) 제거 및 이모티콘 활용.` 
                                    },
                                    { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }
                                ] }],
                                generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
                            })
                        });

                        const data = await response.json();
                        if (data.candidates && data.candidates[0].content) {
                            const text = data.candidates[0].content.parts[0].text;
                            const resultBox = document.getElementById('result-box');
                            const resultContent = document.getElementById('result-content');
                            
                            resultBox.style.display = 'block';
                            resultContent.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
                            
                            log("✅ 정밀 분석 리포트 생성 완료.");
                            resultBox.scrollIntoView({ behavior: 'smooth' });
                            success = true;
                            break; 
                        }
                    } catch (e) {
                        log(`⚠️ 모델 전환 시도 중...`);
                    }
                }

                if(!success) throw new Error("모든 모델의 응답 생성에 실패했습니다.");

            } catch(e) {
                log("❌ 분석 오류: " + e.message);
            } finally {
                runBtn.disabled = false;
                runBtn.innerText = "⚖️ 이규희 사무장 정밀 분석";
            }
        });
    }
});