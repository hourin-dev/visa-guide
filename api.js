/**
 * LawFirm 비자 시스템 v1.2.5 - 통신 모듈
 * window.VisaAPI 객체 등록을 보장하기 위해 즉시 실행 함수로 구성됨
 */
(function(window) {
    window.VisaAPI = {
        async uploadPDF(key, file, onProgress) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                // 1. 업로드 세션 시작 요청
                fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`, {
                    method: 'POST',
                    headers: { 
                        'X-Goog-Upload-Protocol': 'resumable', 
                        'X-Goog-Upload-Command': 'start', 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ file: { display_name: file.name } })
                }).then(async (res) => {
                    if (!res.ok) throw new Error("API 인증 실패 (키를 확인하세요)");
                    
                    const uploadUrl = res.headers.get('x-goog-upload-url');
                    
                    // 2. 실제 파일 전송 (진행률 확인을 위해 XHR 사용)
                    xhr.open('POST', uploadUrl);
                    xhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
                    xhr.setRequestHeader('X-Goog-Upload-Offset', '0');
                    
                    // 업로드 진행 상태 콜백
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percent = Math.round((e.loaded / e.total) * 100);
                            onProgress(percent);
                        }
                    };
                    
                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(JSON.parse(xhr.response));
                        } else {
                            reject(new Error("서버 응답 오류: " + xhr.status));
                        }
                    };
                    
                    xhr.onerror = () => reject(new Error("네트워크 연결 오류"));
                    xhr.send(file);
                    
                }).catch(reject);
            });
        }
    };
})(window);