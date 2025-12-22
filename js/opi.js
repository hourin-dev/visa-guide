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
                    const errorData = await res.json();
                    console.error("Google API 상세 오류:", errorData);
                    throw new Error(`서버 응답 오류: ${res.status} (${errorData.error.message})`);
                }

                const uploadUrl = res.headers.get('x-goog-upload-url');
                if (!uploadUrl) throw new Error("업로드 URL을 찾을 수 없습니다.");

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
                    if (xhr.status === 200 || xhr.status === 201) resolve(JSON.parse(xhr.response));
                    else reject(new Error('전송 실패: ' + xhr.status));
                };
                
                xhr.onerror = () => reject(new Error('네트워크/CORS 오류 발생. 반드시 Live Server(http://)로 실행하세요.'));
                xhr.send(file);
            }).catch(reject);
        });
    }
};