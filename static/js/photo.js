const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const photoPreview = document.getElementById('photoPreview');
const cameraBtn = document.getElementById('cameraBtn');
const sendBtn = document.getElementById('sendBtn');
const descriptionInput = document.getElementById('descriptionInput');
const resultPanel = document.getElementById('resultPanel');

let capturedBlob = null;

// ШАГ 1: Доступ до камери
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" }, 
            audio: false 
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Помилка камери:", err);
        alert("Потрібен доступ до камери");
    }
}

// Захват фото
cameraBtn.onclick = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
        capturedBlob = blob;
        const url = URL.createObjectURL(blob);
        photoPreview.src = url;
        photoPreview.style.display = 'block';
        video.style.display = 'none';
        sendBtn.disabled = false;
        
        // Вібровідгук (якщо підтримується)
        if(window.navigator.vibrate) window.navigator.vibrate(50);
    }, 'image/jpeg', 0.8);
};

// ШАГ 3: Відправка на сервер
sendBtn.onclick = async () => {
    if (!capturedBlob) return;

    const formData = new FormData();
    formData.append('image', capturedBlob, 'meal.jpg');
    formData.append('description', descriptionInput.value);

    sendBtn.innerHTML = "⏳";
    
    try {
        const response = await fetch('/photo-meal/', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        showResult(data);
    } catch (err) {
        alert("Помилка зв'язку з AI");
    } finally {
        sendBtn.innerHTML = "➜";
    }
};

// ШАГ 4: Візуалізація результату
function showResult(data) {
    document.getElementById('finalImage').src = photoPreview.src;
    document.getElementById('resName').innerText = data.meal_name;
    document.getElementById('resTime').innerText = data.meal_time;
    document.getElementById('resKcal').innerText = data.calories;
    document.getElementById('resProt').innerText = data.protein;
    document.getElementById('resFats').innerText = data.fat;
    document.getElementById('resCarb').innerText = data.carbs;
    document.getElementById('resSugar').innerText = data.sugar;
    document.getElementById('resFiber').innerText = data.fiber;
    document.getElementById('resWeight').innerText = data.weight;

    // Анімовані бари (iOS style)
    resultPanel.classList.add('visible');
    
    setTimeout(() => {
        document.getElementById('barProt').style.width = `${Math.min(data.protein * 2, 100)}%`;
        document.getElementById('barFats').style.width = `${Math.min(data.fat * 2, 100)}%`;
        document.getElementById('barCarb').style.width = `${Math.min(data.carbs, 100)}%`;
    }, 600);
}

window.onload = initCamera;