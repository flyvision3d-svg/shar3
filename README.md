# **Shar3 — Decentralized Image Preview Wrapper**

Shar3 is a lightweight server-rendered wrapper that enables **full image previews on X, Telegram, Discord, and other social platforms** for images stored on decentralized storage (Jackal Protocol or any other public-accessible URL).

Shar3 does **not** host files.
It simply generates a **shareable link** with dynamic Open Graph tags so social platforms can display thumbnails correctly.

---

## 🚀 **Why Shar3 Exists**

Most decentralized storage links (including Jackal Vault share URLs) **do not generate previews** on major platforms.
Shar3 fixes that by providing:

* A short, clean shareable URL
* A server-rendered HTML page
* Dynamic `<meta>` tags (OG + Twitter) pointing to the real image
* Zero need to upload twice or rehost files

This enables **Crypto Twitter**, Telegram groups, and communities to instantly share images stored on-chain or on decentralized storage.

---

## 🧱 **How It Works**

Shar3 is a **Next.js App Router** project using:

* **SSR (Server-Side Rendering)**
* **Route handlers** or `generateMetadata()` for dynamic `<meta>` tags
* **Tailwind CSS** for UI styling
* **Zero databases, zero uploads (v0)**

### Flow (v0 — MVP):

1. User uploads an image to Jackal Vault (or any public URL).
2. They copy the image’s raw/public URL.
3. They paste it into Shar3's homepage.
4. Shar3 generates a link:

```
https://shar3.xyz/view?u=<encoded_image_url>
```

5. When pasted into X/Telegram/Discord, the link renders the image preview.

Shar3 fetches **only the metadata**, not the file.
The image is still served directly from Jackal.

---

## 📌 **MVP Features (v0)**

* Dynamic OG tags:

  * `og:image`
  * `twitter:image`
  * `og:title`
  * `og:description`
* URL field on homepage
* “Generate Shar3 Link” button
* Zero database, no file uploads
* Fully decentralized-source image hosting

---

## 🛠️ **Tech Stack**

* **Next.js 14+ (App Router)**
* **React / TypeScript**
* **Tailwind CSS**
* **Server Components**
* **Edge-friendly SSR**
* **Potential future hosting: Vercel or Netlify**

This stack was recommended by community devs as the best solution for dynamic OG rendering.

---

## 🗺️ **Roadmap**

### **✔ v0 (MVP)**

* `/view` route with dynamic metadata
* OG preview working on X
* Domain wired (`shar3.xyz`)
* Public deployment

### **⏳ v1**

* File uploads directly to Jackal (optional)
* Wrapper auto-generates links after upload
* Free-tier upload model (sponsored gas or walletless flow)

### **⏳ v2**

* Login & history
* Image galleries
* Shortlink service
* Analytics
* Social integrations

---

## 🤝 **Contributing**

Shar3 is an early community-driven utility project.
We welcome:

* PRs
* Feedback
* Suggestions
* Issue reports

Collaborators may push to branches and open PRs.
Main branch is protected for stability.

---

## 📣 **Community**

Shar3 began as an experiment inside the Jackal ecosystem to improve **decentralized image sharing UX** for Crypto Twitter and beyond.

If this becomes widely adopted, it provides large visibility for decentralized storage in general.

---

## 📜 License

MIT License — free to use, modify, and build upon.

---

# 🙌 **Thank You**

This project exists because of the enthusiasm of builders in the Web3 / decentralized storage community.
Let’s make decentralized sharing *finally easy*.

