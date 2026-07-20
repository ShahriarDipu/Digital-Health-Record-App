import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsAppNumber } from "@/lib/phoneCountries";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      whatsappNumber,
      whatsappCountryDial,
      whatsappLocalNumber,
    } = body as {
      name?: string;
      email?: string;
      password?: string;
      whatsappNumber?: string;
      whatsappCountryDial?: string;
      whatsappLocalNumber?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "পুরো নাম দিন" }, { status: 400 });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "সঠিক ইমেইল দিন" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "এই ইমেইল দিয়ে আগে থেকেই একটি অ্যাকাউন্ট আছে" },
        { status: 409 }
      );
    }

    let normalizedWhatsapp: string | null = null;

    if (whatsappNumber && String(whatsappNumber).replace(/\D/g, "")) {
      normalizedWhatsapp = String(whatsappNumber).replace(/\D/g, "");
    } else if (whatsappLocalNumber && whatsappLocalNumber.trim()) {
      const dial = whatsappCountryDial || "880";
      const result = normalizeWhatsAppNumber(dial, whatsappLocalNumber);
      if (!result.ok) {
        return NextResponse.json({ error: result.errorBn }, { status: 400 });
      }
      normalizedWhatsapp = result.value;
    }

    if (normalizedWhatsapp && (normalizedWhatsapp.length < 10 || normalizedWhatsapp.length > 15)) {
      return NextResponse.json(
        { error: "সঠিক WhatsApp নম্বর দিন" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        whatsappNumber: normalizedWhatsapp,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(
      { message: "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন" },
      { status: 500 }
    );
  }
}
