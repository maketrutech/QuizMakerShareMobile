import { Platform, Vibration } from "react-native";
import Sound from "react-native-sound";

try {
    Sound.setCategory("Playback", true);
} catch (error) {
    console.warn("Sound category setup failed", error);
}

type SoundKey = "correct" | "wrong" | "finish";

const soundFiles: Record<SoundKey, string | number> = Platform.OS === "android"
    ? {
        correct: "correct.wav",
        wrong: "wrong.wav",
        finish: "finish.wav",
    }
    : {
        correct: require("../assets/sounds/correct.wav"),
        wrong: require("../assets/sounds/wrong.wav"),
        finish: require("../assets/sounds/finish.wav"),
    };

let cachedSounds: Partial<Record<SoundKey, Sound>> = {};

const vibrateFeedback = (key: SoundKey) => {
    try {
        if (key === "wrong") {
            Vibration.vibrate(120);
            return;
        }

        if (key === "finish") {
            Vibration.vibrate([0, 70, 40, 70]);
            return;
        }

        Vibration.vibrate(50);
    } catch (error) {
        console.warn("Vibration feedback failed", error);
    }
};

const loadSound = (key: SoundKey): Promise<Sound | null> => {
    return new Promise((resolve) => {
        try {
            if (cachedSounds[key]) {
                resolve(cachedSounds[key] ?? null);
                return;
            }

            const onLoad = (error?: unknown) => {
                if (error) {
                    console.warn(`Unable to load ${key} sound`, error);
                    resolve(null);
                    return;
                }

                sound.setVolume(1);
                cachedSounds[key] = sound;
                resolve(sound);
            };

            const source = soundFiles[key];
            const sound = Platform.OS === "android"
                ? new Sound(String(source), Sound.MAIN_BUNDLE, onLoad)
                : new Sound(source as number, onLoad);
        } catch (error) {
            console.warn(`Unexpected error while loading ${key} sound`, error);
            resolve(null);
        }
    });
};

export const preloadSoundEffects = async () => {
    await Promise.all([
        loadSound("correct"),
        loadSound("wrong"),
        loadSound("finish"),
    ]);
};

export const playSoundEffect = async (key: SoundKey) => {
    vibrateFeedback(key);

    try {
        const sound = await loadSound(key);

        if (!sound) return;

        sound.setCurrentTime(0);
        sound.setVolume(1);
        sound.play((success) => {
            if (!success) {
                console.warn(`Playback failed for ${key} sound`);
            }
        });
    } catch (error) {
        console.warn(`Unexpected playback error for ${key} sound`, error);
    }
};

export const releaseSoundEffects = () => {
    try {
        Object.values(cachedSounds).forEach((sound) => {
            sound?.release();
        });

        cachedSounds = {};
    } catch (error) {
        console.warn("Sound release failed", error);
    }
};
