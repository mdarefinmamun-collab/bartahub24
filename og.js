export default async function handler(req, res) {
  const articleIdOrSlug = req.query.article;

  // ডিফল্ট মেটা ট্যাগ
  let title = "বার্তাহাব ২৪ | সব খবর সবার আগে";
  let description = "সত্য ও নিষ্ঠার সাথে সংবাদ পরিবেশনে আমরা অঙ্গীকারবদ্ধ।";
  let image = "https://i.imgur.com/Ltig2C1.png";
  let url = `https://${req.headers.host}`;

  if (articleIdOrSlug) {
    url = `https://${req.headers.host}/?article=${articleIdOrSlug}`;

    try {
      // ১. প্রথমে সরাসরি ID দিয়ে ডাটাবেসে খোঁজার চেষ্টা করবে (REST API)
      const docUrl = `https://firestore.googleapis.com/v1/projects/bartahub-24/databases/(default)/documents/news/${articleIdOrSlug}`;
      let response = await fetch(docUrl);
      let data = await response.json();

      // যদি ID দিয়ে খবর পেয়ে যায়
      if (data && data.fields) {
        title = data.fields.title?.stringValue || title;
        let rawDesc = data.fields.description?.stringValue || "";
        description = rawDesc.replace(/(<([^>]+)>)/gi, "").substring(0, 160) + "...";
        image = data.fields.imageUrl?.stringValue || image;
      } 
      // ২. যদি ID দিয়ে না পায়, তবে Slug দিয়ে খুঁজবে
      else {
        const queryUrl = `https://firestore.googleapis.com/v1/projects/bartahub-24/databases/(default)/documents:runQuery`;
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: "news" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "slug" },
                op: "EQUAL",
                value: { stringValue: articleIdOrSlug }
              }
            },
            limit: 1
          }
        };

        let queryRes = await fetch(queryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryBody)
        });
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

  // মেটা ট্যাগসহ HTML রেসপন্স
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
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${image}">

        <script>
            // সাধারণ ইউজারদের মেইন সাইটে নিয়ে যাবে
            window.location.replace("/index.html?article=${articleIdOrSlug}");
        </script>
    </head>
    <body>
        <p style="text-align:center; margin-top:50px;">খবরটি লোড হচ্ছে, দয়া করে অপেক্ষা করুন...</p>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
