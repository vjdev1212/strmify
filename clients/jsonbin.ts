import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://api.jsonbin.io/v3";

const getApiKey = async (): Promise<string> => {
  const apiKey = await AsyncStorage.getItem("JSONBIN_API_KEY");
  if (!apiKey) throw new Error("JSONBin API key not found in AsyncStorage");
  return apiKey;
};

interface BinResponse {
  metadata: {
    id: string;
  };
  record: any;
}

export const createBin = async (data: any, privateBin: boolean = true): Promise<BinResponse> => {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(`${BASE_URL}/b`, {
      method: "POST",
      headers: {
        "X-Master-Key": apiKey,
        "X-Bin-Private": privateBin ? "true" : "false",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result: BinResponse = await response.json();
    if (!response.ok) throw new Error(result.metadata.id || "Failed to create bin");
    return result;
  } catch (error) {
    console.error("Error creating bin:", error);
    throw error;
  }
};

export const updateBin = async (binId: string, data: any): Promise<BinResponse> => {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(`${BASE_URL}/b/${binId}`, {
      method: "PUT",
      headers: {
        "X-Master-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result: BinResponse = await response.json();
    if (!response.ok) throw new Error(result.metadata.id || "Failed to update bin");
    return result;
  } catch (error) {
    console.error("Error updating bin:", error);
    throw error;
  }
};

export const deleteBin = async (binId: string): Promise<{ message: string }> => {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(`${BASE_URL}/b/${binId}`, {
      method: "DELETE",
      headers: {
        "X-Master-Key": apiKey,
      },
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to delete bin");
    return result;
  } catch (error) {
    console.error("Error deleting bin:", error);
    throw error;
  }
};

export const createCollection = async (collectionName: string): Promise<BinResponse> => {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(`${BASE_URL}/c`, {
      method: "POST",
      headers: {
        "X-Master-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: collectionName }),
    });

    const result: BinResponse = await response.json();
    if (!response.ok) throw new Error(result.metadata.id || "Failed to create collection");
    return result;
  } catch (error) {
    console.error("Error creating collection:", error);
    throw error;
  }
};

export const deleteCollection = async (collectionId: string): Promise<{ message: string }> => {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(`${BASE_URL}/c/${collectionId}`, {
      method: "DELETE",
      headers: {
        "X-Master-Key": apiKey,
      },
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to delete collection");
    return result;
  } catch (error) {
    console.error("Error deleting collection:", error);
    throw error;
  }
};
