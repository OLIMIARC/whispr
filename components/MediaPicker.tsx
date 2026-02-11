import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    Alert,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

export type MediaType = "image" | "video";

export interface SelectedMedia {
    uri: string;
    type: MediaType;
    duration?: number; // for videos
    width?: number;
    height?: number;
}

interface MediaPickerProps {
    onMediaSelected: (media: SelectedMedia | null) => void;
    selectedMedia: SelectedMedia | null;
    allowVideo?: boolean;
    maxVideoDuration?: number;
    variant?: "box" | "overlay" | "icon"; // New variant prop
}

export default function MediaPicker({
    onMediaSelected,
    selectedMedia,
    allowVideo = true,
    maxVideoDuration = 30,
    variant = "box",
}: MediaPickerProps) {
    const requestPermissions = async () => {
        if (Platform.OS !== "web") {
            const { status: cameraStatus } =
                await ImagePicker.requestCameraPermissionsAsync();
            const { status: mediaStatus } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (cameraStatus !== "granted" || mediaStatus !== "granted") {
                Alert.alert(
                    "Permissions Required",
                    "Please enable camera and photo library access in your device settings."
                );
                return false;
            }
        }
        return true;
    };

    const showMediaOptions = () => {
        Alert.alert(
            "Add Media",
            "Choose an option",
            [
                { text: "Camera", onPress: takePhoto },
                { text: "Gallery", onPress: pickImage },
                { text: "Cancel", style: "cancel" },
            ]
        );
    };

    const pickImage = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: allowVideo ? ["images", "videos"] : ["images"],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                videoMaxDuration: maxVideoDuration,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const type: MediaType = asset.type === "video" ? "video" : "image";

                if (type === "video" && asset.duration && asset.duration > maxVideoDuration * 1000) {
                    Alert.alert("Video Too Long", `Please select a video shorter than ${maxVideoDuration} seconds.`);
                    return;
                }

                onMediaSelected({
                    uri: asset.uri,
                    type,
                    duration: asset.duration ? Math.floor(asset.duration / 1000) : undefined,
                    width: asset.width,
                    height: asset.height,
                });
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to pick media. Please try again.");
        }
    };

    const takePhoto = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: allowVideo ? ["images", "videos"] : ["images"],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                videoMaxDuration: maxVideoDuration,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const type: MediaType = asset.type === "video" ? "video" : "image";
                onMediaSelected({
                    uri: asset.uri,
                    type,
                    duration: asset.duration ? Math.floor(asset.duration / 1000) : undefined,
                    width: asset.width,
                    height: asset.height,
                });
            }
        } catch (error) {
            console.error("Error taking photo:", error);
            Alert.alert("Error", "Failed to take photo. Please try again.");
        }
    };

    if (variant === "overlay") {
        if (selectedMedia) return null;
        return (
            <Pressable style={({ pressed }) => [styles.overlayButton, { opacity: pressed ? 0.7 : 1 }]} onPress={showMediaOptions}>
                <Ionicons name="image-outline" size={22} color="#71717A" />
            </Pressable>
        );
    }

    if (variant === "icon") {
        return (
            <Pressable style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]} onPress={showMediaOptions}>
                <Ionicons name="image-outline" size={26} color="#3498db" />
            </Pressable>
        );
    }

    return (
        <Pressable onPress={showMediaOptions}>
            <View style={styles.boxButton}>
                <Ionicons name="camera-outline" size={24} color="#A1A1AA" />
                <Text style={styles.boxButtonText}>Add Photo</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    overlayButton: {
        position: "absolute",
        bottom: 8,
        right: 8,
        padding: 8,
        borderRadius: 8,
        backgroundColor: "rgba(0, 0, 0, 0.05)",
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(52, 152, 219, 0.1)",
        alignSelf: 'flex-start',
    },
    boxButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#3F3F46",
        borderStyle: "dashed",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
    },
    boxButtonText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: "#A1A1AA",
    },
});
