(function(window) {
    window.VisaAPI = {
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
                    if (!res.ok) throw new Error("API 인증 실패 (키를 확인하세요)");
                    const uploadUrl = res.headers.get('x-goog-upload-url');
                    xhr.open('POST', uploadUrl);
                    xhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
                    xhr.setRequestHeader('X-Goog-Upload-Offset', '0');
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
                    };
                    xhr.onload = () => resolve(JSON.parse(xhr.response));
                    xhr.onerror = () => reject(new Error("네트워크 오류"));
                    xhr.send(file);
                }).catch(reject);
            });
        }
    };
})(window);