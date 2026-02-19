var API_URL = "https://kinetic-fp1n.onrender.com";

async function triggerAISearch() {
    const aiInput = document.getElementById('dishInput');
    const aiBtn = document.querySelector('.right-btn');
    const query = aiInput.value.trim();
    if (!query) return;

    aiBtn.innerHTML = '<div class="ios-spinner"></div>';
    aiBtn.disabled = true;

    try {
        const response = await fetch(`${AI_API_URL}/ai-search/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });

        if (response.ok) {
            const data = await response.json();
            renderAIResult(data);
        }
    } catch (e) {
        console.error("AI Error", e);
    } finally {
        aiBtn.innerHTML = '<div class="arrow-up">➜</div>';
        aiBtn.disabled = false;
    }
}

function renderAIResult(data) {
    const card = document.getElementById('resultCard');
    card.style.display = 'block';
    
    let badge = data.source === "local" ? "БАЗА" : "AI ОЦІНКА";
    let badgeClass = data.source === "local" ? "local" : "fallback";

    document.getElementById('rName').innerHTML = `${data.meal_name} <span class="source-badge ${badgeClass}">${badge}</span>`;
    document.getElementById('rWeightInput').value = data.estimated_weight;
    document.getElementById('rKcal').innerText = data.calories;
    document.getElementById('rProt').innerText = data.protein + 'г';
    document.getElementById('rFats').innerText = data.fat + 'г';
    document.getElementById('rCarb').innerText = data.carbs + 'г';
    
    document.getElementById('ingList').innerHTML = '';
}