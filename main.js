// main.js의 분석 실행(run-btn) 이벤트 리스너 내부 수정

document.getElementById('run-btn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim();
    if(!uploadedFileUri) return alert("정책 파일을 먼저 업로드하세요.");
    
    const btn = document.getElementById('run-btn');
    btn.disabled = true;
    btn.innerText = "⏳ 지침서 대조 분석 중...";
    
    // 1단계: 파일 상태 확인 (추가 권장 로직)
    // 실제 운영 환경에서는 파일 상태가 'ACTIVE'인지 체크하는 fetch를 한 번 더 날리는 것이 좋으나, 
    // 간이 수정 버전에서는 짧은 지연시간을 준 후 호출합니다.
    log("⏳ [Gemini-1.5-Flash] 파일 인덱싱 대기 중...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기

    const clientData = {
        name: document.getElementById('clientName').value,
        visa: document.getElementById('visaType').value,
        income: document.getElementById('income').value,
        korean: document.getElementById('koreanSkill').value,
        birth: document.getElementById('birthDate').value
    };

    try {
        log("⚖️ 정책 본문 스캔 및 정밀 점수 산출 시작...");
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [
                    { file_data: { mime_type: "application/pdf", file_uri: uploadedFileUri } }, // 파일을 먼저 배치
                    { text: `당신은 법무법인 대림의 이규희 사무장입니다... (이하 생략)` }
                ] }],
                generationConfig: { 
                    temperature: 0.1, 
                    maxOutputTokens: 4096,
                    topP: 0.8,
                    topK: 10
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            // 할당량 초과(429) 또는 키 오류(400/401) 상세 메시지 출력
            if (response.status === 429) throw new Error("API 사용량 초과입니다. 잠시 후 다시 시도하세요.");
            if (response.status === 401 || response.status === 403) throw new Error("API 키가 유효하지 않습니다.");
            throw new Error(errorData.error.message || "알 수 없는 API 오류");
        }

        const data = await response.json();
        // ... (이하 결과 출력 로직 동일)