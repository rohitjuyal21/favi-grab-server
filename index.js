import express from "express";
import axios from "axios";
import https from "https";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const app = express();
app.use(cors());

const GOOGLE_FAVICON_URL = "https://www.google.com/s2/favicons";
const DUCK_DUCK_GO_FAVICON_URL = "https://icons.duckduckgo.com/ip3/";
const ICON_HORSE_URL = "https://icon.horse/icon/";
const FAVICON_KIT_URL = "https://api.faviconkit.com/";

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchIcon(url, source) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
      httpsAgent: agent,
    });

    const contentType = response.headers["content-type"];
    if (!contentType.startsWith("image/")) {
      console.error(
        `Received non-image content type from ${source}: ${contentType}`
      );
      return null;
    }

    return {
      source: source,
      icon: `data:${contentType};base64,${Buffer.from(response.data).toString(
        "base64"
      )}`,
    };
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error.message);
    return null;
  }
}

app.get("/favicons", async (req, res) => {
  const { url, size } = req.query;
  if (!url || !size) {
    return res
      .status(400)
      .json({ error: "URL and size parameters are required" });
  }

  const domain = new URL(url).hostname;
  try {
    const sources = [
      { url: `https://${domain}/favicon.ico`, name: "Direct Favicon" },
      { url: `${DUCK_DUCK_GO_FAVICON_URL}${domain}.ico`, name: "DuckDuckGo" },
      {
        url: `${GOOGLE_FAVICON_URL}?domain=${encodeURIComponent(
          url
        )}&sz=${size}`,
        name: "Google",
      },
      { url: `${ICON_HORSE_URL}${domain}`, name: "Icon Horse" },
      { url: `${FAVICON_KIT_URL}${domain}/${size}`, name: "FaviconKit" },
    ];

    const iconPromises = sources.map((source) =>
      fetchIcon(source.url, source.name)
    );
    const icons = await Promise.all(iconPromises);

    const validIcons = icons.filter((icon) => icon !== null);

    if (validIcons.length > 0) {
      res.json(validIcons);
    } else {
      res.status(404).json({ error: "No favicons found" });
    }
  } catch (error) {
    console.error("Error fetching or processing favicons:", error);
    res.status(500).json({ error: "Failed to fetch or process favicons" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
