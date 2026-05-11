import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";

const RATE_CARD_PATH = join(process.cwd(), "data", "commercial-rate-cards.json");

async function readRateCards(): Promise<any[]> {
  try {
    const data = await fs.readFile(RATE_CARD_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeRateCards(data: any[]) {
  await fs.writeFile(RATE_CARD_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// GET — list all rate cards (with optional filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const group = searchParams.get("group");
    
    let rateCards = await readRateCards();
    
    if (type) rateCards = rateCards.filter((r: any) => r.type === type);
    if (group) rateCards = rateCards.filter((r: any) => r.group === group);
    
    // Get unique types and groups for filter dropdown
    const types = [...new Set(rateCards.map((r: any) => r.type))];
    const groups = [...new Set(rateCards.map((r: any) => r.group))];
    
    return NextResponse.json({ 
      success: true, 
      data: rateCards,
      meta: { types, groups }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to read rate cards", error: String(error) },
      { status: 500 }
    );
  }
}

// POST — add new rate card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, group, role, hpp, specialRate, publishRate } = body;
    
    // Validate required fields
    if (!type || !group || !role || hpp === undefined || specialRate === undefined || publishRate === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }
    
    const rateCards = await readRateCards();
    
    // Generate ID
    const prefix = type.substring(0, 1).toLowerCase();
    const count = rateCards.filter((r: any) => r.type === type).length + 1;
    const id = `${prefix}-${count}`;
    
    const newCard = {
      id,
      type,
      group,
      role,
      hpp: Number(hpp),
      specialRate: Number(specialRate),
      publishRate: Number(publishRate)
    };
    
    rateCards.push(newCard);
    await writeRateCards(rateCards);
    
    return NextResponse.json(
      { success: true, data: newCard },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to add rate card", error: String(error) },
      { status: 500 }
    );
  }
}

// PUT — update rate card by ID
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, group, role, hpp, specialRate, publishRate } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }
    
    const rateCards = await readRateCards();
    const index = rateCards.findIndex((r: any) => r.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "Rate card not found" },
        { status: 404 }
      );
    }
    
    // Update fields (partial update)
    if (type !== undefined) rateCards[index].type = type;
    if (group !== undefined) rateCards[index].group = group;
    if (role !== undefined) rateCards[index].role = role;
    if (hpp !== undefined) rateCards[index].hpp = Number(hpp);
    if (specialRate !== undefined) rateCards[index].specialRate = Number(specialRate);
    if (publishRate !== undefined) rateCards[index].publishRate = Number(publishRate);
    
    await writeRateCards(rateCards);
    
    return NextResponse.json(
      { success: true, data: rateCards[index] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update rate card", error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE — delete rate card by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }
    
    const rateCards = await readRateCards();
    const filtered = rateCards.filter((r: any) => r.id !== id);
    
    if (filtered.length === rateCards.length) {
      return NextResponse.json(
        { success: false, message: "Rate card not found" },
        { status: 404 }
      );
    }
    
    await writeRateCards(filtered);
    
    return NextResponse.json(
      { success: true, message: "Rate card deleted" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete rate card", error: String(error) },
      { status: 500 }
    );
  }
}
