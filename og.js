import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// আপনার ফায়ারবেস কনফিগারেশন এখানে দিন
const firebaseConfig = {
  apiKey: "AIzaSyB83SaZZk_6oVIDniQ7f97hPrfFas99Njo",
  authDomain: "bartahub-24.firebaseapp.com",
  projectId: "bartahub-24"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  const { article } = req.query; // URL থেকে ?article=... নিবে

  // ডিফল্ট মেটা ট্যাগ (যদি কেউ মূল পেজ শেয়ার করে)
  let title = "বার্তাহাব ২৪ | সব খবর সবার আগে";
  let description = "সত্য ও নিষ্ঠার সাথে সংবাদ পরিবেশনে আমরা অঙ্গীকারবদ্ধ।";
  let image = "https://i.imgur.com/Ltig2C1.png"; // ওয়েবসাইটের ডিফল্ট লোগো/ছবি
  let url = "https://আপনার-ডোমেইন.com";

  // যদি লিংকে কোনো খবরের আইডি বা স্লাগ থাকে
  if (article) {
    try {
      let newsData = null;

      // প্রথমে Slug চেক করবে
      const q = query(collection(db, "news"), where("slug", "==", article));
      const slugSnap = await getDocs(q);

      if (!slugSnap.empty) {
        newsData = slugSnap.docs[0].data();
      } else {
        // স্লাগ না পেলে ID দিয়ে চেক করবে
        const docRef = doc(db, "news", article);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) newsData = docSnap.data();
      }

      if (newsData) {
        title = newsData.title;
        // HTML ট্যাগ রিমুভ করে ডেসক্রিপশন ছোট করা
        description = newsData.description ? newsData.description.replace(/(<([^>]+)>)/gi, "").substring(0, 160) + "..." : description;
        image = newsData.imageUrl || image;
        url = `https://${req.headers.host}/?article=${article}`;
      }
    } catch (e) {
      console.error("Firebase Error:", e);
    }
  }

  // বট বা ইউজারকে ডায়নামিক মেটা ট্যাগসহ HTML পাঠানো
  const html = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="article">
        <meta property="og:url" content="${url}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${image}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${url}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">
        <meta property="twitter:image" content="${image}">

        <!-- রিডাইরেক্ট স্ক্রিপ্ট (ফেসবুক বট এখানে থেমে যাবে, সাধারণ ইউজাররা মেইন সাইটে চলে যাবে) -->
        <script>
            // যদি এটি আপনার মূল index.html না হয়, তবে আসল পেজে পাঠিয়ে দিন
            window.location.replace("/index.html" + window.location.search);
        </script>
    </head>
    <body>
        <p>লোড হচ্ছে...</p>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}