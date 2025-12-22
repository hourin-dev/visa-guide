const VisaAPI = {
    async uploadPDF(key, file) {
        // 기존 uploadFile 로직을 함수화
        const startRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`, {
            method: 'POST', 
            headers: { 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: { display_name: file.name } })
        });
        const url = startRes.headers.get('x-goog-upload-url');
        const res = await fetch(url, { method: 'POST', headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' }, body: file });
        return await res.json();
    },

    async generateReport(key, modelName, fileUri, payload) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [
                    { text: payload },
                    { file_data: { mime_type: "application/pdf", file_uri: fileUri } }
                ] }]
            })
        });
        return await response.json();
    }
};