function scalarDocs(openApiDocument) {
  return (req, res) => {
    const config = JSON.stringify({
      theme: 'default',
      spec: {
        content: openApiDocument
      }
    }).replace(/</g, '\\u003c');

    return res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Xinra API Docs</title>
  </head>
  <body>
    <script id="api-reference" type="application/json">${config}</script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
  };
}

module.exports = {
  scalarDocs
};
