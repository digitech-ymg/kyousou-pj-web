'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// サンプルデータ - 3つのエリア、各エリアに2つのプロジェクト、各プロジェクトに2〜5人のユーザー
const sampleData = {
  areas: [
    { id: 1, name: '周南市和田' },
    { id: 2, name: '山口市阿東' },
    { id: 3, name: '防府市' },
  ],
  projects: [
    { id: 1, name: 'チラシ改善PJ', color: '#ff6b6b', areaId: 1 },
    { id: 2, name: '動画発信PJ', color: '#ff9e7d', areaId: 1 },
    { id: 3, name: 'Kintoneデータ活用PJ', color: '#4ecdc4', areaId: 2 },
    { id: 4, name: '生成AI申請書PJ', color: '#ffd166', areaId: 3 },
  ],
  users: [
    // エリアA - プロジェクトA1のユーザー (5名)
    { id: 1, name: 'nasukawa', image: '/api/placeholder/60/60', projectId: 1 },
    { id: 2, name: 'yoshino', image: '/api/placeholder/60/60', projectId: 1 },
    { id: 3, name: 'userA', image: '/api/placeholder/60/60', projectId: 1 },
    { id: 4, name: 'userB', image: '/api/placeholder/60/60', projectId: 1 },
    { id: 5, name: 'userC', image: '/api/placeholder/60/60', projectId: 1 },
    // エリアA - プロジェクトA2のユーザー (2名)
    { id: 6, name: 'nasukawa', image: '/api/placeholder/60/60', projectId: 2 },
    { id: 7, name: 'someone', image: '/api/placeholder/60/60', projectId: 2 },
    // エリアB - プロジェクトB1のユーザー (4名)
    { id: 8, name: 'yoshitomi', image: '/api/placeholder/60/60', projectId: 3 },
    { id: 9, name: 'fukuda', image: '/api/placeholder/60/60', projectId: 3 },
    { id: 10, name: 'haga', image: '/api/placeholder/60/60', projectId: 3 },
    // エリアB - プロジェクトB2のユーザー (3名)
    { id: 11, name: 'yoshida', image: '/api/placeholder/60/60', projectId: 4 },
    { id: 12, name: 'userX', image: '/api/placeholder/60/60', projectId: 4 },
  ],
};

// 同一プロジェクト内のユーザーを数珠繋ぎにする接続リストを生成
const generateConnectionsByProject = () => {
  const connections = [];
  sampleData.projects.forEach((project) => {
    const projectUsers = sampleData.users.filter((user) => user.projectId === project.id);
    for (let i = 0; i < projectUsers.length; i++) {
      const nextIndex = (i + 1) % projectUsers.length;
      connections.push({
        source: projectUsers[i].id,
        target: projectUsers[nextIndex].id,
      });
    }
  });
  return connections;
};

// 接続データを生成
sampleData.connections = generateConnectionsByProject();

