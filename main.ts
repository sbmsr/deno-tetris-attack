import { bundle } from "jsr:@deno/emit";

const gameSourceURL = new URL("./src/game.ts", import.meta.url);
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

  // Serve HTML by default
  return new Response(await Deno.readFile("./index.html"), {
    headers: { "content-type": "text/html" },
  });
});
