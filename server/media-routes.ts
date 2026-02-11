import type { Express } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";

// Configure Cloudinary ONLY if valid keys are present
if (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name_here" &&
    process.env.CLOUDINARY_API_KEY) {

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    },
});

const isCloudinaryConfigured = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log("Checking Cloudinary Config:");
    console.log("Cloud Name:", cloudName);
    console.log("API Key Present:", !!apiKey);
    console.log("API Secret Present:", !!apiSecret);

    const isConfigured = (
        cloudName &&
        cloudName !== "your_cloud_name_here" &&
        apiKey &&
        apiKey !== "your_api_key_here" &&
        apiSecret &&
        apiSecret !== "your_api_secret_here"
    );

    console.log("Is Configured:", isConfigured);
    return isConfigured;
};

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper function to upload buffer
async function uploadMedia(
    buffer: Buffer,
    resourceType: "image" | "video",
    folder: string
): Promise<{ url: string; thumbnail?: string }> {
    if (isCloudinaryConfigured()) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    folder: `whispr/${folder}`,
                    transformation:
                        resourceType === "image"
                            ? [
                                { width: 1920, height: 1080, crop: "limit" },
                                { quality: "auto:good" },
                            ]
                            : undefined,
                    eager:
                        resourceType === "video"
                            ? [{ width: 720, crop: "scale", format: "mp4" }]
                            : undefined,
                    eager_async: true,
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error("Upload failed"));

                    const response: { url: string; thumbnail?: string } = {
                        url: result.secure_url,
                    };

                    // For videos, generate thumbnail from first frame
                    if (resourceType === "video") {
                        response.thumbnail = result.secure_url.replace(/\.(mp4|mov)$/, ".jpg");
                    }

                    resolve(response);
                }
            );

            const readable = Readable.from(buffer);
            readable.pipe(uploadStream);
        });
    } else {
        // Local fallback
        const ext = resourceType === "video" ? ".mp4" : ".jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        await fs.promises.writeFile(filepath, buffer);

        // Return local URL (assumes server is running on port 5000)
        // Note: The client's getApiUrl() handles the host part, so we just return the path?
        // Actually, the client expects a full URL if it's from Cloudinary, so we should allow it to handle relative paths?
        // Existing client code:
        // const response = await fetch(`${apiUrl}${endpoint}`, ...)
        // const result = await response.json();
        // mediaUrl = result.url;
        // Image source={{ uri: mediaUrl }}
        // If mediaUrl is "/uploads/foo.jpg", Image component needs absolute URL if not on web?
        // React Native Image handles http://... 
        // If we return "/uploads/foo.jpg", client might need to prepend host.
        // BUT, Cloudinary returns full URL. 
        // Let's return a relative path and hope the client can handle it OR we try to construct absolute URL.
        // It's safer to return a relative path like "/uploads/foo.jpg" and let the client assume it's relative to API_URL?
        // Wait, Image source={{ uri: "..." }} generally needs absolute URL for network images.
        // The API backend doesn't know its own public IP easily (host header might be localhost).
        // Let's rely on the client `getApiUrl` logic. 
        // If we return `/uploads/${filename}`, the client will use it as `uri`.
        // `Image` on RN requires http://...
        // So we need to return `http://${req.get('host')}/uploads/${filename}`.

        return {
            url: `/uploads/${filename}`, // We'll prepend host in the route handler
            thumbnail: resourceType === "video" ? `/uploads/${filename}` : undefined // No thumbnails for local video yet
        };
    }
}

export function registerMediaRoutes(app: Express) {
    // Upload image
    app.post("/api/upload/image", upload.single("image"), async (req, res) => {
        console.log("Received image upload request");
        try {
            if (!req.file) {
                console.log("No file in request");
                return res.status(400).send("No image file provided");
            }
            console.log("File received:", req.file.originalname, req.file.size);

            const result = await uploadMedia(
                req.file.buffer,
                "image",
                "confessions"
            );

            // If local, prepend protocol/host to make it an absolute URL for RN Image
            if (result.url.startsWith("/")) {
                const protocol = req.protocol;
                const host = req.get("host");
                result.url = `${protocol}://${host}${result.url}`;
                if (result.thumbnail && result.thumbnail.startsWith("/")) {
                    result.thumbnail = `${protocol}://${host}${result.thumbnail}`;
                }
            }

            res.json({ url: result.url });
        } catch (error: any) {
            console.error("Image upload error:", error);
            res.status(500).send(error.message || "Failed to upload image");
        }
    });

    // Upload video
    app.post("/api/upload/video", upload.single("video"), async (req, res) => {
        console.log("Received video upload request");
        try {
            if (!req.file) {
                console.log("No file in request (video)");
                return res.status(400).send("No video file provided");
            }
            console.log("Video file received:", req.file.originalname, req.file.size);

            const result = await uploadMedia(
                req.file.buffer,
                "video",
                "confessions"
            );

            // If local, prepend protocol/host
            if (result.url.startsWith("/")) {
                const protocol = req.protocol;
                const host = req.get("host");
                result.url = `${protocol}://${host}${result.url}`;
                if (result.thumbnail && result.thumbnail.startsWith("/")) {
                    result.thumbnail = `${protocol}://${host}${result.thumbnail}`;
                }
            }

            res.json(result);
        } catch (error: any) {
            console.error("Video upload error:", error);
            res.status(500).send(error.message || "Failed to upload video");
        }
    });
}
