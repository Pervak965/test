export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const ip = request.headers.get("CF-Connecting-IP");
    const key = "user:" + ip;

    const LIMIT = 30 * 60 * 1000; // 30 минут

    // 🔹 отправка сообщения
    if (url.pathname === "/send" && request.method === "POST") {
      const body = await request.json();
      const text = body.text?.trim();

      if (!text) {
        return json({ ok: false, error: "empty" });
      }

      const last = await env.KV.get(key);

      if (last) {
        const diff = Date.now() - Number(last);

        if (diff < LIMIT) {
          return json({
            ok: false,
            retryAfter: Math.ceil((LIMIT - diff) / 1000)
          });
        }
      }

      // сохраняем время
      await env.KV.put(key, Date.now().toString());

      // сохраняем сообщение
      const messages = JSON.parse(await env.KV.get("messages") || "[]");
      messages.unshift({ text });

      await env.KV.put("messages", JSON.stringify(messages.slice(0, 50)));

      return json({ ok: true });
    }

    // 🔹 получение сообщений
    if (url.pathname === "/messages") {
      const messages = JSON.parse(await env.KV.get("messages") || "[]");
      return json(messages);
    }

    return new Response("OK");
  }
};

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}
