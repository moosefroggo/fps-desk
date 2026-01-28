/*
  Available Objects in Room using 'Plane' naming:
  - Plane (Likely floor/walls, usually not interactive)
  - Plane001
  - Plane002
  - Plane003
  - Plane004
  - Plane005
  - Plane006
  - Plane007
  - Plane008
  - Plane009
  - Plane010
  - Plane011
*/
export interface Project {
    id: string; // Matches GLTF Object Name
    title: string;
    description: string;
}

export const PROJECTS: Project[] = [
    {
        id: 'Plane001',
        title: 'Project Alpha',
        description: 'A revolutionary app that visualizes data in 3D space.'
    },
    {
        id: 'Plane002',
        title: 'Neon Drifter',
        description: 'An arcade racing game built with Three.js and React.'
    },
    {
        id: 'Plane003',
        title: 'AI Companion',
        description: 'A chat interface powered by large language models.'
    },
    {
        id: 'Plane004',
        title: 'Portfolio V1',
        description: 'My first portfolio website from 2023.'
    },
    {
        id: 'Plane005',
        title: 'E-Commerce Dashboard',
        description: 'A clean, responsive dashboard for managing online stores.'
    },
    {
        id: 'Plane006',
        title: 'Crypto Tracker',
        description: 'Real-time cryptocurrency tracking application.'
    },
    {
        id: 'Plane007',
        title: 'Social Hub',
        description: 'A social media aggregation platform.'
    },
    {
        id: 'Plane008',
        title: 'Task Master',
        description: 'A productivity app for managing daily tasks.'
    },
    {
        id: 'Plane009',
        title: 'Weather Station',
        description: 'Local weather monitoring system interface.'
    },
    {
        id: 'Plane010',
        title: 'Music Visualizer',
        description: 'Audio reactive visualizer for web browsers.'
    },
    {
        id: 'Plane011',
        title: '3D Editor',
        description: 'Simple in-browser 3D object manipulation tool.'
    }
];
