import React, { useEffect, useRef } from 'react';

const Confetti = ({ onComplete }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const colors = [
      '#10b981', // emerald
      '#ec4899', // pink
      '#6366f1', // indigo
      '#f59e0b', // amber
      '#06b6d4', // cyan
      '#a855f7', // purple
      '#3b82f6', // blue
    ];

    const particles = [];
    const particleCount = 150;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
        opacity: 1,
      });
    }

    let startTime = Date.now();
    const duration = 6000; // 6 seconds

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        if (onComplete) onComplete();
        return;
      }

      ctx.clearRect(0, 0, width, height);

      let activeParticles = 0;

      particles.forEach((p) => {
        if (p.y > height) {
          // Recycle particles to the top for continuous flow until duration is near
          if (elapsed < duration - 1500) {
            p.y = -20;
            p.x = Math.random() * width;
            p.vy = Math.random() * 3 + 2;
          } else {
            return; // let it fall off screen
          }
        }

        activeParticles++;

        p.x += p.vx + Math.sin(p.y / 30) * 0.5; // sway slightly
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (activeParticles === 0 && elapsed >= duration - 1500) {
        if (onComplete) onComplete();
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] w-full h-full"
    />
  );
};

export default Confetti;
