document.getElementById('run-btn').addEventListener('click', async () => {
    // ... (생략: API 키 및 파일 체크 로직) ...
    
    const now = new Date();
    const dateStr = "2025년 12월 22일"; // 현재 날짜 고정
    const timeStr = now.toLocaleTimeString('ko-KR');

    try {
        log("🔍 모든 비자 자격 지침 대조 분석 중...");
        // 모델 리스트 호출 및 분석 실행
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [
                    { text: `당신은 법무법인 대림의 이규희 사무장입니다. 
                            제공된 PDF 지침서와 의뢰인 데이터를 다음 지침에 따라 "전반적으로 모두" 대조하십시오.

                            [분석 대상 비자 목록]
                            1. E-7-4 (숙련기능인력 일반)
                            2. E-7-R (첨단분야 숙련기능인력)
                            3. F-2-R (지역특화형 비자)
                            4. F-2-7 (점수제 거주비자)
                            5. F-4 (재외동포 자격변경 가능성)

                            [리포트 작성 지침]
                            - 모든 날짜는 반드시 ${dateStr}로 표기하십시오.
                            - 위 5가지 비자 각각에 대해 지침서 기준 점수와 "예상 승인률: OO%"을 산출하십시오.
                            - **핵심**: 모든 "예상 승인률" 수치와 "결격 사유(범죄/체납)" 관련 내용은 반드시 <span class="red-text">내용</span> 태그로 감싸 빨간색으로 출력하십시오.
                            - 하단에 "📊 정밀 분석 완료 시간: <span class="red-text">${timeStr}</span>"을 명시하십시오.
                            - 별표(*) 없이 이모티콘과 볼드체만 사용하십시오.` 
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
            log("✅ 전체 비자 대조 리포트 생성 완료");
        }
    } catch(e) { log("❌ 오류 발생: " + e.message); }
    // ... (생략: 버튼 복구 로직) ...
});