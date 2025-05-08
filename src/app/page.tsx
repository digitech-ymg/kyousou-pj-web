import Graph from '@/components/graph';

import { generateGraphData } from '@/lib/graph';

const generateData = async () => {
  const { areas, projects, users } = generateGraphData();

  return {
    areas,
    projects,
    users,
  };
};

export default async function Page() {
  const { areas, projects, users } = await generateData();

  return (
    <main className="bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="relative pt-[80px]">
        <div className="absolute top-10 left-10 text-blue-800">
          <h1 className="text-2xl font-bold ">デジテック for YAMAGUCHI 共創プロジェクト</h1>
          <p>参加会員数: {users.length}名</p>
        </div>

        <Graph areas={areas} projects={projects} users={users} />
      </div>
    </main>
  );
}
