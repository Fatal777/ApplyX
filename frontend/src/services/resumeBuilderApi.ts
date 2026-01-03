/**
 * Resume Builder API Service
 * Handles communication with backend API for resume documents
 * Includes optimistic locking with version conflict detection
 */

import axios, { AxiosError } from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URL = `${API_BASE}/api/v1/resume-builder`;

// Types matching backend schemas
export interface ResumeBuilderDocument {
    id: number;
    user_id: number;
    title: string;
    template_id: string | null;
    content: Record<string, unknown>;
    version: number;
    created_at: string;
    updated_at: string;
}

export interface ResumeBuilderListItem {
    id: number;
    title: string;
    template_id: string | null;
    version: number;
    created_at: string;
    updated_at: string;
}

export interface CreateDocumentRequest {
    title?: string;
    template_id?: string;
    content?: Record<string, unknown>;
}

export interface UpdateDocumentRequest {
    title?: string;
    template_id?: string;
    content?: Record<string, unknown>;
    version: number; // Required for optimistic locking
}

export interface PatchDocumentRequest {
    path: string;
    value: unknown;
    version: number;
}

export interface ConflictError {
    error: string;
    message: string;
    current_version: number;
    your_version: number;
}

// Helper to get auth token
const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// API Methods
export const resumeBuilderApi = {
    /**
     * List all documents for current user
     */
    async list(skip = 0, limit = 20): Promise<{ total: number; documents: ResumeBuilderListItem[] }> {
        const response = await axios.get(API_URL, {
            headers: getAuthHeader(),
            params: { skip, limit },
        });
        return response.data;
    },

    /**
     * Get a specific document with full content
     */
    async get(documentId: number): Promise<ResumeBuilderDocument> {
        const response = await axios.get(`${API_URL}/${documentId}`, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    /**
     * Create a new document
     */
    async create(data: CreateDocumentRequest): Promise<ResumeBuilderDocument> {
        const response = await axios.post(API_URL, data, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    /**
     * Update a document (full update)
     * @throws ConflictError if version mismatch (409)
     */
    async update(documentId: number, data: UpdateDocumentRequest): Promise<ResumeBuilderDocument> {
        try {
            const response = await axios.put(`${API_URL}/${documentId}`, data, {
                headers: getAuthHeader(),
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                const conflictData = error.response.data.detail as ConflictError;
                throw new VersionConflictError(conflictData);
            }
            throw error;
        }
    },

    /**
     * Partial update of document content
     * @throws ConflictError if version mismatch (409)
     */
    async patch(documentId: number, data: PatchDocumentRequest): Promise<ResumeBuilderDocument> {
        try {
            const response = await axios.patch(`${API_URL}/${documentId}`, data, {
                headers: getAuthHeader(),
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                const conflictData = error.response.data.detail as ConflictError;
                throw new VersionConflictError(conflictData);
            }
            throw error;
        }
    },

    /**
     * Delete a document
     */
    async delete(documentId: number): Promise<void> {
        await axios.delete(`${API_URL}/${documentId}`, {
            headers: getAuthHeader(),
        });
    },

    /**
     * Duplicate a document
     */
    async duplicate(documentId: number): Promise<ResumeBuilderDocument> {
        const response = await axios.post(`${API_URL}/${documentId}/duplicate`, null, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    /**
     * Convert an uploaded resume to builder format using LLM parsing
     * @param resumeId - The ID of the uploaded resume (from /resumes endpoint)
     * @returns Response with builder_document_id
     */
    async convertFromResume(resumeId: number): Promise<{ success: boolean; builder_document_id: number; message: string; content: Record<string, unknown> }> {
        const response = await axios.post(
            `${API_BASE}/api/v1/resumes/${resumeId}/convert-to-builder`,
            null,
            { headers: getAuthHeader() }
        );
        return response.data;
    },
};

/**
 * Custom error class for version conflicts
 */
export class VersionConflictError extends Error {
    public currentVersion: number;
    public yourVersion: number;

    constructor(data: ConflictError) {
        super(data.message);
        this.name = "VersionConflictError";
        this.currentVersion = data.current_version;
        this.yourVersion = data.your_version;
    }
}

export default resumeBuilderApi;
