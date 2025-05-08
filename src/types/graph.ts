export interface Area {
  id: number;
  name: string;
  color: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  areaId: number;
}

export interface User {
  id: number;
  name: string;
  image: string;
  projectId: number;
  x?: number;
  y?: number;
  projectColor?: string;
}

export interface Connection {
  source: number;
  target: number;
}

export interface SampleData {
  areas: Area[];
  projects: Project[];
  users: User[];
  connections: Connection[];
}

export interface AreaCenter {
  x: number;
  y: number;
}

export interface ProjectCenter {
  x: number;
  y: number;
}
