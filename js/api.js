/**
 * js/api.js - v1.1.7
 * Google Gemini API 통신 엔진
 */
(function(window) {
    const VisaAPI = {
        async uploadPDF(key, file, onProgress) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`, {
                    method: 'POST',
                    headers: { 
                        'X-Goog-Upload-Protocol': 'resumable', 
                        'X-Goog-Upload-Command': 'start', 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ file: { display_name: file.name } })
                }).then(async (res) => {
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error.message || "API 인증 실패");
                    }
                    const uploadUrl = res.headers.get('x-goog-upload-url');

                    xhr.open('POST', uploadUrl);
                    xhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
                    xhr.setRequestHeader('X-Goog-Upload-Offset', '0');
                    
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percent = Math.round((e.loaded / e.total) * 100);
                            onProgress(percent);
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status === 200) resolve(JSON.parse(xhr.response));
                        else reject(new Error('업로드 실패: ' + xhr.status));
                    };
                    xhr.onerror = () => reject(new Error('네트워크 연결 오류'));
                    xhr.send(file);
                }).catch(reject);
            });
        }
    };

    // 전역 객체에 안전하게 할당
    window.VisaAPI = VisaAPI;
})(window);