document.addEventListener('DOMContentLoaded', () => {

    // 1. Плавное появление при скролле
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // 2. 3D эффект наклона (Optimized)
    const tiltEl = document.getElementById('tiltElement');
    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;
    let isMoving = false;

    if (tiltEl) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!isMoving) {
                isMoving = true;
                requestAnimationFrame(animateTilt);
            }
        }, { passive: true });
    }

    function animateTilt() {
        if (!tiltEl) return;

        const rect = tiltEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distX = (mouseX - centerX) / 40; 
        const distY = (mouseY - centerY) / 40;

        currentX += (distY - currentX) * 0.1;
        currentY += (-distX - currentY) * 0.1;

        tiltEl.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg) translateZ(0)`;

        const delta = Math.abs(distY - currentX) + Math.abs(-distX - currentY);
        if (delta > 0.01) {
            requestAnimationFrame(animateTilt);
        } else {
            isMoving = false;
        }
    }
});