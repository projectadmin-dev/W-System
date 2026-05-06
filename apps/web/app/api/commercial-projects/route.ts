import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'commercial-projects.json');

function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
}

function readProjects() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeProjects(data: any[]) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /api/commercial-projects
export async function GET() {
  return NextResponse.json(readProjects());
}

// POST /api/commercial-projects
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.projectName || !body.projectName.trim()) {
    return NextResponse.json({ error: 'Nama project wajib diisi' }, { status: 400 });
  }
  const projects = readProjects();
  const newProject = { ...body, createdAt: body.createdAt || new Date().toISOString() };
  projects.push(newProject);
  writeProjects(projects);
  return NextResponse.json(newProject, { status: 201 });
}

// PUT /api/commercial-projects → replace all (bulk update for delete/edit reorder)
export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an array' }, { status: 400 });
  }
  writeProjects(body);
  return NextResponse.json({ success: true, count: body.length });
}
