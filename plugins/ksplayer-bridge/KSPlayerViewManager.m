#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>

@interface RCT_EXTERN_MODULE(KSPlayerViewManager, RCTViewManager)

// Props
RCT_EXPORT_VIEW_PROPERTY(url, NSString)
RCT_EXPORT_VIEW_PROPERTY(headers, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(paused, BOOL)
RCT_EXPORT_VIEW_PROPERTY(muted, BOOL)
RCT_EXPORT_VIEW_PROPERTY(rate, float)
RCT_EXPORT_VIEW_PROPERTY(resizeMode, NSString)

// Event callbacks
RCT_EXPORT_VIEW_PROPERTY(onLoad, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onProgress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onEnd, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onBuffer, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onReadyForDisplay, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAudioTracks, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTextTracks, RCTDirectEventBlock)

// Commands
RCT_EXTERN_METHOD(play:(nonnull NSNumber *)node)
RCT_EXTERN_METHOD(pause:(nonnull NSNumber *)node)
RCT_EXTERN_METHOD(seekTo:(nonnull NSNumber *)node time:(nonnull NSNumber *)time)
RCT_EXTERN_METHOD(selectAudioTrack:(nonnull NSNumber *)node trackId:(nonnull NSNumber *)trackId)
RCT_EXTERN_METHOD(selectTextTrack:(nonnull NSNumber *)node trackId:(nonnull NSNumber *)trackId)
RCT_EXTERN_METHOD(disableTextTrack:(nonnull NSNumber *)node)
RCT_EXTERN_METHOD(enterFullscreen:(nonnull NSNumber *)node)
RCT_EXTERN_METHOD(exitFullscreen:(nonnull NSNumber *)node)

@end
