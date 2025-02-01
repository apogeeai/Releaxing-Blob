import dynamic from 'next/dynamic';

const OrbExperience = dynamic(() => import('@/components/OrbExperience'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="w-full h-screen bg-[#e8f5e9]">
      <OrbExperience />
    </main>
  );
}