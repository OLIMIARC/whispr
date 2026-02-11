import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/lib/app-context";
import { Comment, getComments, getTimeSince, getKarmaLevel } from "@/lib/storage";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import Avatar from "./Avatar";
import KarmaBadge from "./KarmaBadge";

interface CommentItemProps {
    comment: Comment;
    onDelete: (commentId: string) => void;
    currentUserId?: string;
}

const CommentItem = ({ comment, onDelete, currentUserId }: CommentItemProps) => {
    const isAuthor = currentUserId === comment.authorId;

    const handleDelete = () => {
        Alert.alert(
            "Delete Comment",
            "Are you sure you want to delete this comment?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete(comment.id)
                }
            ]
        );
    };

    return (
        <View style={styles.commentItem}>
            <View style={styles.commentHeader}>
                <View style={styles.authorInfo}>
                    <Avatar index={comment.authorAvatarIndex} size={24} />
                    <Text style={styles.authorName}>{comment.authorAlias}</Text>
                    <KarmaBadge karma={comment.authorKarma} size="small" />
                    <Text style={styles.timestamp}>{getTimeSince(comment.createdAt)}</Text>
                </View>
                {isAuthor && (
                    <Pressable onPress={handleDelete} hitSlop={10}>
                        <Ionicons name="trash-outline" size={16} color={Colors.dark.textSecondary} />
                    </Pressable>
                )}
            </View>
            <Text style={styles.commentContent}>{comment.content}</Text>
        </View>
    );
};

interface CommentSectionProps {
    parentId: string;
    parentType: "confession" | "market";
    isVisible: boolean;
    onClose?: () => void;
}

export default function CommentSection({ parentId, parentType, isVisible, onClose }: CommentSectionProps) {
    const { profile, addComment, deleteComment } = useApp();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = useCallback(async () => {
        if (!isVisible) return;
        setLoading(true);
        const data = await getComments(parentId);
        setComments(data);
        setLoading(false);
    }, [parentId, isVisible]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSubmit = async () => {
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const result = await addComment({
            parentId,
            parentType,
            content: newComment,
            authorId: "", // Will be filled by context
            authorAlias: "",
            authorAvatarIndex: 0,
            authorKarma: 0,
        });

        if (result) {
            setNewComment("");
            // Optimistically update or re-fetch
            setComments(prev => [...prev, result]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Alert.alert("Error", "Failed to post comment");
        }
        setSubmitting(false);
    };

    const handleDelete = async (commentId: string) => {
        await deleteComment(commentId, parentId, parentType);
        setComments(prev => prev.filter(c => c.id !== commentId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    if (!isVisible) return null;

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="small" color={Colors.dark.primary} style={{ marginVertical: 20 }} />
            ) : (
                <>
                    {comments.length === 0 ? (
                        <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
                    ) : (
                        <View style={styles.list}>
                            {comments.map(comment => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onDelete={handleDelete}
                                    currentUserId={profile?.id}
                                />
                            ))}
                        </View>
                    )}
                </>
            )}

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    placeholderTextColor={Colors.dark.textSecondary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={300}
                />
                <Pressable
                    style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={!newComment.trim() || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Ionicons name="send" size={20} color="#FFFFFF" />
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.dark.border,
        paddingTop: 12,
    },
    list: {
        gap: 16,
        marginBottom: 16,
    },
    emptyText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.dark.textSecondary,
        textAlign: "center",
        marginVertical: 20,
        fontStyle: "italic",
    },
    commentItem: {
        gap: 4,
    },
    commentHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    authorInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    authorName: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: Colors.dark.text,
    },
    timestamp: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.dark.textMuted,
    },
    commentContent: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.dark.textSecondary,
        lineHeight: 20,
        paddingLeft: 32, // Indent to align with text, not avatar
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 12,
        marginTop: 8,
    },
    input: {
        flex: 1,
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: Colors.dark.text,
        backgroundColor: Colors.dark.surface,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 40,
        maxHeight: 100,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.dark.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});
