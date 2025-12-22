document.getElementById('run-btn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim();
    if(!uploadedFileUri) return alert("정책 파일을 먼저 업로드하세요.");
    
    const btn = document.getElementById('run-btn');
    btn.disabled = true;
    btn.innerText = "⏳ 지침서 대조 분석 중...";
    
    // 1단계: 파일 인덱싱을 위한 짧은 대기 (Gemini 파일 처리 시간 확보)
    log("⏳ [Gemini-1.5-Flash] 정책 본문 인덱싱 대기 중...");
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기 시간 추가

    const clientData = {
        name: document.getElementById('clientName').value,
        visa: document.getElementById('visaType').value,
        income: document.getElementById('income').value,
        korean: document.getElementById('koreanSkill').value,
        birth: document.getElementById('birthDate').value
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [
                    // 중요: 파일 정보를 먼저 배치하여 컨텍스트를 우선 제공
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

        // 2단계: API 응답 에러 핸들링 강화
        if (!response.ok) {
            const errorMsg = data.error ? data.error.message : "알 수 없는 API 오류";
            if (response.status === 429) throw new Error("API 사용량 초과(Quota Exceeded). 1분 후 다시 시도하세요.");
            if (response.status === 400) throw new Error("파일이 아직 준비되지 않았거나 형식이 잘못되었습니다.");
            throw new Error(errorMsg);
        }
        
        if (data.candidates && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;
            const resultBox = document.getElementById('result-box');
            const resultContent = document.getElementById('result-content');
            
            resultBox.style.display = 'block';
            resultContent.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*/g, '<b>').replace(/\*/g, '');
            
            log("✅ 정밀 분석 완료: 리포트가 생성되었습니다.");
            resultBox.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error("AI 응답 형식이 올바르지 않습니다.");
        }
    } catch(e) {
        log("❌ 분석 오류: " + e.message);
        console.error("Full Error:", e);
    } finally {
        btn.disabled = false;
        btn.innerText = "⚖️ 이규희 사무장 정밀 분석";
    }
});