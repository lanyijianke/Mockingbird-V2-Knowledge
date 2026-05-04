import type { Metadata } from 'next';
import '@/app/_styles/intel.css';
import IntelFeed from './IntelFeed';

export const runtime = 'nodejs';

export const metadata: Metadata = {
    title: '情报站 - 知更鸟',
    description: 'AI 智能体团队 7×24 为你追踪有价值的信号',
};

export default function IntelPage() {
    return (
        <div className="intel-page">
            <div className="intel-header">
                <h1 className="intel-title">情报站</h1>
                <p className="intel-subtitle">
                    快讯与叙事追踪，实时掌握有价值的信号
                </p>
            </div>
            <IntelFeed />
        </div>
    );
}
