const test = async (prompt) => {
    try {
        const res = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, sessionId: 'test', model: 'google/gemini-2.5-flash' })
        });

        if (!res.ok) {
            console.error('HTTP Error:', res.status, await res.text());
            return;
        }

        const data = await res.json();
        console.log('--- PROMPT:', prompt);
        console.log('TEXT:', data.text ? data.text.substring(0, 150) + '...' : data.text);
        console.log('HAS GEOJSON:', !!data.geojson);
        console.log('FEATURE COUNT:', data.featureCount);
        console.log('');
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
};

(async () => {
    console.log('Starting Tool Calling API tests...\n');
    await test("apa saja kecamatan di tangerang");
    await test("tampilkan kecamatan benda");
    await test("ada data apa saja di database ini?");
    console.log('Tests completed.');
})();
