export default async function handler(req, res) {
  // আগের কোডে এই লাইনটা আইডি পাচ্ছিল না। এখন জোর করে লিংক থেকে আইডি বের করা হচ্ছে।
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const articleIdOrSlug = urlObj.searchParams.get("article") || req.query.article;

  // ডিফল্ট ডাটা
  let title = "বার্তাহাব ২৪ | সব খবর সবার আগে";
  let description = "সত্য ও নিষ্ঠার সাথে সংবাদ পরিবেশনে আমরা অঙ্গীকারবদ্ধ।";
  let image = "https://i.imgur.com/Ltig2C1.png";
  let url = `https://${req.headers.host}`;

  if (articleIdOrSlug) {
    url = `https://${req.headers.host}/?article=${articleIdOrSlug}`;

    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/bartahub-24/databases/(default)/documents/news/${articleIdOrSlug}`;
      let response = await fetch(docUrl);
      let data = await response.json();

      if (data && data.fields) {
        title = data.fields.title?.stringValue || title;
        let rawDesc = data.fields.description?.stringValue || "";
        description = rawDesc.replace(/(<([^>]+)>)/gi, "").substring(0, 160) + "...";
        image = data.fields.imageUrl?.stringValue || image;
      } 
      else {
        // স্লাগ দিয়ে খোঁজা
        const queryUrl = `https://firestore.googleapis.com/v1/projects/bartahub-24/databases/(default)/documents:runQuery`;
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: "news" }],
            where: { fieldFilter: { field: { fieldPath: "slug" }, op: "EQUAL", value: { stringValue: articleIdOrSlug } } },
            limit: 1
          }
        };

        let queryRes = await fetch(queryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(queryBody) });
        let queryData = await queryRes.json();

        if (queryData && queryData[0] && queryData[0].document && queryData[0].document.fields) {
          let fields = queryData[0].document.fields;
          title = fields.title?.stringValue || title;
          let rawDesc = fields.description?.stringValue || "";
          description = rawDesc.replace(/(<([^>]+)>)/gi, "").substring(0, 160) + "...";
          image = fields.imageUrl?.stringValue || image;
        }
      }
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  }

  // মেটা ট্যাগ তৈরি
  const html = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta property="og:type" content="article">
        <meta property="og:url" content="${url}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${image}">
        <meta name="twitter:card" content="summary_large_image">
        
        <!-- ফেসবুক বট এখানে মেটা ট্যাগ পড়বে, আর আসল ইউজার মেইন সাইটে চলে যাবে -->
        <script>window.location.replace("/index.html?article=${articleIdOrSlug}");</script>
    </head>
    <body>
        <p style="text-align:center; margin-top:50px;">লোড হচ্ছে...</p>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
