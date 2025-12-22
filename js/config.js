const CONFIG = {
    VERSION: "1.1.1",
    GNI_2024: 4405, // 단위: 만원
    STORAGE_KEY: "daelim_key_v111",
    PROMPT_HEADER: (name) => `의뢰인: ${name} 귀하\n당신은 법무법인 대림의 이규희 사무장입니다. 다음 정보를 분석하여 비자 가능성을 리포트하세요.`,
    PROMPT_FOOTER: `
        [분석 대상]: E-7-4, F-2-R, F-2-99, E-7-1, F-2-7
        [규정]: 별표(*) 제거, 이모티콘 사용, 최신 GNI 기준 적용.
    `
};