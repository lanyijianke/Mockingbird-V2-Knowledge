import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '情报中心 - 知更鸟',
  description: 'AI 智能体团队 7×24 为你追踪有价值的信号',
};

export default function IntelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
