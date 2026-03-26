import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface Bookmark {
    title: string;
    createdAt: Time;
    pageNumber: bigint;
    fileId: string;
}
export interface PdfFileMetaData {
    blobKey: ExternalBlob;
    size: bigint;
    isFavorite: boolean;
    filename: string;
    pageCount: bigint;
    uploadedAt: Time;
}
export interface ReadingProgress {
    createdAt: Time;
    fileId: string;
    lastPageRead: bigint;
}
export interface FileOperation {
    operationType: string;
    newBlobKey?: ExternalBlob;
    fileId: string;
    timestamp: Time;
    newName?: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface PremiumUserProfile {
    username: string;
    isPremium: boolean;
    premiumExpiresAt?: Time;
    stripeCustomerId: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface PdfAnnotation {
    content: string;
    color: string;
    pageNumber: bigint;
    yPosition: bigint;
    xPosition: bigint;
    annotationType: string;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface FeatureUsageLog {
    timestamp: Time;
    featureName: string;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAnnotation(fileId: string, annotation: PdfAnnotation): Promise<void>;
    addBookmark(fileId: string, pageNumber: bigint, title: string): Promise<void>;
    addFileMetaData(fileId: string, metadata: PdfFileMetaData): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignPremiumStatus(userId: Principal, expiresAt: Time): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deleteAnnotationsForFile(userId: Principal, fileId: string): Promise<void>;
    deleteFile(fileId: string): Promise<void>;
    deleteFileMetaData(userId: Principal, fileId: string): Promise<void>;
    getAllFileMetaData(): Promise<Array<PdfFileMetaData>>;
    getAnnotationsByFileId(userId: Principal, fileId: string): Promise<Array<PdfAnnotation>>;
    getBookmarks(userId: Principal): Promise<Array<Bookmark>>;
    getCallerFileMetaData(): Promise<Array<PdfFileMetaData>>;
    getCallerUserProfile(): Promise<PremiumUserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFeatureUsageLogs(userId: Principal): Promise<Array<FeatureUsageLog>>;
    getFileMetaData(userId: Principal, fileId: string): Promise<PdfFileMetaData | null>;
    getFileOperationsInRange(userId: Principal, startTime: Time, endTime: Time): Promise<Array<FileOperation>>;
    getPremiumSubscribers(): Promise<Array<PremiumUserProfile>>;
    getReadingProgress(userId: Principal): Promise<Array<ReadingProgress>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(userId: Principal): Promise<PremiumUserProfile | null>;
    getUserProfiles(): Promise<Array<PremiumUserProfile>>;
    /**
     * / PDF file metadata on the platform.
     */
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    logFeatureUsage(featureName: string): Promise<void>;
    recordFileOperation(fileId: string, operationType: string, newName: string | null, newBlobKey: ExternalBlob | null): Promise<void>;
    recordMergeOperation(newFileId: string, mergedFiles: Array<string>, newBlobKey: ExternalBlob): Promise<void>;
    recordSplitOperation(originalFileId: string, splitFiles: Array<string>, newBlobKeys: Array<ExternalBlob>): Promise<void>;
    renameFile(fileId: string, newName: string): Promise<void>;
    revokePremiumStatus(userId: Principal): Promise<void>;
    saveCallerUserProfile(profile: PremiumUserProfile): Promise<void>;
    saveReadingProgress(fileId: string, lastPageRead: bigint): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    toggleFavorite(fileId: string): Promise<boolean>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCallerUserProfile(profile: PremiumUserProfile): Promise<void>;
    updateFileMetaData(fileId: string, metadata: PdfFileMetaData): Promise<void>;
}
