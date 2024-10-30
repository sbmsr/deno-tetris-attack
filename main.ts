Deno.serve(async () =>
  new Response(await Deno.readFile("./index.html"), {
    headers: { "content-type": "text/html" },
  })
);
