#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HabitTrackerWatchConnectivity, RCTEventEmitter)
RCT_EXTERN_METHOD(publishSnapshot:(NSDictionary *)snapshot resolve:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(consumePendingActions:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
