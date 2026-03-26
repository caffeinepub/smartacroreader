import Time "mo:core/Time";
import Int "mo:core/Int";
import Array "mo:core/Array";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import OutCall "http-outcalls/outcall";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Stripe "stripe/stripe";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  // Authorization system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  /// PDF file metadata on the platform.
  type PdfFileMetaData = {
    filename : Text;
    size : Nat;
    uploadedAt : Time.Time;
    blobKey : Storage.ExternalBlob;
    pageCount : Nat;
    isFavorite : Bool;
  };

  /// PDF annotation.
  type PdfAnnotation = {
    pageNumber : Nat;
    annotationType : Text;
    content : Text;
    xPosition : Nat;
    yPosition : Nat;
    color : Text;
  };

  /// Log of PDF reader feature usage.
  type FeatureUsageLog = {
    featureName : Text;
    timestamp : Time.Time;
  };

  /// PDF reader premium user profile with associated subscription.
  type PremiumUserProfile = {
    username : Text;
    isPremium : Bool;
    stripeCustomerId : Text;
    premiumExpiresAt : ?Time.Time;
  };

  /// File operation, such as renaming, toggling favorite status, splitting, merging, or deleting.
  type FileOperation = {
    fileId : Text;
    operationType : Text;
    timestamp : Time.Time;
    newName : ?Text;
    newBlobKey : ?Storage.ExternalBlob;
  };

  module PremiumUserProfile {
    public func compare(a : PremiumUserProfile, b : PremiumUserProfile) : Order.Order {
      Text.compare(a.username, b.username);
    };
  };

  /// PDF annotation by page number comparison.
  module PdfAnnotation {
    public func compareByPageNumber(a : PdfAnnotation, b : PdfAnnotation) : Order.Order {
      Nat.compare(a.pageNumber, b.pageNumber);
    };
  };

  type PdfComment = {
    fileId : Text;
    pageNumber : Nat;
    comment : Text;
    createdAt : Time.Time;
  };

  type PdfTextHighlight = {
    fileId : Text;
    pageNumber : Nat;
    highlightedText : Text;
    color : Text;
    createdAt : Time.Time;
  };

  type PrintJob = {
    fileId : Text;
    pageRange : [Nat];
    printOptions : Text;
    createdAt : Time.Time;
  };

  type CollaborationSession = {
    fileId : Text;
    participants : [Principal];
    createdAt : Time.Time;
  };

  type Bookmark = {
    fileId : Text;
    pageNumber : Nat;
    title : Text;
    createdAt : Time.Time;
  };

  type ReadingProgress = {
    fileId : Text;
    lastPageRead : Nat;
    createdAt : Time.Time;
  };

  /// File operation by timestamp comparison.
  module FileOperation {
    public func compareByTimestamp(a : FileOperation, b : FileOperation) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  module PdfFileMetaData {
    public func compare(a : PdfFileMetaData, b : PdfFileMetaData) : Order.Order {
      Text.compare(a.filename, b.filename);
    };

    public func compareByUploadTime(a : PdfFileMetaData, b : PdfFileMetaData) : Order.Order {
      Int.compare(a.uploadedAt, b.uploadedAt);
    };
  };

  // Persistent data stores
  let fileMetadataStore = Map.empty<Principal, Map.Map<Text, PdfFileMetaData>>();
  let annotationStore = Map.empty<Principal, Map.Map<Text, List.List<PdfAnnotation>>>();
  let userProfileStore = Map.empty<Principal, PremiumUserProfile>();
  let featureUsageLogStore = Map.empty<Principal, List.List<FeatureUsageLog>>();
  let fileOperationStore = Map.empty<Principal, List.List<FileOperation>>();
  let bookmarkStore = Map.empty<Principal, List.List<Bookmark>>();
  let commentsStore = Map.empty<Text, List.List<PdfComment>>();
  let highlightsStore = Map.empty<Text, List.List<PdfTextHighlight>>();
  let printJobStore = Map.empty<Principal, List.List<PrintJob>>();
  let collaborationStore = Map.empty<Text, CollaborationSession>();
  let readingProgressStore = Map.empty<Principal, List.List<ReadingProgress>>();

  // Payment
  var paymentConfiguration : ?Stripe.StripeConfiguration = null;

  // Payment
  public query func isStripeConfigured() : async Bool {
    paymentConfiguration != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    paymentConfiguration := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (paymentConfiguration) {
      case (null) { Runtime.trap("Configuration needs to be first set") };
      case (?config) { config };
    };
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  // User profile management
  public shared ({ caller }) func saveCallerUserProfile(profile : PremiumUserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let existingProfile = userProfileStore.get(caller);
    if (existingProfile != null) {
      Runtime.trap("User is already registered. Cannot create new profile. Use update");
    };
    userProfileStore.add(caller, profile);
  };

  public shared ({ caller }) func updateCallerUserProfile(profile : PremiumUserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profiles");
    };
    let existingProfile = userProfileStore.get(caller);
    switch (existingProfile) {
      case (null) { Runtime.trap("User not found") };
      case (_) { userProfileStore.add(caller, profile) };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?PremiumUserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfileStore.get(caller);
  };

  public query ({ caller }) func getUserProfile(userId : Principal) : async ?PremiumUserProfile {
    if (caller != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfileStore.get(userId);
  };

  public query ({ caller }) func getUserProfiles() : async [PremiumUserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all profiles");
    };
    userProfileStore.values().toArray().sort();
  };

  public query ({ caller }) func getPremiumSubscribers() : async [PremiumUserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view premium subscribers");
    };
    userProfileStore.values().toArray().filter(func(profile) { profile.isPremium });
  };

  public shared ({ caller }) func assignPremiumStatus(userId : Principal, expiresAt : Time.Time) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can assign premium status");
    };
    switch (userProfileStore.get(userId)) {
      case (?profile) {
        let updatedProfile = {
          profile with
          isPremium = true;
          premiumExpiresAt = ?expiresAt;
        };
        userProfileStore.add(userId, updatedProfile);
      };
      case (null) { Runtime.trap("User profile not found") };
    };
  };

  public shared ({ caller }) func revokePremiumStatus(userId : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can revoke premium status");
    };
    switch (userProfileStore.get(userId)) {
      case (?profile) {
        let updatedProfile = {
          profile with
          isPremium = false;
          premiumExpiresAt = null;
        };
        userProfileStore.add(userId, updatedProfile);
      };
      case (null) { Runtime.trap("User profile not found") };
    };
  };

  // File metadata management
  public shared ({ caller }) func addFileMetaData(fileId : Text, metadata : PdfFileMetaData) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add file metadata");
    };
    let userFiles = switch (fileMetadataStore.get(caller)) {
      case (?files) { files };
      case (null) { Map.empty<Text, PdfFileMetaData>() };
    };
    userFiles.add(fileId, metadata);
    fileMetadataStore.add(caller, userFiles);
  };

  public query ({ caller }) func getFileMetaData(userId : Principal, fileId : Text) : async ?PdfFileMetaData {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own files");
    };
    switch (fileMetadataStore.get(userId)) {
      case (null) { null };
      case (?files) { files.get(fileId) };
    };
  };

  public query ({ caller }) func getAllFileMetaData() : async [PdfFileMetaData] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all file metadata");
    };
    let allFiles = List.empty<PdfFileMetaData>();
    for ((_, files) in fileMetadataStore.entries()) {
      for ((_, file) in files.entries()) {
        allFiles.add(file);
      };
    };
    allFiles.toArray();
  };

  public query ({ caller }) func getCallerFileMetaData() : async [PdfFileMetaData] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view file metadata");
    };
    switch (fileMetadataStore.get(caller)) {
      case (null) { [] };
      case (?files) { files.values().toArray().sort() };
    };
  };

  public shared ({ caller }) func updateFileMetaData(fileId : Text, metadata : PdfFileMetaData) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update file metadata");
    };
    // Verify ownership
    switch (fileMetadataStore.get(caller)) {
      case (null) { Runtime.trap("File not found") };
      case (?files) {
        switch (files.get(fileId)) {
          case (null) { Runtime.trap("File not found") };
          case (?_) {
            files.add(fileId, metadata);
            fileMetadataStore.add(caller, files);
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteFileMetaData(userId : Principal, fileId : Text) : async () {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only delete your own files");
    };
    switch (fileMetadataStore.get(userId)) {
      case (null) { () };
      case (?files) {
        files.remove(fileId);
        fileMetadataStore.add(userId, files);
      };
    };
  };

  // Annotation management
  public shared ({ caller }) func addAnnotation(fileId : Text, annotation : PdfAnnotation) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add annotations");
    };
    // Verify file ownership
    switch (fileMetadataStore.get(caller)) {
      case (null) { Runtime.trap("File not found") };
      case (?files) {
        switch (files.get(fileId)) {
          case (null) { Runtime.trap("File not found") };
          case (?_) {
            let fileAnnotations = switch (annotationStore.get(caller)) {
              case (?annotations) { annotations };
              case (null) { Map.empty<Text, List.List<PdfAnnotation>>() };
            };

            let annotationsList = switch (fileAnnotations.get(fileId)) {
              case (?list) { list };
              case (null) { List.empty<PdfAnnotation>() };
            };

            annotationsList.add(annotation);
            fileAnnotations.add(fileId, annotationsList);
            annotationStore.add(caller, fileAnnotations);
          };
        };
      };
    };
  };

  public query ({ caller }) func getAnnotationsByFileId(userId : Principal, fileId : Text) : async [PdfAnnotation] {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own annotations");
    };
    switch (annotationStore.get(userId)) {
      case (null) { [] };
      case (?fileAnnotations) {
        switch (fileAnnotations.get(fileId)) {
          case (null) { [] };
          case (?annotations) { annotations.toArray().sort(PdfAnnotation.compareByPageNumber) };
        };
      };
    };
  };

  public shared ({ caller }) func deleteAnnotationsForFile(userId : Principal, fileId : Text) : async () {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only delete your own annotations");
    };
    switch (annotationStore.get(userId)) {
      case (null) { () };
      case (?fileAnnotations) {
        fileAnnotations.remove(fileId);
        annotationStore.add(userId, fileAnnotations);
      };
    };
  };

  // Feature usage logging
  public shared ({ caller }) func logFeatureUsage(featureName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can log feature usage");
    };
    let usageLog = switch (featureUsageLogStore.get(caller)) {
      case (?log) { log };
      case (null) { List.empty<FeatureUsageLog>() };
    };
    let newLogEntry : FeatureUsageLog = {
      featureName;
      timestamp = Time.now();
    };
    usageLog.add(newLogEntry);
    featureUsageLogStore.add(caller, usageLog);
  };

  public query ({ caller }) func getFeatureUsageLogs(userId : Principal) : async [FeatureUsageLog] {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own feature usage logs");
    };
    switch (featureUsageLogStore.get(userId)) {
      case (null) { [] };
      case (?logs) { logs.toArray() };
    };
  };

  // File operation tracking
  public shared ({ caller }) func recordFileOperation(fileId : Text, operationType : Text, newName : ?Text, newBlobKey : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record file operations");
    };
    let operations = switch (fileOperationStore.get(caller)) {
      case (?ops) { ops };
      case (null) { List.empty<FileOperation>() };
    };
    let newOperation : FileOperation = {
      fileId;
      operationType;
      timestamp = Time.now();
      newName;
      newBlobKey;
    };
    operations.add(newOperation);
    fileOperationStore.add(caller, operations);
  };

  public query ({ caller }) func getFileOperationsInRange(userId : Principal, startTime : Time.Time, endTime : Time.Time) : async [FileOperation] {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own file operations");
    };
    switch (fileOperationStore.get(userId)) {
      case (null) { [] };
      case (?ops) {
        ops.toArray().filter(
          func(op) {
            op.timestamp >= startTime and op.timestamp <= endTime;
          }
        ).sort(FileOperation.compareByTimestamp);
      };
    };
  };

  // File management functions
  public shared ({ caller }) func renameFile(fileId : Text, newName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can rename files");
    };
    switch (fileMetadataStore.get(caller)) {
      case (null) { Runtime.trap("File not found") };
      case (?userFiles) {
        switch (userFiles.get(fileId)) {
          case (null) { Runtime.trap("File not found") };
          case (?file) {
            let updatedFile = {
              file with
              filename = newName;
            };
            userFiles.add(fileId, updatedFile);
            fileMetadataStore.add(caller, userFiles);

            await recordFileOperation(fileId, "rename", ?newName, null);
          };
        };
      };
    };
  };

  public shared ({ caller }) func toggleFavorite(fileId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle favorite status");
    };
    switch (fileMetadataStore.get(caller)) {
      case (null) {
        Runtime.trap("File not found");
      };
      case (?userFiles) {
        switch (userFiles.get(fileId)) {
          case (null) { Runtime.trap("File not found") };
          case (?file) {
            let updatedFile = {
              file with
              isFavorite = not file.isFavorite;
            };
            userFiles.add(fileId, updatedFile);
            fileMetadataStore.add(caller, userFiles);

            await recordFileOperation(fileId, "toggle_favorite", null, null);
            updatedFile.isFavorite;
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteFile(fileId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete files");
    };
    await deleteFileMetaData(caller, fileId);
    await deleteAnnotationsForFile(caller, fileId);
    await recordFileOperation(fileId, "delete", null, null);
  };

  public shared ({ caller }) func recordMergeOperation(newFileId : Text, mergedFiles : [Text], newBlobKey : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record merge operations");
    };
    // Verify ownership of all files being merged
    switch (fileMetadataStore.get(caller)) {
      case (null) { Runtime.trap("No files found") };
      case (?userFiles) {
        for (fileId in mergedFiles.values()) {
          switch (userFiles.get(fileId)) {
            case (null) { Runtime.trap("File not found: " # fileId) };
            case (?_) { };
          };
        };
      };
    };

    await recordFileOperation(newFileId, "merge", null, ?newBlobKey);
    for (fileId in mergedFiles.values()) {
      await deleteFileMetaData(caller, fileId);
      await deleteAnnotationsForFile(caller, fileId);
      await recordFileOperation(fileId, "merged_into", null, ?newBlobKey);
    };
  };

  public shared ({ caller }) func recordSplitOperation(originalFileId : Text, splitFiles : [Text], newBlobKeys : [Storage.ExternalBlob]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record split operations");
    };
    // Verify ownership of original file
    switch (fileMetadataStore.get(caller)) {
      case (null) { Runtime.trap("File not found") };
      case (?userFiles) {
        switch (userFiles.get(originalFileId)) {
          case (null) { Runtime.trap("File not found") };
          case (?_) { };
        };
      };
    };

    await recordFileOperation(originalFileId, "split", null, null);
    for (i in Nat.range(0, splitFiles.size())) {
      if (i < newBlobKeys.size()) {
        await recordFileOperation(splitFiles[i], "split_from", null, ?newBlobKeys[i]);
      };
    };
  };

  // Bookmarks management
  public shared ({ caller }) func addBookmark(fileId : Text, pageNumber : Nat, title : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add bookmarks");
    };
    // Verify file ownership
    switch (fileMetadataStore.get(caller)) {
      case (null) { Runtime.trap("File not found") };
      case (?files) {
        switch (files.get(fileId)) {
          case (null) { Runtime.trap("File not found") };
          case (?_) {
            let userBookmarks = switch (bookmarkStore.get(caller)) {
              case (?bookmarks) { bookmarks };
              case (null) { List.empty<Bookmark>() };
            };
            let newBookmark : Bookmark = {
              fileId;
              pageNumber;
              title;
              createdAt = Time.now();
            };
            userBookmarks.add(newBookmark);
            bookmarkStore.add(caller, userBookmarks);
          };
        };
      };
    };
  };

  public query ({ caller }) func getBookmarks(userId : Principal) : async [Bookmark] {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own bookmarks");
    };
    switch (bookmarkStore.get(userId)) {
      case (null) { [] };
      case (?bookmarks) { bookmarks.toArray() };
    };
  };

  // pdf sync
  public shared ({ caller }) func saveReadingProgress(fileId : Text, lastPageRead : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save reading progress");
    };
    // Verify file ownership
    switch (fileMetadataStore.get(caller)) {
      case (null) { Runtime.trap("File not found") };
      case (?files) {
        switch (files.get(fileId)) {
          case (null) { Runtime.trap("File not found") };
          case (?_) {
            let progress = switch (readingProgressStore.get(caller)) {
              case (?progress) { progress };
              case (null) { List.empty<ReadingProgress>() };
            };
            let newProgress : ReadingProgress = {
              fileId;
              lastPageRead;
              createdAt = Time.now();
            };
            progress.add(newProgress);
            readingProgressStore.add(caller, progress);
          };
        };
      };
    };
  };

  public query ({ caller }) func getReadingProgress(userId : Principal) : async [ReadingProgress] {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own reading progress");
    };
    switch (readingProgressStore.get(userId)) {
      case (null) { [] };
      case (?progress) { progress.toArray() };
    };
  };

  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
