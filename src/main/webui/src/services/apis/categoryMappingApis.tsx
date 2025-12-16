// Define the interfaces first
export interface MinanceCategory {
    MCategoryId: string;
    category: string;
}

export interface RawCategory {
    name: string;
}

export interface CategoryMapping {
    listRawCategories: string[];
    minanceCategory: string;
}

// API functions
export const createMinanceCategory = async (category: string): Promise<string> => {
    const response = await fetch(`/1.0/minance/mapping_category/create/${category}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        }
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to create category");
    }

    return response.text();
};

export const deleteMinanceCategory = async (category: MinanceCategory): Promise<string> => {
    const response = await fetch("/1.0/minance/mapping_category/delete", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(category),
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to delete category");
    }

    return response.text();
};

export const getAllMinanceCategories = async (): Promise<MinanceCategory[]> => {
    const response = await fetch(
        "/1.0/minance/mapping_category/minanceCategory/retrieveAll"
    );

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve minance categories");
    }

    return response.json();
};

export const linkCategories = async (categoryMapping: CategoryMapping): Promise<string> => {
    console.log(categoryMapping);
    const response = await fetch("/1.0/minance/mapping_category/linkCategory", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryMapping),
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to link categories");
    }

    return response.text();
};

export const getUnlinkedCategories = async (): Promise<RawCategory[]> => {
    const response = await fetch(
        "/1.0/minance/mapping_category/unlinkedCategories/retrieveAll"
    );

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve unlinked categories");
    }

    return response.json();
};

export const getLinkedCategoriesForMinanceCategory = async (minanceCategory: string): Promise<RawCategory[]> => {
    const response = await fetch(
        `/1.0/minance/mapping_category/retrieve/${encodeURIComponent(minanceCategory)}`
    );

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve linked categories");
    }

    return response.json();
}; 