export default function Graph() {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    // ウィンドウサイズに応じてグラフサイズを調整
    const updateDimensions = () => {
      // setDimensions({
      //   width: window.innerWidth > 1200 ? 1200 : window.innerWidth - 50,
      //   height: window.innerWidth > 1200 ? 900 : Math.max(600, window.innerHeight - 100),
      // });
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    // SVGをクリア
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('viewBox', [0, 0, dimensions.width, dimensions.height]);

    // エリアの中心位置を計算
    const areaCenters = {};
    const areaRadiusX = dimensions.width * 0.25; // 横方向の半径を少し小さく
    const areaRadiusY = dimensions.height * 0.25; // 縦方向の半径を少し小さく

    sampleData.areas.forEach((area, i) => {
      const angle = (i * 2 * Math.PI) / sampleData.areas.length;
      const x = dimensions.width / 2 - 100 + Math.cos(angle) * areaRadiusX;
      const y = dimensions.height / 2 + Math.sin(angle) * areaRadiusY;
      areaCenters[area.id] = { x, y };
    });

    // プロジェクトごとのユーザー数をカウント
    const projectUserCounts = {};
    sampleData.users.forEach((user) => {
      if (!projectUserCounts[user.projectId]) {
        projectUserCounts[user.projectId] = 0;
      }
      projectUserCounts[user.projectId]++;
    });

    // プロジェクトの中心位置を計算（エリア中心からの距離を1.5倍に）
    const projectCenters = {};
    const baseProjectRadius = dimensions.width * 0.06; // 基本サイズ
    const projectRadii = {}; // プロジェクトごとに大きさを保存

    sampleData.projects.forEach((project) => {
      const areaCenter = areaCenters[project.areaId];
      const projectsInArea = sampleData.projects.filter((p) => p.areaId === project.areaId);
      const projectIndex = projectsInArea.findIndex((p) => p.id === project.id);

      // 右上45度（π/4）から始めて、360度をプロジェクト数で割った角度で配置
      const angle = (projectIndex * 2 * Math.PI) / projectsInArea.length;

      // エリア中心からの距離を0.5倍に増加
      const distance = areaRadiusX * 0.5;

      const x = areaCenter.x + Math.cos(angle) * distance;
      const y = areaCenter.y + Math.sin(angle) * distance;
      projectCenters[project.id] = { x, y };

      // ユーザー数に比例したプロジェクトサイズを計算
      const userCount = projectUserCounts[project.id] || 0;
      // 最小2名、最大5名の範囲で比例的に大きさを設定
      const sizeFactor = 0.7 + ((userCount - 2) * 0.3) / 3; // 2名→0.7、5名→1.0の範囲
      projectRadii[project.id] = baseProjectRadius * sizeFactor;
    });

    // グラデーションの定義
    const defs = svg.append('defs');

    // エリアのグラデーション
    sampleData.areas.forEach((area) => {
      const gradient = defs
        .append('radialGradient')
        .attr('id', `area-gradient-${area.id}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#f8f9fa')
        .attr('stop-opacity', 0.1);

      gradient
        .append('stop')
        .attr('offset', '70%')
        .attr('stop-color', '#f8f9fa')
        .attr('stop-opacity', 0.05);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#f8f9fa')
        .attr('stop-opacity', 0);
    });

    // プロジェクトのグラデーション
    sampleData.projects.forEach((project) => {
      const gradient = defs
        .append('radialGradient')
        .attr('id', `project-gradient-${project.id}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', project.color)
        .attr('stop-opacity', 0.6);

      gradient
        .append('stop')
        .attr('offset', '70%')
        .attr('stop-color', project.color)
        .attr('stop-opacity', 0.3);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', project.color)
        .attr('stop-opacity', 0);
    });

    // エリアの円を描画
    svg
      .selectAll('.area-circle')
      .data(sampleData.areas)
      .enter()
      .append('ellipse')
      .attr('class', 'area-circle')
      .attr('cx', (d) => areaCenters[d.id].x)
      .attr('cy', (d) => areaCenters[d.id].y)
      .attr('rx', areaRadiusX)
      .attr('ry', areaRadiusY)
      .attr('fill', (d) => `url(#area-gradient-${d.id})`)
      .attr('stroke', (d) => {
        const project = sampleData.projects.find((p) => p.areaId === d.id);
        return project ? project.color : '#e2e8f0';
      })
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-opacity', 0.5);

    // エリア名を表示
    svg
      .selectAll('.area-label')
      .data(sampleData.areas)
      .enter()
      .append('g')
      .attr('class', 'area-label')
      .attr('transform', (d) => `translate(${areaCenters[d.id].x}, ${areaCenters[d.id].y})`)
      .each(function (d) {
        const g = d3.select(this);

        // エリア名のテキスト
        const text = g
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('fill', '#334155')
          .attr('font-size', '24px')
          .attr('font-weight', 'bold')
          .text(d.name);

        // テキストのバウンディングボックスを取得
        const bbox = text.node().getBBox();

        // 下線を追加
        g.append('line')
          .attr('x1', bbox.x)
          .attr('y1', bbox.y + bbox.height + 5)
          .attr('x2', bbox.x + bbox.width)
          .attr('y2', bbox.y + bbox.height + 5)
          .attr('stroke', (d) => {
            const project = sampleData.projects.find((p) => p.areaId === d.id);
            return project ? project.color : '#334155';
          })
          .attr('stroke-width', 3);
      });

    // プロジェクトの円を描画（ユーザー数に比例したサイズ）
    svg
      .selectAll('.project-circle')
      .data(sampleData.projects)
      .enter()
      .append('circle')
      .attr('class', 'project-circle')
      .attr('cx', (d) => projectCenters[d.id].x)
      .attr('cy', (d) => projectCenters[d.id].y)
      .attr('r', (d) => projectRadii[d.id]) // ユーザー数に比例したサイズ
      .attr('fill', (d) => `url(#project-gradient-${d.id})`)
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5);

    // プロジェクト名を表示
    svg
      .selectAll('.project-label')
      .data(sampleData.projects)
      .enter()
      .append('text')
      .attr('class', 'project-label')
      .attr('x', (d) => projectCenters[d.id].x)
      .attr('y', (d) => projectCenters[d.id].y - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#1e293b')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text((d) => d.name);

    // ユーザー数表示を追加
    svg
      .selectAll('.user-count')
      .data(sampleData.projects)
      .enter()
      .append('text')
      .attr('class', 'user-count')
      .attr('x', (d) => projectCenters[d.id].x)
      .attr('y', (d) => projectCenters[d.id].y + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', '12px')
      .text((d) => `(${projectUserCounts[d.id] || 0}人)`);

    // ユーザーの初期位置を計算
    const userData = sampleData.users.map((user) => {
      const project = sampleData.projects.find((p) => p.id === user.projectId);
      const projectCenter = projectCenters[user.projectId];
      const projectRadius = projectRadii[user.projectId];
      const usersInProject = sampleData.users.filter((u) => u.projectId === user.projectId);
      const userIndex = usersInProject.findIndex((u) => u.id === user.id);

      // プロジェクトの周りに均等に配置 + ランダム性を追加
      const angle = (userIndex * 2 * Math.PI) / usersInProject.length + Math.random() * 0.3;
      const distance = projectRadius * 1.0 + Math.random() * projectRadius * 0.3;

      const x = projectCenter.x + Math.cos(angle) * distance;
      const y = projectCenter.y + Math.sin(angle) * distance;

      return { ...user, x, y, projectColor: project.color };
    });

    // 同一プロジェクト内のユーザーを数珠繋ぎにするコネクションを描画
    const links = svg
      .selectAll('.link')
      .data(sampleData.connections)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', (d) => {
        const sourceUser = userData.find((user) => user.id === d.source);
        return sourceUser ? sourceUser.projectColor : '#94a3b8';
      })
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1.5);

    // ユーザーのノードを作成
    const userNodes = svg
      .selectAll('.user-node')
      .data(userData)
      .enter()
      .append('g')
      .attr('class', 'user-node')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

    // ユーザーのアバター画像（円形クリップパスを適用）
    defs
      .selectAll('.avatar-clip')
      .data(userData)
      .enter()
      .append('clipPath')
      .attr('id', (d) => `clip-${d.id}`)
      .append('circle')
      .attr('r', (d) => {
        const usersInProject = sampleData.users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? 24 : 20;
      });

    // ユーザーのアバター画像の背景
    userNodes
      .append('circle')
      .attr('r', (d) => {
        const usersInProject = sampleData.users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? 30 : 24; // 先頭ユーザーは25px、それ以外は22px
      })
      .attr('fill', 'white')
      .attr('stroke', (d) => d.projectColor)
      .attr('stroke-width', 2);

    // ユーザーのアバター画像
    userNodes
      .append('image')
      .attr('xlink:href', (d) => 'https://avatar.iran.liara.run/public')
      .attr('x', (d) => {
        const usersInProject = sampleData.users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? -25 : -20;
      })
      .attr('y', (d) => {
        const usersInProject = sampleData.users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? -25 : -20;
      })
      .attr('width', (d) => {
        const usersInProject = sampleData.users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? 50 : 40;
      })
      .attr('height', (d) => {
        const usersInProject = sampleData.users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? 50 : 40;
      })
      .attr('clip-path', (d) => `url(#clip-${d.id})`);

    // ユーザー名を表示
    userNodes
      .append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', '12px')
      .text((d) => d.name);

    // ノードの浮遊アニメーション
    function floatAnimation() {
      userNodes
        .transition()
        .duration(5000)
        .attr('transform', (d) => {
          // プロジェクトを中心とした軌道上を浮遊するような動き
          const projectCenter = projectCenters[d.projectId];
          const radius = Math.sqrt(
            Math.pow(d.x - projectCenter.x, 2) + Math.pow(d.y - projectCenter.y, 2),
          );
          const currentAngle = Math.atan2(d.y - projectCenter.y, d.x - projectCenter.x);

          // 移動量を2倍に
          const newAngle = currentAngle + (Math.random() * 0.1 - 0.05);

          // 軌道半径も少し変動させる（制限付き）
          const minRadius = projectRadii[d.projectId] * 1.2; // 最小半径（プロジェクト半径の1.2倍）
          const maxRadius = projectRadii[d.projectId] * 2.0; // 最大半径（プロジェクト半径の2.0倍）
          const newRadius = Math.min(
            Math.max(radius * (1 + (Math.random() * 0.12 - 0.06)), minRadius),
            maxRadius,
          );

          d.x = projectCenter.x + Math.cos(newAngle) * newRadius;
          d.y = projectCenter.y + Math.sin(newAngle) * newRadius;

          return `translate(${d.x}, ${d.y})`;
        })
        .on('end', floatAnimation);

      // コネクションの更新
      links
        .transition()
        .duration(5000)
        .attr('x1', (d) => userData.find((user) => user.id === d.source).x)
        .attr('y1', (d) => userData.find((user) => user.id === d.source).y)
        .attr('x2', (d) => userData.find((user) => user.id === d.target).x)
        .attr('y2', (d) => userData.find((user) => user.id === d.target).y);
    }

    // アニメーションを開始
    floatAnimation();

    // コネクションの初期位置を設定
    links
      .attr('x1', (d) => userData.find((user) => user.id === d.source).x)
      .attr('y1', (d) => userData.find((user) => user.id === d.source).y)
      .attr('x2', (d) => userData.find((user) => user.id === d.target).x)
      .attr('y2', (d) => userData.find((user) => user.id === d.target).y);
  }, [dimensions]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 p-4 overflow-hidden relative">
      <h1 className="absolute top-4 left-4 text-4xl font-bold text-blue-800">
        デジテック for YAMAGUCHI 共創PJ
      </h1>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      ></svg>
    </div>
  );
}
