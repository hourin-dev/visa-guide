const CONFIG = {
    VERSION: "1.1.0",
    GNI_2024: 4405, // 단위: 만원
    STORAGE_KEY: "daelim_key_v110",
    MODELS: ["gemini-1.5-pro", "gemini-1.5-flash"],
    PROMPT_FOOTER: `
        [분석 대상]: E-7-4, F-2-R, F-2-99, E-7-1, F-2-7
        [출력 규정]: 모든 문장에 별표(*) 제거, 이모티콘 활용, 2024 GNI 기준 적용.
    `
};