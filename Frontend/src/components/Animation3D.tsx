import { useEffect, useRef } from 'react';

const Animation3D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Animation variables
    let animationId: number;
    let rotation = 0;
    const particles: Array<{ x: number; y: number; z: number; vx: number; vy: number; vz: number }> = [];
    
    // Create particles
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * 400 - 200,
        y: Math.random() * 400 - 200,
        z: Math.random() * 400 - 200,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      rotation += 0.005;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw cube wireframe
      const size = 150;
      const vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ];

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      const rotateX = (x: number, y: number, z: number, angle: number) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [x, y * cos - z * sin, y * sin + z * cos];
      };

      const rotateY = (x: number, y: number, z: number, angle: number) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [x * cos + z * sin, y, -x * sin + z * cos];
      };

      const project = (x: number, y: number, z: number) => {
        const scale = 200 / (200 + z);
        return [centerX + x * scale, centerY + y * scale];
      };

      const rotatedVertices = vertices.map(([x, y, z]) => {
        let [rx, ry, rz] = rotateX(x * size, y * size, z * size, rotation);
        [rx, ry, rz] = rotateY(rx, ry, rz, rotation * 0.7);
        return [rx, ry, rz];
      });

      // Draw edges
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 2;
      edges.forEach(([start, end]) => {
        const [x1, y1] = project(...rotatedVertices[start] as [number, number, number]);
        const [x2, y2] = project(...rotatedVertices[end] as [number, number, number]);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Draw and update particles
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.z += particle.vz;

        // Bounce particles and keep them within bounds
        if (Math.abs(particle.x) > 200) {
          particle.vx *= -1;
          particle.x = Math.max(-200, Math.min(200, particle.x));
        }
        if (Math.abs(particle.y) > 200) {
          particle.vy *= -1;
          particle.y = Math.max(-200, Math.min(200, particle.y));
        }
        if (Math.abs(particle.z) > 200) {
          particle.vz *= -1;
          particle.z = Math.max(-200, Math.min(200, particle.z));
        }

        // Ensure z is never too close to -200 to avoid negative scale
        particle.z = Math.max(-150, particle.z);

        const [px, py] = project(particle.x, particle.y, particle.z);
        const scale = Math.max(0.1, 200 / (200 + particle.z)); // Ensure scale is always positive
        const radius = Math.max(1, scale * 3); // Ensure radius is always positive
        
        const opacity = Math.max(0.1, Math.min(1, scale * 0.8));
        ctx.fillStyle = `rgba(147, 51, 234, ${opacity})`;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-2">3D Visualization</h3>
          <p className="text-white/80">Advanced spatial analysis technology</p>
        </div>
      </div>
    </div>
  );
};

export default Animation3D;
