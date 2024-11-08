import { bundle } from "jsr:@deno/emit";

const gameSourceURL = new URL("./src/game.ts", import.meta.url);
const botSourceURL = new URL("./src/bot.ts", import.meta.url);
const libUrl = new URL('./src/lib.ts', import.meta.url);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname.endsWith("game.ts")) {
    const result = await bundle(gameSourceURL.href, {
      importMap: {
      imports: {
        [libUrl.href]: libUrl.href
      }}
    });
    const code = result.code

    return new Response(code, {
      headers: {
        "content-type": "application/javascript",
        "cache-control": "no-cache",
      },
    });
  }

  if (url.pathname.endsWith("bot.ts")) {
    const result = await bundle(botSourceURL.href, {
      importMap: {
      imports: {
        [gameSourceURL.href]: gameSourceURL.href,
        [libUrl.href]: libUrl.href
      }}
    });
    const code = result.code

    return new Response(code, {
      headers: {
        "content-type": "application/javascript",
        "cache-control": "no-cache",
      },
    });
  }

  if (url.pathname.endsWith("qTable.txt")) {
    return new Response(await Deno.readFile("./qTable.txt"), {
      headers: {
        "content-type": "text/text",
        "cache-control": "no-cache",
      },
    });
  }

  // Serve HTML by default
  return new Response(await Deno.readFile("./index.html"), {
    headers: { "content-type": "text/html" },
  });
});
