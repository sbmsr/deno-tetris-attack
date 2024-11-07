import { transpile } from "jsr:@deno/emit";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname.endsWith(".js")) {
    const sourceURL = new URL("./src/game.ts", import.meta.url);
    const result = await transpile(sourceURL);
    const code = result.get(sourceURL.href);

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
