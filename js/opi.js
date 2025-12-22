const VisaAPI = {
    async uploadPDF(key, file, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`, {
                method: 'POST',
                headers: { 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: { display_name: file.name } })
            }).then(async (res) => {
                if (!res.ok) throw new Error(`세션 생성 실패 (${res.status})`);
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
                    else reject(new Error('전송 실패'));
                };
                xhr.onerror = () => reject(new Error('네트워크 오류'));
                xhr.send(file);
            }).catch(reject);
        });
    }
};