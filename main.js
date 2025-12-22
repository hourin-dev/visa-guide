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

            // 유효성 검사 및 즉각적인 반응 로그
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

    // 3. [정밀 분석] 버튼 이벤트 (v1.2.5 최적화)
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const key = document.getElementById('apiKey').value.trim();
            if(!uploadedFileUri) return alert("먼저 지침서 업로드를 완료해주세요.");
            
            runBtn.disabled = true;
            runBtn.innerText = "⏳ 지침서 대조 분석 중...";
            log("⚖️ [Gemini-1.5-Flash] 지침서 기반 정밀 분석을 시작합니다.");

            const clientData = {
                name: document.getElementById('clientName').value,
                visa: document.getElementById('visaType').value,
                income: document.getElementById('income').value,
                korean: document.getElementById('koreanSkill').value,
                birth: document.getElementById('birthDate').value
            };

            try {
                // 파일 인덱싱 대기 시간 부여 (안정성 확보)
                await new Promise(r => setTimeout(r, 2000));

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [
                            { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } },
                            { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                                    업로드된 PDF 지침서 내용을 엄격히 준수하여 다음 의뢰인의 비자 합격 확률을 정밀 분석하십시오.
                                    [의뢰인 데이터]: ${JSON.stringify(clientData)}
                                    [필수 요구사항]:
                                    1. 2024 GNI 기준(${CONFIG.GNI_2024}만원) 소득 점수표 작성.
                                    2. E-7-4, F-2-R 등 신청 가능 비자별 확률 제시.
                                    3. 모든 문장의 별표(*) 제거 및 이모티콘 사용.` }
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
                    
                    log("✅ 리포트 생성 완료.");
                    resultBox.scrollIntoView({ behavior: 'smooth' });
                } else {
                    throw new Error(data.error?.message || "분석 결과 생성 실패");
                }
            } catch(e) {
                log("❌ 분석 오류: " + e.message);
            } finally {
                runBtn.disabled = false;
                runBtn.innerText = "⚖️ 이규희 사무장 정밀 분석";
            }
        });
    }
});