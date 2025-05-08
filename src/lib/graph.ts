import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { Area, Project, User } from '@/types/graph';

interface CSVRow {
  [key: string]: string;
}

// 色の配列
const AREA_COLORS = ['#ff6b6b', '#4ecdc4', '#ffd166'];

// 色を少し変化させる関数
function adjustColor(color: string, factor: number): string {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const newR = Math.min(255, Math.max(0, Math.round(r + factor)));
  const newG = Math.min(255, Math.max(0, Math.round(g + factor)));
  const newB = Math.min(255, Math.max(0, Math.round(b + factor)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB
    .toString(16)
    .padStart(2, '0')}`;
}

// CSVファイルを読み込む関数
function readCSV(filePath: string): CSVRow[] {
  try {
    // CSVファイルを直接読み込む
    const content = fs.readFileSync(path.join(process.cwd(), 'src', '_data', filePath), 'utf-8');
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
    });
    console.log(`Read ${rows.length} rows from ${filePath}`);
    return rows;
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    return [];
  }
}

// プロジェクト名を抽出する関数
function extractProjectName(fullName: string): string {
  return fullName.split('(')[0].trim();
}

// ホルダー名を抽出する関数
function extractHolderName(fullName: string): string {
  return fullName.split('(')[0].trim();
}

// データを生成する関数
export function generateGraphData(): { areas: Area[]; projects: Project[]; users: User[] } {
  // CSVファイルを読み込む
  const issueHolders = readCSV('issue-areas.csv');
  const projects = readCSV('kyousou-projects.csv');
  const members = readCSV('digitech-members.csv');

  // console.log('CSV Data:', { issueHolders });

  // Areaの生成
  const areas = issueHolders
    .filter((holder: CSVRow) => {
      // console.log('Processing holder:', holder);
      // Object.keys(holder).forEach((key) => {
      //   console.log(`Key: ${key}, Value: ${holder[key]}`);
      // });
      return holder['地域名'];
    })
    .map((holder: CSVRow, index: number) => {
      // console.log('Creating area for:', holder['地域名']);
      const area = {
        id: index + 1,
        name: holder['地域名'].trim(),
        color: AREA_COLORS[index % AREA_COLORS.length],
      };
      // console.log('Created area:', area);
      return area;
    });
  // const areas = [
  //   {
  //     id: 1,
  //     name: '和田地区',
  //     color: '#ff6b6b',
  //   },
  //   {
  //     id: 2,
  //     name: '阿東トイトイ',
  //     color: '#4ecdc4',
  //   },
  //   {
  //     id: 3,
  //     name: '防府市',
  //     color: '#ffd166',
  //   },
  // ];

  // Projectの生成
  const projectMap = new Map<number | string, Project | number>();
  projects
    .filter((project: CSVRow) => {
      return project['プロジェクト名'] && project['プロジェクト名'].trim() !== '';
    })
    .forEach((project: CSVRow, index: number) => {
      const areaName = extractHolderName(project['😥 課題ホルダー']);
      const area = areas.find((a: Area) => a.name === areaName);
      // console.log('Processing project:', project['プロジェクト名'], 'for area:', areaName);

      if (area) {
        const projectCount = (projectMap.get(area.id) as number) || 0;
        const color = projectCount === 0 ? area.color : adjustColor(area.color, 20 * projectCount);

        projectMap.set(area.id, projectCount + 1);

        const projectName = extractProjectName(project['プロジェクト名']);
        const projectData = {
          id: index + 1,
          name: projectName,
          color,
          areaId: area.id,
        };
        // console.log('Generated project:', projectData);
        projectMap.set(projectName, projectData);
      }
    });

  // Userの生成
  const users = members
    .filter((member: CSVRow) => member['参加PJ'] && member['参加PJ'].trim() !== '')
    .flatMap((member: CSVRow, index: number) => {
      const projectNames = member['参加PJ']
        .split(',')
        .map((p: string) => extractProjectName(p.trim()));
      // console.log('Processing member:', member['名前'], 'for projects:', projectNames);

      return projectNames
        .map((name: string) => {
          const project = Array.from(projectMap.values())
            .filter((p): p is Project => typeof p !== 'number')
            .find((p: Project) => p.name === name);
          if (!project) {
            console.log('Project not found:', name);
            return null;
          }
          const userData = {
            id: index + 1,
            name: member['名前'],
            image: '/img/user-round.svg',
            projectId: project.id,
          };
          // console.log('Generated user:', userData);
          return userData;
        })
        .filter((user): user is User => user !== null);
    });

  const result = {
    areas,
    projects: Array.from(projectMap.values()).filter((p): p is Project => typeof p !== 'number'),
    users,
  };
  // console.log('Final result:', result);
  return result;
}
