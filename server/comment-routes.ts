import type { Express } from "express";
import { whisprStore } from "./whispr-storage";

export function registerCommentRoutes(app: Express) {
    // Get comments for a confession
    app.get("/api/confessions/:id/comments", (req, res) => {
        try {
            const { id } = req.params;
            const comments = whisprStore.listComments({ confessionId: id });
            res.json(comments);
        } catch (error: any) {
            console.error("Get confession comments error:", error);
            res.status(500).send("Failed to fetch comments");
        }
    });

    // Add comment to a confession
    app.post("/api/confessions/:id/comments", (req, res) => {
        try {
            const { id } = req.params;
            const { content, authorId, authorAlias, authorAvatarIndex } = req.body;

            if (!content?.trim() || !authorId || !authorAlias || authorAvatarIndex == null) {
                return res.status(400).send("Missing required fields");
            }

            if (content.length > 280) {
                return res.status(400).send("Comment too long (max 280 characters)");
            }

            const newComment = whisprStore.createComment({
                confessionId: id,
                authorId,
                authorAlias,
                authorAvatarIndex,
                content,
            });

            if (!newComment) {
                return res.status(400).send("Failed to create comment");
            }

            res.json(newComment);
        } catch (error: any) {
            console.error("Add confession comment error:", error);
            res.status(500).send("Failed to add comment");
        }
    });

    // Get comments for a marketplace item
    app.get("/api/market/:id/comments", (req, res) => {
        try {
            const { id } = req.params;
            const comments = whisprStore.listComments({ marketItemId: id });
            res.json(comments);
        } catch (error: any) {
            console.error("Get market comments error:", error);
            res.status(500).send("Failed to fetch comments");
        }
    });

    // Add comment to a marketplace item
    app.post("/api/market/:id/comments", (req, res) => {
        try {
            const { id } = req.params;
            const { content, authorId, authorAlias, authorAvatarIndex } = req.body;

            if (!content?.trim() || !authorId || !authorAlias || authorAvatarIndex == null) {
                return res.status(400).send("Missing required fields");
            }

            if (content.length > 280) {
                return res.status(400).send("Comment too long (max 280 characters)");
            }

            const newComment = whisprStore.createComment({
                marketItemId: id,
                authorId,
                authorAlias,
                authorAvatarIndex,
                content,
            });

            if (!newComment) {
                return res.status(400).send("Failed to create comment");
            }

            res.json(newComment);
        } catch (error: any) {
            console.error("Add market comment error:", error);
            res.status(500).send("Failed to add comment");
        }
    });

    // Delete a comment (only if you're the author)
    app.delete("/api/comments/:id", (req, res) => {
        try {
            const { id } = req.params;
            const { authorId } = req.body;

            if (!authorId) {
                return res.status(400).send("Author ID required");
            }

            const deleted = whisprStore.deleteComment(id, authorId);

            if (!deleted) {
                return res.status(404).send("Comment not found or unauthorized");
            }

            res.json({ success: true });
        } catch (error: any) {
            console.error("Delete comment error:", error);
            res.status(500).send("Failed to delete comment");
        }
    });
}
