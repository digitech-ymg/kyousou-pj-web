'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { User, Connection, AreaCenter, ProjectCenter, Area, Project } from '../types/graph';

interface ExtendedUser extends User {
  x?: number;
  y?: number;
  projectColor?: string;
  baseX?: number; // 初期位置のX座標
  baseY?: number; // 初期位置のY座標
}

interface GraphProps {
  areas: Area[];
  projects: Project[];
  users: User[];
}

// 同一プロジェクト内のユーザーを数珠繋ぎにする接続リストを生成
const generateConnectionsByProject = (users: User[], projects: Project[]): Connection[] => {
  const connections: Connection[] = [];
  projects.forEach((project) => {
    const projectUsers = users.filter((user) => user.projectId === project.id);
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

export default function Graph({ areas, projects, users }: GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    // ウィンドウサイズに応じてグラフサイズを調整（上位のh1の高さを除く）
    const updateDimensions = () => {
      console.log('window.innerWidth:', window.innerWidth);
      console.log('window.innerHeight:', window.innerHeight);
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 80,
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
    const areaCenters: { [key: number]: AreaCenter } = {};
    const areaRadiusX = dimensions.width * 0.25; // 横方向の半径を少し小さく
    const areaRadiusY = dimensions.height * 0.25; // 縦方向の半径を少し小さく

    areas.forEach((area, i) => {
      const angle = (i * 2 * Math.PI) / areas.length;
      const x = dimensions.width / 2 - 100 + Math.cos(angle) * areaRadiusX;
      const y = dimensions.height / 2 + Math.sin(angle) * areaRadiusY;
      areaCenters[area.id] = { x, y };
    });

    // プロジェクトごとのユーザー数をカウント
    const projectUserCounts: { [key: number]: number } = {};
    users.forEach((user) => {
      if (!projectUserCounts[user.projectId]) {
        projectUserCounts[user.projectId] = 0;
      }
      projectUserCounts[user.projectId]++;
    });

    // プロジェクトの中心位置を計算（エリア中心からの距離を1.5倍に）
    const projectCenters: { [key: number]: ProjectCenter } = {};
    const baseProjectRadius = dimensions.width * 0.06; // 基本サイズ
    const projectRadii: { [key: number]: number } = {}; // プロジェクトごとに大きさを保存

    projects.forEach((project) => {
      const areaCenter = areaCenters[project.areaId];
      const projectsInArea = projects.filter((p) => p.areaId === project.areaId);
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
    areas.forEach((area) => {
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
    projects.forEach((project) => {
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
      .data(areas)
      .enter()
      .append('ellipse')
      .attr('class', 'area-circle')
      .attr('cx', (d) => areaCenters[d.id].x)
      .attr('cy', (d) => areaCenters[d.id].y)
      .attr('rx', areaRadiusX)
      .attr('ry', areaRadiusY)
      .attr('fill', (d) => `url(#area-gradient-${d.id})`)
      .attr('stroke', (d) => {
        const project = projects.find((p) => p.areaId === d.id);
        return project ? project.color : '#e2e8f0';
      })
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-opacity', 0.5);

    // エリア名を表示
    svg
      .selectAll('.area-label')
      .data(areas)
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
        const bbox = text.node()?.getBBox();
        if (!bbox) return;

        // 下線を追加
        g.append('line')
          .attr('x1', bbox.x)
          .attr('y1', bbox.y + bbox.height + 5)
          .attr('x2', bbox.x + bbox.width)
          .attr('y2', bbox.y + bbox.height + 5)
          .attr('stroke', () => {
            const project = projects.find((p) => p.areaId === d.id);
            return project ? project.color : '#334155';
          })
          .attr('stroke-width', 3);
      });

    // プロジェクトの円を描画（ユーザー数に比例したサイズ）
    svg
      .selectAll('.project-circle')
      .data(projects)
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
      .data(projects)
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
      .data(projects)
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
    const userData: ExtendedUser[] = users.map((user) => {
      const project = projects.find((p) => p.id === user.projectId);
      if (!project) return user as ExtendedUser;

      const projectCenter = projectCenters[user.projectId];
      const projectRadius = projectRadii[user.projectId];
      const usersInProject = users.filter((u) => u.projectId === user.projectId);
      const userIndex = usersInProject.findIndex((u) => u.id === user.id);

      const angle = (userIndex * 2 * Math.PI) / usersInProject.length + Math.random() * 0.3;
      const distance = projectRadius * 1.0 + Math.random() * projectRadius * 0.3;

      const x = projectCenter.x + Math.cos(angle) * distance;
      const y = projectCenter.y + Math.sin(angle) * distance;

      return {
        ...user,
        x,
        y,
        baseX: x, // 初期位置を保存
        baseY: y, // 初期位置を保存
        projectColor: project.color,
      } as ExtendedUser;
    });

    // 接続データを生成
    const connections = generateConnectionsByProject(users, projects);

    // 同一プロジェクト内のユーザーを数珠繋ぎにするコネクションを描画
    const links = svg
      .selectAll('.link')
      .data(connections)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', (d: Connection) => {
        const sourceUser = userData.find((user) => user.id === d.source);
        return sourceUser?.projectColor || '#94a3b8';
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
        const usersInProject = users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? 24 : 20;
      });

    // ユーザーのアバター画像の背景
    userNodes
      .append('circle')
      .attr('r', (d: User) => {
        const usersInProject = users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? 30 : 24; // 先頭ユーザーは25px、それ以外は22px
      })
      .attr('fill', 'white')
      .attr('stroke', (d: User) => d.projectColor || '#94a3b8')
      .attr('stroke-width', 2);

    // ユーザーのアバター画像
    userNodes
      .append('image')
      .attr('xlink:href', (d) => d.image)
      .attr('x', (d) => {
        const usersInProject = users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? -25 : -20;
      })
      .attr('y', (d) => {
        const usersInProject = users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? -25 : -20;
      })
      .attr('width', (d) => {
        const usersInProject = users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? 50 : 40;
      })
      .attr('height', (d) => {
        const usersInProject = users.filter((u) => u.projectId === d.projectId);
        const isFirstUser = usersInProject[0].id === d.id;
        return isFirstUser ? 50 : 40;
      })
      .attr('clip-path', (d) => `url(#clip-${d.id})`);

    // ユーザー名を表示
    userNodes
      .append('text')
      .attr('dy', 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', '16px')
      .text((d) => d.name);

    // ノードの浮遊アニメーション
    function floatAnimation() {
      userNodes
        .transition()
        .duration(3000)
        .ease(d3.easeQuadInOut)
        .attr('transform', (d: ExtendedUser) => {
          if (
            d.x === undefined ||
            d.y === undefined ||
            d.baseX === undefined ||
            d.baseY === undefined
          ) {
            return `translate(0, 0)`;
          }

          // 初期位置からの最大移動距離（プロジェクトの半径の40%）
          const maxDistance = projectRadii[d.projectId] * 0.4;

          // 現在の位置から初期位置までの距離を計算
          const currentDistance = Math.sqrt(
            Math.pow(d.x - d.baseX, 2) + Math.pow(d.y - d.baseY, 2),
          );

          // 初期位置からの距離が最大距離を超えている場合は、初期位置に戻る方向に移動
          if (currentDistance > maxDistance) {
            const angle = Math.atan2(d.baseY - d.y, d.baseX - d.x);
            d.x = d.baseX + Math.cos(angle) * maxDistance * 0.8;
            d.y = d.baseY + Math.sin(angle) * maxDistance * 0.8;
          } else {
            // ランダムな方向に少し移動
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * maxDistance * 0.3;
            d.x = d.baseX + Math.cos(angle) * distance;
            d.y = d.baseY + Math.sin(angle) * distance;
          }

          return `translate(${d.x}, ${d.y})`;
        })
        .on('end', floatAnimation);

      // コネクションの更新
      links
        .transition()
        .duration(3000)
        .ease(d3.easeQuadInOut)
        .attr('x1', (d: Connection) => {
          const sourceUser = userData.find((user) => user.id === d.source);
          return sourceUser?.x || 0;
        })
        .attr('y1', (d: Connection) => {
          const sourceUser = userData.find((user) => user.id === d.source);
          return sourceUser?.y || 0;
        })
        .attr('x2', (d: Connection) => {
          const targetUser = userData.find((user) => user.id === d.target);
          return targetUser?.x || 0;
        })
        .attr('y2', (d: Connection) => {
          const targetUser = userData.find((user) => user.id === d.target);
          return targetUser?.y || 0;
        });
    }

    // 各ユーザーのアニメーション開始タイミングをランダムに設定
    userData.forEach((user) => {
      const randomDelay = Math.random() * 3000; // 0-2秒のランダムな遅延
      setTimeout(() => {
        const userNode = d3
          .select(svgRef.current)
          .selectAll<SVGGElement, ExtendedUser>('.user-node')
          .filter((d) => d.id === user.id);

        userNode
          .transition()
          .duration(3000)
          .ease(d3.easeQuadInOut)
          .attr('transform', (d) => {
            if (d.x === undefined || d.y === undefined) return `translate(0, 0)`;
            return `translate(${d.x}, ${d.y})`;
          })
          .on('end', floatAnimation);
      }, randomDelay);
    });

    // コネクションの初期位置を設定
    links
      .attr('x1', (d: Connection) => userData.find((user) => user.id === d.source)?.x || 0)
      .attr('y1', (d: Connection) => userData.find((user) => user.id === d.source)?.y || 0)
      .attr('x2', (d: Connection) => userData.find((user) => user.id === d.target)?.x || 0)
      .attr('y2', (d: Connection) => userData.find((user) => user.id === d.target)?.y || 0);
  }, [dimensions, areas, projects, users]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    ></svg>
  );
}
