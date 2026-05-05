'use client';

import { useEffect, useRef } from 'react';

interface Stream {
    x: number;
    y: number;
    speed: number;
    length: number;
    chars: string[];
    maxOpacity: number;
}

export default function BinaryRainBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        if (!canvasRef.current) return;
        const canvas = canvasRef.current as HTMLCanvasElement;
        const maybeCtx = canvas.getContext('2d');
        if (!maybeCtx) return;
        const ctx = maybeCtx as CanvasRenderingContext2D;
        if (!ctx) return;

        let animationId: number;
        const FONT_SIZE = 14;
        const MAX_STREAMS = 55;
        let streams: Stream[] = [];

        function createStream(w: number, h: number, startOnScreen = false): Stream {
            const length = 8 + Math.floor(Math.random() * 22);
            return {
                x: Math.random() * w,
                y: startOnScreen
                    ? Math.random() * (h + length * FONT_SIZE)
                    : -(Math.random() * h * 0.5),
                speed: 0.25 + Math.random() * 0.55,
                length,
                chars: Array.from({ length }, () =>
                    Math.random() > 0.5 ? '0' : '1',
                ),
                maxOpacity: 0.04 + Math.random() * 0.10,
            };
        }

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            streams = [];
            for (let i = 0; i < MAX_STREAMS; i++) {
                streams.push(createStream(canvas.width, canvas.height, true));
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Replace off-screen streams
            streams = streams.filter(s => s.y - s.length * FONT_SIZE < canvas.height + 50);
            while (streams.length < MAX_STREAMS) {
                streams.push(createStream(canvas.width, canvas.height, false));
            }

            ctx.font = `${FONT_SIZE}px ui-monospace, SFMono-Regular, Menlo, monospace`;

            for (const s of streams) {
                s.y += s.speed;

                for (let j = 0; j < s.length; j++) {
                    const charY = s.y - j * FONT_SIZE;
                    if (charY < -FONT_SIZE || charY > canvas.height + FONT_SIZE) continue;

                    // Head bright, tail fades
                    const t = j / s.length;
                    const baseOpacity = s.maxOpacity * (1 - t * t);

                    const isHead = j === 0;
                    const opacity = isHead ? Math.min(baseOpacity * 3.5, 0.35) : baseOpacity;

                    ctx.fillStyle = `rgba(192, 240, 251, ${opacity})`;
                    ctx.fillText(s.chars[j], s.x, charY);

                    // Occasional mutation
                    if (Math.random() < 0.004) {
                        s.chars[j] = Math.random() > 0.5 ? '0' : '1';
                    }
                }
            }

            animationId = requestAnimationFrame(draw);
        }

        resize();
        window.addEventListener('resize', resize);
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="binary-rain-canvas"
        />
    );
}
