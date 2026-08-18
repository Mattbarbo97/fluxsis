import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Handshake de verificação exigido pela Meta ao configurar o webhook.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Recebe mensagens do WhatsApp Cloud API.
export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // Eventos de status (entregue/lido) não têm "messages" — ignora sem erro.
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const phoneNumberId = value.metadata?.phone_number_id;
    const from = message.from; // telefone do cliente
    const text = message.text?.body?.trim() ?? "";

    const admin = createAdminClient();

    // Descobre a qual tenant esse número de WhatsApp pertence.
    const { data: config } = await admin
      .from("tenant_whatsapp_config")
      .select("tenant_id")
      .eq("phone_number_id", phoneNumberId)
      .maybeSingle();

    if (!config) {
      // Número não configurado em nenhum tenant — não há para quem responder.
      return NextResponse.json({ ok: true });
    }

    const tenantId = config.tenant_id;

    // Garante que o cliente existe no CRM (cria se for a primeira mensagem).
    await admin
      .from("customers")
      .upsert(
        { tenant_id: tenantId, phone: from },
        { onConflict: "tenant_id,phone", ignoreDuplicates: true }
      );

    const replyText = await buildReply(admin, tenantId, text);

    await sendWhatsAppMessage(phoneNumberId, from, replyText);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook do WhatsApp:", err);
    // Sempre responde 200 para a Meta não ficar reenviando o mesmo evento.
    return NextResponse.json({ ok: true });
  }
}

async function buildReply(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  text: string
): Promise<string> {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("cardápio") ||
    normalized.includes("cardapio") ||
    normalized.includes("catálogo") ||
    normalized.includes("catalogo") ||
    normalized === "menu"
  ) {
    const { data: products } = await admin
      .from("products")
      .select("name, price, volume")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .order("name")
      .limit(20);

    if (!products || products.length === 0) {
      return "No momento não temos produtos cadastrados. Volte em breve!";
    }

    const lines = products.map(
      (p) =>
        `• ${p.name}${p.volume ? ` (${p.volume})` : ""} — R$ ${Number(
          p.price
        ).toFixed(2)}`
    );

    return `Aqui está nosso cardápio:\n\n${lines.join("\n")}\n\nPara fazer um pedido, fale com nosso atendimento.`;
  }

  if (normalized === "oi" || normalized === "olá" || normalized === "ola") {
    return "Olá! 👋 Digite *cardápio* para ver nossos produtos.";
  }

  return "Não entendi. Digite *cardápio* para ver nossos produtos disponíveis.";
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string
) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    console.error("WHATSAPP_TOKEN não configurado.");
    return;
  }

  await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );
}
