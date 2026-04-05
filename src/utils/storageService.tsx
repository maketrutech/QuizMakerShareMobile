import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Save a value in storage
 * @param key The storage key
 * @param value Any JSON-serializable data
 */
export const saveItem = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    console.log(`✅ Saved [${key}]`, value);
  } catch (error) {
    console.error(`❌ Error saving [${key}]`, error);
  }
};

/**
 * Get a value from storage
 * @param key The storage key
 * @returns The parsed value or null
 */
export const getItem = async <T = unknown>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? (JSON.parse(jsonValue) as T) : null;
  } catch (error) {
    console.error(`❌ Error getting [${key}]`, error);
    return null;
  }
};

/**
 * Remove a value from storage
 * @param key The storage key
 */
export const removeItem = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`🗑️ Removed [${key}]`);
  } catch (error) {
    console.error(`❌ Error removing [${key}]`, error);
  }
};

/**
 * Clear all storage
 */
export const clearStorage = async () => {
  try {
    await AsyncStorage.clear();
    console.log("🧹 Storage cleared");
  } catch (error) {
    console.error("❌ Error clearing storage", error);
  }
};
