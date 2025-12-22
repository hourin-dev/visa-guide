const VisaAPI = {
    async uploadPDF(key, file, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // 1. 업로드 세션 시작
            fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`, {
                method: 'POST',
                headers: { 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: { display_name: file.name } })
            }).then(async (res) => {
                const uploadUrl = res.headers.get('x-goog-upload-url');
                if (!uploadUrl) throw new Error("API 키가 잘못되었거나 권한이 없습니다.");

                // 2. 파일 전송 및 상태 추적
                xhr.open('POST', uploadUrl);
                xhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
                xhr.setRequestHeader('X-Goog-Upload-Offset', '0');
                
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        onProgress(percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) resolve(JSON.parse(xhr.response));
                    else reject(new Error('업로드 실패: ' + xhr.status));
                };
                
                xhr.onerror = () => reject(new Error('네트워크 오류가 발생했습니다.'));
                xhr.send(file);
            }).catch(reject);
        });
    }
};